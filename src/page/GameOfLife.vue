<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// Canvas configuration
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;

// Simulation state
const cellSize = 10;
const isRunning = ref(false);
const speed = ref(10); // Updates per second
const generation = ref(0);
const population = ref(0);

let rows = 0;
let cols = 0;
let grid: Int8Array;
let nextGrid: Int8Array;
let animationId: number | null = null;
let lastUpdateTime = 0;

const initGrid = () => {
    if (!containerRef.value || !canvasRef.value) return;

    const width = containerRef.value.clientWidth;
    const height = containerRef.value.clientHeight;

    canvasRef.value.width = width;
    canvasRef.value.height = height;

    cols = Math.floor(width / cellSize);
    rows = Math.floor(height / cellSize);

    grid = new Int8Array(rows * cols);
    nextGrid = new Int8Array(rows * cols);

    generation.value = 0;
    updatePopulation();
    draw();
};

const updatePopulation = () => {
    let count = 0;
    for (let i = 0; i < grid.length; i++) {
        if (grid[i]) count++;
    }
    population.value = count;
};

const getIndex = (r: number, c: number) => {
    // Wrap around
    const row = (r + rows) % rows;
    const col = (c + cols) % cols;
    return row * cols + col;
};

const step = () => {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let neighbors = 0;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    if (grid[getIndex(r + i, c + j)]) neighbors++;
                }
            }

            const idx = r * cols + c;
            if (grid[idx]) {
                nextGrid[idx] = neighbors === 2 || neighbors === 3 ? 1 : 0;
            } else {
                nextGrid[idx] = neighbors === 3 ? 1 : 0;
            }
        }
    }

    grid.set(nextGrid);
    generation.value++;
    updatePopulation();
    draw();
};

const draw = () => {
    if (!ctx || !canvasRef.value) return;

    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);

    // Draw grid lines (subtle)
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
        ctx.moveTo(0, r * cellSize);
        ctx.lineTo(cols * cellSize, r * cellSize);
    }
    for (let c = 0; c <= cols; c++) {
        ctx.moveTo(c * cellSize, 0);
        ctx.lineTo(c * cellSize, rows * cellSize);
    }
    ctx.stroke();

    // Draw cells
    ctx.fillStyle = "#3b82f6"; // Blue-500
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r * cols + c]) {
                ctx.fillRect(
                    c * cellSize + 1,
                    r * cellSize + 1,
                    cellSize - 2,
                    cellSize - 2,
                );
            }
        }
    }
};

const toggleCell = (e: MouseEvent | TouchEvent) => {
    if (!canvasRef.value) return;

    const rect = canvasRef.value.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY : e.clientY;

    const x = clientX ?? 0 - rect.left;
    const y = clientY ?? 0 - rect.top;

    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);

    if (r >= 0 && r < rows && c >= 0 && c < cols) {
        const idx = r * cols + c;
        grid[idx] = grid[idx] ? 0 : 1;
        updatePopulation();
        draw();
    }
};

const randomize = () => {
    for (let i = 0; i < grid.length; i++) {
        grid[i] = Math.random() > 0.85 ? 1 : 0;
    }
    generation.value = 0;
    updatePopulation();
    draw();
};

const clear = () => {
    grid.fill(0);
    generation.value = 0;
    updatePopulation();
    draw();
    if (isRunning.value) togglePlay();
};

const togglePlay = () => {
    isRunning.value = !isRunning.value;
    if (isRunning.value) {
        lastUpdateTime = performance.now();
        animate();
    } else if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
};

const animate = (time: number = performance.now()) => {
    if (!isRunning.value) return;

    const interval = 1000 / speed.value;
    if (time - lastUpdateTime >= interval) {
        step();
        lastUpdateTime = time;
    }

    animationId = requestAnimationFrame(animate);
};

onMounted(() => {
    ctx = canvasRef.value?.getContext("2d") || null;
    initGrid();
    window.addEventListener("resize", initGrid);
});

onUnmounted(() => {
    window.removeEventListener("resize", initGrid);
    if (animationId) cancelAnimationFrame(animationId);
});
</script>

<template>
    <div class="gol-container">
        <div class="header">
            <div class="left">
                <button
                    class="back-btn"
                    @click="router.push('/game-collection')"
                >
                    ← HOME
                </button>
                <h1 class="title">Game of Life</h1>
            </div>

            <div class="stats">
                <span>Gen: {{ generation }}</span>
                <span>Pop: {{ population }}</span>
            </div>

            <div class="controls">
                <button
                    class="control-btn play"
                    @click="togglePlay"
                    :class="{ 'is-running': isRunning }"
                >
                    {{ isRunning ? "⏸ Pause" : "▶ Play" }}
                </button>
                <button
                    class="control-btn step"
                    @click="step"
                    :disabled="isRunning"
                >
                    ⏭ Step
                </button>
                <button class="control-btn" @click="randomize">
                    🎲 Random
                </button>
                <button class="control-btn" @click="clear">🗑️ Clear</button>

                <div class="speed-control">
                    <label>Speed</label>
                    <input
                        type="range"
                        v-model.number="speed"
                        min="1"
                        max="60"
                    />
                </div>
            </div>
        </div>

        <div class="simulation-area" ref="containerRef">
            <canvas
                ref="canvasRef"
                @mousedown="toggleCell"
                @touchstart.prevent="toggleCell"
            ></canvas>
        </div>

        <div class="footer-hint">
            Draw on the grid to create life. Let it evolve!
        </div>
    </div>
</template>

<style scoped lang="scss">
.gol-container {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    background-color: #f8fafc;
    overflow: hidden;
}

.header {
    padding: 1rem 2rem;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;
    flex-wrap: wrap;
    gap: 1rem;
}

.left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.back-btn {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #64748b;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
    &:hover {
        background: #f1f5f9;
        color: #334155;
    }
}

.title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
}

.stats {
    display: flex;
    gap: 1.5rem;
    font-family: "Courier New", Courier, monospace;
    font-weight: bold;
    color: #475569;
    font-size: 1.1rem;
}

.controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.control-btn {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: none;
    background: #f1f5f9;
    color: #475569;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background: #e2e8f0;
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    &.play {
        background: #3b82f6;
        color: white;
        min-width: 100px;
        &:hover {
            background: #2563eb;
        }
        &.is-running {
            background: #ef4444;
            &:hover {
                background: #dc2626;
            }
        }
    }
}

.speed-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 0.5rem;
    label {
        font-size: 0.8rem;
        color: #64748b;
        font-weight: 600;
    }
    input {
        width: 80px;
    }
}

.simulation-area {
    flex: 1;
    position: relative;
    overflow: hidden;
    cursor: crosshair;
}

canvas {
    display: block;
}

.footer-hint {
    padding: 0.5rem;
    text-align: center;
    font-size: 0.85rem;
    color: #94a3b8;
    background: white;
    border-top: 1px solid #f1f5f9;
}

@media (max-width: 768px) {
    .header {
        padding: 0.75rem 1rem;
        flex-direction: column;
        align-items: stretch;
    }
    .left {
        justify-content: space-between;
    }
    .controls {
        justify-content: center;
    }
}
</style>
