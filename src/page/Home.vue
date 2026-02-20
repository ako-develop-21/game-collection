<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
    <div class="home-container">
        <div class="content">
            <h1 class="title">GAME COLLECTION</h1>
            <p class="subtitle">
                A curation of classic logic puzzles and games.
            </p>

            <div class="games-grid">
                <button
                    class="game-btn minesweeper"
                    @click="router.push('/minesweeper')"
                >
                    <span class="game-icon">💣</span>
                    <span class="game-name">Minesweeper</span>
                </button>

                <button
                    class="game-btn freecell"
                    @click="router.push('/freecell')"
                >
                    <span class="game-icon">🃏</span>
                    <span class="game-name">Freecell</span>
                </button>

                <button
                    class="game-btn game-2048"
                    @click="router.push('/2048')"
                >
                    <span class="game-icon">🔢</span>
                    <span class="game-name">2048</span>
                </button>

                <button class="game-btn puyo" @click="router.push('/puyo')">
                    <span class="game-icon">🔴</span>
                    <span class="game-name">Puyo Puyo</span>
                </button>

                <button class="game-btn catan" @click="router.push('/catan')">
                    <span class="game-icon">🏗️</span>
                    <span class="game-name">Catan</span>
                </button>

                <button class="game-btn sudoku" @click="router.push('/sudoku')">
                    <span class="game-icon">🧩</span>
                    <span class="game-name">Sudoku</span>
                </button>

                <button
                    class="game-btn lab"
                    @click="router.push('/animation-lab')"
                >
                    <span class="game-icon">🧪</span>
                    <span class="game-name">Animation Lab</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.home-container {
    min-height: 100vh;
    width: 100vw;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f8fafc; /* Slate-50 */
    color: #334155; /* Slate-700 */
    padding: 2rem;
}

.content {
    text-align: center;
    animation: fadeIn 1.2s cubic-bezier(0.22, 1, 0.36, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 1200px;
}

.title {
    font-size: 4rem;
    font-weight: 200; /* Thin font for elegance */
    letter-spacing: 0.8rem;
    margin-bottom: 1rem;
    color: #1e293b; /* Slate-800 */
}

.subtitle {
    font-size: 1.25rem;
    font-weight: 300;
    margin-bottom: 4rem;
    color: #64748b; /* Slate-500 */
    letter-spacing: 0.1rem;
}

.games-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2rem;
}

.game-btn {
    width: 200px;
    height: 200px;
    background: white;
    border: none;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow:
        0 10px 15px -3px rgba(0, 0, 0, 0.05),
        0 4px 6px -2px rgba(0, 0, 0, 0.025);
}

.game-btn:hover {
    transform: translateY(-8px);
    box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.game-btn:active {
    transform: translateY(-2px);
}

.game-icon {
    font-size: 4rem;
}

.game-name {
    font-size: 1.2rem;
    font-weight: 500;
    color: #475569;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
