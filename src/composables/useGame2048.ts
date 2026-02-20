import { ref } from "vue";

export interface Tile {
    id: number;
    value: number;
    x: number;
    y: number;
    mergedFrom?: number[];
}

export function useGame2048() {
    const grid = ref<(number | null)[][]>([
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
    ]);

    const visualTiles = ref<Tile[]>([]);
    const score = ref(0);
    const bestScore = ref(Number(localStorage.getItem("2048_best_score")) || 0);
    const gameState = ref<"playing" | "won" | "lost">("playing");
    const hasReached2048 = ref(false);
    const isMoving = ref(false);

    let nextId = 0;

    const initGame = () => {
        grid.value = [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
        ];
        visualTiles.value = [];
        score.value = 0;
        gameState.value = "playing";
        hasReached2048.value = false;
        nextId = 0;
        addRandomTile();
        addRandomTile();
    };

    const addRandomTile = () => {
        const emptyCells: { x: number; y: number }[] = [];
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (grid.value[y]?.[x] === null) {
                    emptyCells.push({ x, y });
                }
            }
        }

        if (emptyCells.length > 0) {
            const cell =
                emptyCells[Math.floor(Math.random() * emptyCells.length)];
            if (cell) {
                const { x, y } = cell;
                const val = Math.random() < 0.9 ? 2 : 4;
                grid.value[y]![x] = val;
                visualTiles.value.push({
                    id: nextId++,
                    value: val,
                    x,
                    y,
                });
            }
        }
    };

    const move = async (direction: "up" | "down" | "left" | "right") => {
        if (gameState.value === "lost" || isMoving.value) return;

        isMoving.value = true;
        let moved = false;

        // Deep copy current values and ids
        const valueGrid = JSON.parse(JSON.stringify(grid.value)) as (
            | number
            | null
        )[][];
        const idGrid: (number | null)[][] = [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
        ];

        visualTiles.value.forEach((t) => {
            idGrid[t.y]![t.x] = t.id;
        });

        const mergedInThisMove: { x: number; y: number }[] = [];
        const animationSteps: {
            tileId: number;
            targetX: number;
            targetY: number;
            deleteAfter?: boolean;
        }[] = [];

        const vector = (() => {
            switch (direction) {
                case "up":
                    return { x: 0, y: -1 };
                case "down":
                    return { x: 0, y: 1 };
                case "left":
                    return { x: -1, y: 0 };
                case "right":
                    return { x: 1, y: 0 };
            }
        })();

        const traverseOrder =
            direction === "up" || direction === "left"
                ? [0, 1, 2, 3]
                : [3, 2, 1, 0];

        const yOrder =
            direction === "up" || direction === "down"
                ? traverseOrder
                : [0, 1, 2, 3];
        const xOrder =
            direction === "left" || direction === "right"
                ? traverseOrder
                : [0, 1, 2, 3];

        for (const y of yOrder) {
            const row = valueGrid[y];
            if (!row) continue;
            const idRow = idGrid[y];
            if (!idRow) continue;

            for (const x of xOrder) {
                const value = row[x];
                const tileId = idRow[x];
                if (
                    value === null ||
                    value === undefined ||
                    tileId === null ||
                    tileId === undefined
                )
                    continue;

                let targetX = x;
                let targetY = y;
                let mergePartnerId: number | null = null;

                let nextX = x + vector.x;
                let nextY = y + vector.y;

                while (nextX >= 0 && nextX < 4 && nextY >= 0 && nextY < 4) {
                    const nextRow = valueGrid[nextY];
                    if (!nextRow) break;
                    const nextValue = nextRow[nextX];

                    if (nextValue === null) {
                        targetX = nextX;
                        targetY = nextY;
                    } else if (
                        nextValue === value &&
                        !mergedInThisMove.some(
                            (m) => m.x === nextX && m.y === nextY,
                        )
                    ) {
                        targetX = nextX;
                        targetY = nextY;
                        mergePartnerId = idGrid[nextY]?.[nextX] ?? null;
                        break;
                    } else {
                        break;
                    }
                    nextX += vector.x;
                    nextY += vector.y;
                }

                if (targetX !== x || targetY !== y) {
                    moved = true;
                    if (mergePartnerId !== null) {
                        // Merge logic
                        const targetValueRow = valueGrid[targetY];
                        if (targetValueRow) targetValueRow[targetX] = value * 2;
                        row[x] = null;

                        const targetIdRow = idGrid[targetY];
                        if (targetIdRow) targetIdRow[targetX] = null;
                        idRow[x] = null;

                        mergedInThisMove.push({ x: targetX, y: targetY });

                        animationSteps.push({
                            tileId,
                            targetX,
                            targetY,
                            deleteAfter: true,
                        });
                        animationSteps.push({
                            tileId: mergePartnerId,
                            targetX,
                            targetY,
                            deleteAfter: true,
                        });
                    } else {
                        // Slide logic
                        const targetValueRow = valueGrid[targetY];
                        if (targetValueRow) targetValueRow[targetX] = value;
                        row[x] = null;

                        const targetIdRow = idGrid[targetY];
                        if (targetIdRow) targetIdRow[targetX] = tileId;
                        idRow[x] = null;

                        animationSteps.push({ tileId, targetX, targetY });
                    }
                }
            }
        }

        if (moved) {
            // Step 1: Start animation
            animationSteps.forEach((step) => {
                const t = visualTiles.value.find(
                    (tile) => tile.id === step.tileId,
                );
                if (t) {
                    t.x = step.targetX;
                    t.y = step.targetY;
                }
            });

            // Wait for slide animation
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Step 2: Finalize
            grid.value = valueGrid;

            const newVisualTiles: Tile[] = [];
            for (let y = 0; y < 4; y++) {
                const row = valueGrid[y];
                if (!row) continue;
                for (let x = 0; x < 4; x++) {
                    const val = row[x];
                    if (val === null || val === undefined) continue;

                    const isMerged = mergedInThisMove.some(
                        (m) => m.x === x && m.y === y,
                    );
                    if (isMerged) {
                        newVisualTiles.push({ id: nextId++, value: val, x, y });
                        score.value += val;
                        if (val === 2048 && !hasReached2048.value) {
                            hasReached2048.value = true;
                            gameState.value = "won";
                        }
                    } else {
                        const step = animationSteps.find(
                            (s) =>
                                s.targetX === x &&
                                s.targetY === y &&
                                !s.deleteAfter,
                        );
                        const existingTile = step
                            ? visualTiles.value.find(
                                  (t) => t.id === step.tileId,
                              )
                            : visualTiles.value.find(
                                  (t) =>
                                      t.x === x &&
                                      t.y === y &&
                                      !animationSteps.some(
                                          (s) => s.tileId === t.id,
                                      ),
                              );

                        if (existingTile) {
                            newVisualTiles.push({ ...existingTile });
                        }
                    }
                }
            }

            visualTiles.value = newVisualTiles;

            if (score.value > bestScore.value) {
                bestScore.value = score.value;
                localStorage.setItem(
                    "2048_best_score",
                    bestScore.value.toString(),
                );
            }

            addRandomTile();
            checkGameOver();
        }

        isMoving.value = false;
    };

    const checkGameOver = () => {
        // Check if any empty cells
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (grid.value[y]![x] === null) return;
            }
        }

        // Check if any merges possible
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                const val = grid.value[y]![x];
                const directions = [
                    { x: 1, y: 0 },
                    { x: 0, y: 1 },
                ];
                for (const d of directions) {
                    const nx = x + d.x;
                    const ny = y + d.y;
                    if (nx < 4 && ny < 4) {
                        if (grid.value[ny]![nx] === val) return;
                    }
                }
            }
        }

        gameState.value = "lost";
    };

    const continueGame = () => {
        if (gameState.value === "won") {
            gameState.value = "playing";
        }
    };

    return {
        grid,
        tiles: visualTiles,
        score,
        bestScore,
        gameState,
        initGame,
        move,
        continueGame,
    };
}
