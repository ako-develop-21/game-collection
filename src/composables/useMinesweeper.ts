import { ref, computed } from "vue";

export interface Cell {
    id: number;
    x: number;
    y: number;
    isMine: boolean;
    isOpen: boolean;
    isFlagged: boolean;
    adjacentMines: number;
}

export type GameState = "ready" | "playing" | "won" | "lost";

export type Difficulty = "Easy" | "Normal" | "Hard";

interface GameConfig {
    width: number;
    height: number;
    mines: number;
}

const DIFFICULTY_CONFIGS: Record<Difficulty, GameConfig> = {
    Easy: { width: 14, height: 8, mines: 10 },
    Normal: { width: 14, height: 8, mines: 20 },
    Hard: { width: 14, height: 8, mines: 30 },
};

export function useMinesweeper() {
    const currentDifficulty = ref<Difficulty>("Easy");
    const config = computed(() => DIFFICULTY_CONFIGS[currentDifficulty.value]);

    const board = ref<Cell[]>([]);
    const gameState = ref<GameState>("ready");
    const mineCount = ref(config.value.mines);

    // Timer & Score
    const timer = ref(0);
    const timerInterval = ref<number | null>(null);
    const bestScores = ref<Record<Difficulty, number | null>>({
        Easy: null,
        Normal: null,
        Hard: null,
    });

    // Initialize board
    const initBoard = () => {
        stopTimer();
        timer.value = 0;
        board.value = [];
        gameState.value = "ready";
        mineCount.value = config.value.mines;

        for (let y = 0; y < config.value.height; y++) {
            for (let x = 0; x < config.value.width; x++) {
                board.value.push({
                    id: y * config.value.width + x,
                    x,
                    y,
                    isMine: false,
                    isOpen: false,
                    isFlagged: false,
                    adjacentMines: 0,
                });
            }
        }
    };

    const setDifficulty = (diff: Difficulty) => {
        currentDifficulty.value = diff;
        initBoard();
    };

    const startTimer = () => {
        if (timerInterval.value) return;
        timerInterval.value = window.setInterval(() => {
            timer.value++;
        }, 1000);
    };

    const stopTimer = () => {
        if (timerInterval.value) {
            clearInterval(timerInterval.value);
            timerInterval.value = null;
        }
    };

    const getCell = (x: number, y: number) => {
        if (
            x < 0 ||
            x >= config.value.width ||
            y < 0 ||
            y >= config.value.height
        )
            return null;
        return board.value[y * config.value.width + x];
    };

    const getNeighbors = (cell: Cell) => {
        const neighbors: Cell[] = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const neighbor = getCell(cell.x + dx, cell.y + dy);
                if (neighbor) neighbors.push(neighbor);
            }
        }
        return neighbors;
    };

    const placeMines = (excludeCell: Cell) => {
        let minesPlaced = 0;
        while (minesPlaced < config.value.mines) {
            const idx = Math.floor(Math.random() * board.value.length);
            const cell = board.value[idx];

            if (!cell) continue;

            // Check for corners
            const isCorner =
                (cell.x === 0 && cell.y === 0) || // Top-Left
                (cell.x === config.value.width - 1 && cell.y === 0) || // Top-Right
                (cell.x === 0 && cell.y === config.value.height - 1) || // Bottom-Left
                (cell.x === config.value.width - 1 &&
                    cell.y === config.value.height - 1); // Bottom-Right

            if (isCorner) continue;

            // Don't place mine on the first clicked cell or its neighbors (optional, but good for UX)
            // For simplicity, just avoid the exact clicked cell
            if (!cell.isMine && cell.id !== excludeCell.id) {
                cell.isMine = true;
                minesPlaced++;
            }
        }

        // Calculate adjacent mines
        board.value.forEach((cell) => {
            if (cell.isMine) return;
            const neighbors = getNeighbors(cell);
            cell.adjacentMines = neighbors.filter((n) => n.isMine).length;
        });
    };

    const openCell = (cell: Cell) => {
        if (gameState.value === "won" || gameState.value === "lost") return;
        if (cell.isOpen || cell.isFlagged) return;

        if (gameState.value === "ready") {
            gameState.value = "playing";
            placeMines(cell);
            startTimer();
        }

        cell.isOpen = true;

        if (cell.isMine) {
            gameState.value = "lost";
            stopTimer();
            revealAll();
            return;
        }

        if (cell.adjacentMines === 0) {
            const neighbors = getNeighbors(cell);
            neighbors.forEach((n) => openCell(n));
        }

        checkWin();
    };

    const toggleFlag = (cell: Cell) => {
        if (gameState.value === "won" || gameState.value === "lost") return;
        if (cell.isOpen) return;

        cell.isFlagged = !cell.isFlagged;
    };

    const checkWin = () => {
        const hiddenNonMines = board.value.filter(
            (c) => !c.isMine && !c.isOpen,
        );
        if (hiddenNonMines.length === 0) {
            gameState.value = "won";
            stopTimer();
            mineCount.value = 0;
            // Flag all remaining mines
            board.value
                .filter((c) => c.isMine)
                .forEach((c) => (c.isFlagged = true));

            // Update Best Score
            const currentBest = bestScores.value[currentDifficulty.value];
            if (currentBest === null || timer.value < currentBest) {
                bestScores.value[currentDifficulty.value] = timer.value;
            }
        }
    };

    const revealAll = () => {
        board.value.forEach((c) => {
            if (c.isMine) c.isOpen = true;
        });
    };

    // Initial setup
    initBoard();

    return {
        board,
        gameState,
        config,
        timer,
        bestScores,
        currentDifficulty,
        openCell,
        toggleFlag,
        resetGame: initBoard,
        setDifficulty,
    };
}
