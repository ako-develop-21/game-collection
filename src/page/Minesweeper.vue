<template>
    <div class="game-page">
        <header class="header">
            <button class="icon-btn" @click="goHome" title="Back to Home">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            </button>

            <div class="status-container">
                <h2 :class="['status-text', statusColor]">
                    {{ statusMessage }}
                </h2>
                <div class="diff-selector">
                    <button
                        v-for="diff in difficultyOptions"
                        :key="diff"
                        class="diff-btn"
                        :class="{ active: currentDifficulty === diff }"
                        @click="setDifficulty(diff)"
                    >
                        {{ diff }}
                    </button>
                </div>
            </div>

            <button class="icon-btn" @click="resetGame" title="Restart Game">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                    />
                    <path d="M3 3v5h5" />
                </svg>
            </button>
        </header>

        <div class="info-bar">
            <div class="info-item">
                <span class="label">TIME</span>
                <span class="value">{{ formatTime(timer) }}</span>
            </div>
            <div class="info-item">
                <span class="label">BEST</span>
                <span class="value">{{ bestScoreText }}</span>
            </div>
        </div>

        <main class="game-board-wrapper">
            <Board
                :board="board"
                :width="config.width"
                :height="config.height"
                @open="openCell"
                @flag="toggleFlag"
            />
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import Board from "../components/minesweeper/Board.vue";
import { useMinesweeper, type Difficulty } from "../composables/useMinesweeper";

const router = useRouter();
const {
    board,
    config,
    gameState,
    timer,
    bestScores,
    currentDifficulty,
    openCell,
    toggleFlag,
    resetGame,
    setDifficulty,
} = useMinesweeper();

const statusMessage = computed(() => {
    if (gameState.value === "won") return "Congratulations!";
    if (gameState.value === "lost") return "Game Over";
    return "Minesweeper";
});

const statusColor = computed(() => {
    if (gameState.value === "won") return "text-emerald-600";
    if (gameState.value === "lost") return "text-rose-600";
    return "text-slate-700";
});

const formatTime = (seconds: number) => {
    return seconds.toString().padStart(3, "0");
};

const bestScoreText = computed(() => {
    const score = bestScores.value[currentDifficulty.value];
    return score !== null ? formatTime(score) : "---";
});

const difficultyOptions: Difficulty[] = ["Easy", "Normal", "Hard"];

const goHome = () => {
    router.push("/game-collection");
};
</script>

<style scoped lang="scss">
.game-page {
    min-height: 100vh;
    width: 100vw;
    background-color: #f8fafc;
    color: #334155;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: "Inter", sans-serif;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 600px;
    padding: 2rem;
    margin-bottom: 0;
}

.status-container {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.status-text {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 300;
    letter-spacing: 0.1rem;
}

.diff-selector {
    display: flex;
    justify-content: center;
    gap: 0.25rem;
    background-color: #e2e8f0;
    padding: 0.25rem;
    border-radius: 99px;
    margin-top: 0.5rem;
}

.diff-btn {
    border: none;
    background: transparent;
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: #64748b;
    border-radius: 99px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.diff-btn:hover {
    color: #334155;
}

.diff-btn.active {
    background-color: #fff;
    color: #0f172a;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    font-weight: 600;
}

.info-bar {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
    padding: 0.75rem 2rem;
    background-color: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.info-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.05rem;
    margin-bottom: 0.1rem;
}

.value {
    font-family: "Courier New", monospace;
    font-size: 1.5rem;
    font-weight: 700;
    color: #334155;
}

.icon-btn {
    background: white;
    border: 1px solid #e2e8f0;
    color: #64748b;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.icon-btn:hover {
    transform: translateY(-2px);
    color: #334155;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e1;
}

.icon-btn:active {
    transform: translateY(0);
}

.game-board-wrapper {
    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.text-emerald-600 {
    color: #059669;
}
.text-rose-600 {
    color: #e11d48;
}
.text-slate-700 {
    color: #334155;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
