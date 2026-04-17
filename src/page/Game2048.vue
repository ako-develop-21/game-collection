<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useGame2048 } from "../composables/useGame2048";
import Board from "../components/game2048/Board.vue";

const router = useRouter();
const { tiles, score, bestScore, gameState, initGame, move, continueGame } =
    useGame2048();

const handleKeyDown = (e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const direction = e.key.replace("Arrow", "").toLowerCase() as
            | "up"
            | "down"
            | "left"
            | "right";
        move(direction);
    }
};

onMounted(() => {
    initGame();
    window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
});

const goHome = () => {
    router.push("/game-collection");
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

            <div class="title-container">
                <h1 class="title">2048</h1>
            </div>

            <div class="score-container">
                <div class="score-box">
                    <span class="score-label">SCORE</span>
                    <span class="score-value">{{ score }}</span>
                </div>
                <div class="score-box">
                    <span class="score-label">BEST</span>
                    <span class="score-value">{{ bestScore }}</span>
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
            <Board :tiles="tiles" />

            <transition name="fade">
                <div v-if="gameState !== 'playing'" class="overlay">
                    <div class="overlay-content">
                        <h2 class="overlay-title">
                            {{ gameState === "won" ? "You Win!" : "Game Over" }}
                        </h2>
                        <div class="overlay-actions">
                            <button
                                v-if="gameState === 'won'"
                                class="action-btn continue"
                                @click="continueGame"
                            >
                                Keep Going
                            </button>
                            <button
                                class="action-btn restart"
                                @click="initGame"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </transition>
        </main>
    </div>
</template>

<style scoped lang="scss">
.game-page {
    min-height: 100vh;
    width: 100vw;
    background-color: #faf8ef;
    color: #776e65;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: "Inter", sans-serif;
    overflow: hidden;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 500px;
    padding: 2rem 1rem;
}

.title {
    font-size: 3rem;
    font-weight: 700;
    margin: 0;
    font-family: "Outfit", sans-serif;
}

.score-container {
    display: flex;
    gap: 8px;
}

.score-box {
    background: #bbada0;
    padding: 8px 16px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
}

.score-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: #eee4da;
}

.score-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    font-family: "Outfit", sans-serif;
}

.icon-btn {
    background: #bbada0;
    border: none;
    color: white;
    width: 44px;
    height: 44px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
}

.icon-btn:hover {
    background: #a39485;
}

.game-board-wrapper {
    position: relative;
    margin-top: 1rem;
    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(238, 228, 218, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    backdrop-filter: blur(2px);
    z-index: 100;
}

.overlay-content {
    text-align: center;
}

.overlay-title {
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 2rem;
    color: #776e65;
    font-family: "Outfit", sans-serif;
}

.overlay-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
}

.action-btn {
    background: #8f7a66;
    border: none;
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
}

.action-btn:hover {
    background: #7f6a56;
}

.action-btn.continue {
    background: #776e65;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
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
