<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useSudoku, type SudokuDifficulty } from "../composables/useSudoku";
import SudokuBoard from "../components/sudoku/SudokuBoard.vue";

const router = useRouter();
const {
    grid,
    selectedCell,
    isNoteMode,
    gameWon,
    formattedTime,
    initGame,
    setCellValue,
} = useSudoku();

const showSetup = ref(true);

const startGame = (diff: SudokuDifficulty) => {
    initGame(diff);
    showSetup.value = false;
};

const handleSelect = (row: number, col: number) => {
    selectedCell.value = { row, col };
};

const handleInput = (num: number | null) => {
    if (selectedCell.value) {
        const { row, col } = selectedCell.value;
        setCellValue(row, col, num);
    }
};

const handleKeyDown = (e: KeyboardEvent) => {
    if (showSetup.value || gameWon.value) return;

    if (e.key >= "1" && e.key <= "9") {
        handleInput(parseInt(e.key));
    } else if (e.key === "Backspace" || e.key === "Delete") {
        handleInput(null);
    } else if (e.key === "n") {
        isNoteMode.value = !isNoteMode.value;
    } else if (e.key.startsWith("Arrow") && selectedCell.value) {
        const { row, col } = selectedCell.value;
        if (e.key === "ArrowUp") selectedCell.value.row = Math.max(0, row - 1);
        if (e.key === "ArrowDown")
            selectedCell.value.row = Math.min(8, row + 1);
        if (e.key === "ArrowLeft")
            selectedCell.value.col = Math.max(0, col - 1);
        if (e.key === "ArrowRight")
            selectedCell.value.col = Math.min(8, col + 1);
    }
};

onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
    <div class="sudoku-game-page">
        <div class="page-container">
            <!-- Setup Overlay -->
            <div v-if="showSetup" class="setup-overlay">
                <div class="setup-card">
                    <h1 class="setup-title">SUDOKU</h1>
                    <p class="setup-subtitle">Choose your challenge</p>
                    <div class="difficulty-options">
                        <button
                            class="diff-btn easy"
                            @click="startGame('easy')"
                        >
                            <span class="btn-main">EASY</span>
                            <span class="btn-sub">Perfect for beginners</span>
                        </button>
                        <button
                            class="diff-btn medium highlight"
                            @click="startGame('medium')"
                        >
                            <span class="btn-main">MEDIUM</span>
                            <span class="btn-sub">Classic experience</span>
                        </button>
                        <button
                            class="diff-btn hard"
                            @click="startGame('hard')"
                        >
                            <span class="btn-main">HARD</span>
                            <span class="btn-sub">Master level puzzle</span>
                        </button>
                    </div>
                    <button class="back-btn-large" @click="router.push('/')">
                        BACK TO HOME
                    </button>
                </div>
            </div>

            <!-- Victory Overlay -->
            <div v-if="gameWon" class="setup-overlay victory">
                <div class="setup-card">
                    <h1 class="setup-title">VICTORY!</h1>
                    <p class="setup-subtitle">
                        You solved the puzzle in {{ formattedTime }}
                    </p>
                    <div class="difficulty-options">
                        <button
                            class="diff-btn highlight"
                            @click="showSetup = true"
                        >
                            <span class="btn-main">PLAY AGAIN</span>
                            <span class="btn-sub">New challenge</span>
                        </button>
                        <button class="diff-btn" @click="router.push('/')">
                            <span class="btn-main">HOME</span>
                            <span class="btn-sub">Back to dashboard</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="game-content" v-if="!showSetup">
                <div class="header">
                    <div class="header-left">
                        <button class="back-link" @click="router.push('/')">
                            ← BACK
                        </button>
                        <div class="timer">⏱️ {{ formattedTime }}</div>
                    </div>
                    <div class="header-right">
                        <button class="reset-btn" @click="showSetup = true">
                            🔄 NEW GAME
                        </button>
                    </div>
                </div>

                <div class="main-layout">
                    <div class="board-container">
                        <SudokuBoard
                            :grid="grid"
                            :selected-cell="selectedCell"
                            @select="handleSelect"
                        />
                    </div>

                    <div class="controls-container">
                        <div class="top-controls">
                            <button
                                class="control-btn note-toggle"
                                :class="{ active: isNoteMode }"
                                @click="isNoteMode = !isNoteMode"
                            >
                                <span class="icon">✏️</span>
                                <span class="label">NOTES (N)</span>
                            </button>
                            <button
                                class="control-btn erase"
                                @click="handleInput(null)"
                            >
                                <span class="icon">🧹</span>
                                <span class="label">ERASE</span>
                            </button>
                        </div>

                        <div class="numpad">
                            <button
                                v-for="n in 9"
                                :key="n"
                                class="num-btn"
                                @click="handleInput(n)"
                            >
                                {{ n }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.sudoku-game-page {
    min-height: 100vh;
    background: #0f172a;
    color: white;
    font-family: "Outfit", sans-serif;
    display: flex;
    justify-content: center;
    padding: 1rem;
}

.page-container {
    width: 100%;
    max-width: 900px;
}

.setup-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

.setup-card {
    background: #1e293b;
    padding: 3rem;
    border-radius: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.setup-title {
    font-size: 3.5rem;
    font-weight: 800;
    background: linear-gradient(to bottom right, #60a5fa, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.5rem;
    letter-spacing: 0.5rem;
}

.setup-subtitle {
    color: #94a3b8;
    margin-bottom: 2.5rem;
    font-size: 1.1rem;
}

.difficulty-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
}

.diff-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1.2rem 2.5rem;
    border-radius: 1rem;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
        border-color: #3b82f6;
    }

    &.highlight {
        background: #3b82f6;
        border-color: #3b82f6;
        &:hover {
            background: #2563eb;
        }
    }

    .btn-main {
        font-weight: 800;
        font-size: 1.2rem;
    }
    .btn-sub {
        font-size: 0.8rem;
        opacity: 0.7;
    }
}

.back-btn-large {
    background: transparent;
    border: none;
    color: #64748b;
    font-weight: 600;
    cursor: pointer;
    &:hover {
        color: white;
    }
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    background: rgba(255, 255, 255, 0.03);
    padding: 1rem 1.5rem;
    border-radius: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 2rem;
}

.back-link {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-weight: 600;
    cursor: pointer;
    &:hover {
        color: white;
    }
}

.timer {
    font-size: 1.2rem;
    font-weight: 700;
    color: #60a5fa;
    font-variant-numeric: tabular-nums;
}

.reset-btn {
    background: rgba(231, 76, 60, 0.1);
    border: 1px solid rgba(231, 76, 60, 0.2);
    color: #e74c3c;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    &:hover {
        background: rgba(231, 76, 60, 0.2);
    }
}

.main-layout {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 2rem;
    align-items: start;
}

.controls-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.top-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
}

.control-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.8rem;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s;

    .icon {
        font-size: 1.5rem;
        margin-bottom: 0.25rem;
    }
    .label {
        font-size: 0.65rem;
        font-weight: 700;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: white;
    }

    &.active {
        background: #4a90e2;
        border-color: #4a90e2;
        color: white;
    }
}

.numpad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
}

.num-btn {
    aspect-ratio: 1 / 1;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1.8rem;
    font-weight: 700;
    border-radius: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
        background: #334155;
        transform: scale(1.05);
        border-color: #4a90e2;
    }

    &:active {
        transform: scale(0.95);
    }
}

@media (max-width: 800px) {
    .main-layout {
        grid-template-columns: 1fr;
    }
    .controls-container {
        max-width: 400px;
        margin: 0 auto;
        width: 100%;
    }
}
</style>
