<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import Board from "../components/freecell/Board.vue";
import {
    useFreecell,
    type Card as CardType,
    type CardLocation,
} from "../composables/useFreecell";

const router = useRouter();
const {
    tableau,
    freeCells,
    foundations,
    selectedCard,
    gameState,
    initGame,
    selectCard,
    moveToFreecell,
    moveToFoundation,
    moveToTableau,
    tryMoveToFoundation,
    undo,
    redo,
    canUndo,
    canRedo,
    handleDrop,
    checkPlayable,
    timer,
    bestScore,
} = useFreecell();

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const goHome = () => {
    router.push("/");
};

const statusMessage = computed(() => {
    if (gameState.value === "won") return "Congratulations!";
    return "Freecell";
});

const statusColor = computed(() => {
    if (gameState.value === "won") return "text-emerald-400";
    return "text-white";
});

// Event Handlers
const onCardClick = (card: CardType, loc: CardLocation) => {
    if (gameState.value === "won") return;
    selectCard(card, loc);
};

const onFreecellClick = (index: number) => {
    if (gameState.value === "won") return;
    moveToFreecell(index);
};

const onFoundationClick = (index: number) => {
    if (gameState.value === "won") return;
    moveToFoundation(index);
};

const onTableauClick = (index: number) => {
    if (gameState.value === "won") return;
    moveToTableau(index);
};

const onDropCard = (cardId: number, target: CardLocation) => {
    if (gameState.value === "won") return;
    handleDrop(cardId, target);
};

const onCardDoubleClick = (card: CardType, location: CardLocation) => {
    if (gameState.value === "won") return;
    tryMoveToFoundation(card, location);
};
</script>

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

            <div class="stats-container">
                <div class="stat-box">
                    <span class="stat-label">TIME</span>
                    <span class="stat-value">{{ formatTime(timer) }}</span>
                </div>
                <div class="stat-box" v-if="bestScore !== null">
                    <span class="stat-label">BEST</span>
                    <span class="stat-value">{{ formatTime(bestScore) }}</span>
                </div>
            </div>

            <div class="status-container">
                <h2 :class="['status-text', statusColor]">
                    {{ statusMessage }}
                </h2>
                <div class="controls-row">
                    <button
                        class="control-btn"
                        :disabled="!canUndo"
                        @click="undo"
                        title="Undo"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M3 7v6h6" />
                            <path
                                d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"
                            />
                        </svg>
                    </button>
                    <button
                        class="control-btn"
                        :disabled="!canRedo"
                        @click="redo"
                        title="Redo"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M21 7v6h-6" />
                            <path
                                d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 3.7"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <button class="icon-btn" @click="initGame" title="Restart Game">
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

        <main class="game-board-wrapper">
            <Board
                :tableau="tableau"
                :free-cells="freeCells"
                :foundations="foundations"
                :selected-card="selectedCard"
                :check-playable="checkPlayable"
                @click-card="onCardClick"
                @click-freecell="onFreecellClick"
                @click-foundation="onFoundationClick"
                @click-empty-tableau="onTableauClick"
                @dblclick-card="onCardDoubleClick"
                @drop-card="onDropCard"
            />
        </main>
    </div>
</template>

<style scoped lang="scss">
.game-page {
    min-height: 100vh;
    width: 100vw;
    background-color: #0f172a; /* Darker Slate for card table feel */
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: "Inter", sans-serif;
    overflow: hidden; /* Prevent scroll if possible, card game fits in screen usually */
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 800px;
    padding: 1rem 2rem;
    margin-bottom: 1rem;
}

.stats-container {
    display: flex;
    gap: 1.5rem;
}

.stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stat-label {
    font-size: 0.75rem;
    color: #94a3b8;
    font-weight: 500;
}

.stat-value {
    font-family: "Outfit", sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    min-width: 60px;
    text-align: center;
}

.status-container {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.status-text {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 300;
    letter-spacing: 0.1rem;
}

.controls-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.5rem;
}

.auto-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #cbd5e1;
    padding: 0.2rem 0.8rem;
    border-radius: 99px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    height: 32px;
    display: flex;
    align-items: center;
}

.control-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #cbd5e1;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.control-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.control-btn:not(:disabled):hover,
.auto-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

.icon-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #cbd5e1;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.icon-btn:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

.game-board-wrapper {
    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    width: 100%;
}

.text-emerald-400 {
    color: #34d399;
}
.text-white {
    color: #fff;
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
