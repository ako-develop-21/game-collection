import { createRouter, createWebHistory } from "vue-router";
import Home from "../page/Home.vue";
import Minesweeper from "../page/Minesweeper.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/game-collection",
            name: "Home",
            component: Home,
        },
        {
            path: "/minesweeper",
            name: "Minesweeper",
            component: Minesweeper,
        },
        {
            path: "/freecell",
            name: "Freecell",
            component: () => import("../page/Freecell.vue"),
        },
        {
            path: "/2048",
            name: "Game2048",
            component: () => import("../page/Game2048.vue"),
        },
        {
            path: "/puyo",
            name: "PuyoGame",
            component: () => import("../page/PuyoGame.vue"),
        },
        {
            path: "/catan",
            name: "CatanGame",
            component: () => import("../page/CatanGame.vue"),
        },
        {
            path: "/animation-lab",
            name: "AnimationLab",
            component: () => import("../page/AnimationLab.vue"),
        },
        {
            path: "/sudoku",
            name: "SudokuGame",
            component: () => import("../page/SudokuGame.vue"),
        },
        {
            path: "/game-of-life",
            name: "GameOfLife",
            component: () => import("../page/GameOfLife.vue"),
        },
        {
            path: "/dominion",
            name: "DominionGame",
            component: () => import("../page/DominionGame.vue"),
        },
    ],
});

export default router;
