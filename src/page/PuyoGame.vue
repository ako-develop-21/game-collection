<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { usePuyoPuyo } from "../composables/usePuyoPuyo";
import PuyoBoard from "../components/puyo/PuyoBoard.vue";
import PuyoCell from "../components/puyo/PuyoCell.vue";

const router = useRouter();
const {
    grid,
    currentPair,
    nextPair,
    score,
    combo,
    isGameOver,
    isPaused,
    move,
    rotate,
    drop,
    initGame,
    togglePause,
} = usePuyoPuyo();

const handleKeydown = (e: KeyboardEvent) => {
    if (isGameOver.value) return;

    if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        togglePause();
        return;
    }

    if (isPaused.value) return;

    switch (e.key) {
        case "ArrowLeft":
            move(-1);
            break;
        case "ArrowRight":
            move(1);
            break;
        case "ArrowDown":
            drop();
            break;
        case "z":
        case "Z":
        case "ArrowUp":
            rotate(-1);
            break;
        case "x":
        case "X":
            rotate(1);
            break;
    }
};

onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
    <div class="puyo-game-page">
        <div class="header">
            <button class="back-btn" @click="router.push('/game-collection')">
                ← BACK
            </button>
            <h1 class="title">PUYO PUYO</h1>
            <div class="score-container">
                <div class="label">SCORE</div>
                <div class="value">{{ score }}</div>
            </div>
        </div>

        <div class="game-container">
            <div class="side-panel left">
                <div class="info-box">
                    <h3>CONTROLS</h3>
                    <p>← → : Move</p>
                    <p>↓ : Drop</p>
                    <p>Z / ↑ : Rotate L</p>
                    <p>X : Rotate R</p>
                    <p>P : Pause</p>
                </div>
            </div>

            <div class="board-wrapper">
                <PuyoBoard :grid="grid" :currentPair="currentPair" />

                <div v-if="isGameOver" class="overlay game-over">
                    <h2>GAME OVER</h2>
                    <p>Final Score: {{ score }}</p>
                    <button class="primary-btn" @click="initGame">RETRY</button>
                </div>

                <div v-if="isPaused && !isGameOver" class="overlay pause">
                    <h2>PAUSED</h2>
                    <button class="primary-btn" @click="togglePause">
                        RESUME
                    </button>
                </div>
            </div>

            <div class="side-panel right">
                <div class="next-box">
                    <h3>NEXT</h3>
                    <div v-if="nextPair" class="next-puyos">
                        <PuyoCell :color="nextPair.puyo2.color" />
                        <PuyoCell :color="nextPair.puyo1.color" />
                    </div>
                </div>

                <div class="combo-display" v-if="combo > 1">
                    <div class="combo-text">{{ combo }} CHAIN!</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.puyo-game-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    font-family: "Outfit", sans-serif;
}

.header {
    width: 100%;
    max-width: 800px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.back-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }
}

.title {
    font-size: 2.5rem;
    margin: 0;
    background: linear-gradient(to right, #ff4d4d, #4d79ff, #4dff4d, #ffd700);
    // -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 900;
    letter-spacing: 4px;
}

.score-container {
    text-align: right;
    .label {
        font-size: 0.8rem;
        color: #aaa;
    }
    .value {
        font-size: 2rem;
        font-weight: 700;
        color: #ffd700;
    }
}

.game-container {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
}

.side-panel {
    width: 150px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.info-box,
.next-box {
    background: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    h3 {
        margin-top: 0;
        font-size: 0.9rem;
        color: #aaa;
        text-align: center;
    }
    p {
        margin: 0.5rem 0;
        font-size: 0.8rem;
    }
}

.next-puyos {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    height: 80px;
    width: 40px;
    margin: 0 auto;
}

.board-wrapper {
    position: relative;
}

.overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    z-index: 100;
    h2 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        color: #ff4d4d;
    }
    &.pause h2 {
        color: #4d79ff;
    }
}

.primary-btn {
    background: #4d79ff;
    color: white;
    border: none;
    padding: 0.8rem 2rem;
    border-radius: 4px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s;
    &:hover {
        transform: scale(1.05);
    }
}

.combo-display {
    margin-top: 2rem;
    text-align: center;
    animation: bounce 0.5s ease;
}

.combo-text {
    font-size: 1.5rem;
    font-weight: 900;
    color: #ff4d4d;
    text-shadow: 0 0 10px rgba(255, 77, 77, 0.5);
}

@keyframes bounce {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.2);
    }
}
</style>
