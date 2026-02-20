import { ref, onMounted, onUnmounted } from "vue";

export type PuyoColor = 1 | 2 | 3 | 4; // Red, Blue, Green, Yellow

export interface Puyo {
    color: PuyoColor;
    id: number;
}

export interface Point {
    x: number;
    y: number;
}

const WIDTH = 6;
const HEIGHT = 12;

export function usePuyoPuyo() {
    const grid = ref<(Puyo | null)[][]>(
        Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null)),
    );

    const score = ref(0);
    const combo = ref(0);
    const isGameOver = ref(false);
    const isPaused = ref(false);
    const isProcessing = ref(false); // True during matching/gravity phases

    // Current falling pair
    const currentPair = ref<{
        puyo1: Puyo;
        puyo2: Puyo;
        pos1: Point;
        pos2: Point;
        rotation: number; // 0: up, 1: right, 2: down, 3: left (relative to puyo1)
    } | null>(null);

    const nextPair = ref<{ puyo1: Puyo; puyo2: Puyo } | null>(null);

    let nextId = 0;
    let gameInterval: number | null = null;
    let pairsGenerated = 0;

    const initGame = () => {
        grid.value = Array.from({ length: HEIGHT }, () =>
            Array(WIDTH).fill(null),
        );
        score.value = 0;
        combo.value = 0;
        isGameOver.value = false;
        isPaused.value = false;
        isProcessing.value = false;
        currentPair.value = null;
        nextPair.value = null;
        nextId = 0;
        pairsGenerated = 0;
        createNewPair();
    };

    const createPuyo = (color?: PuyoColor): Puyo => {
        let selectedColor: PuyoColor;
        if (color) {
            selectedColor = color;
        } else {
            // First two pairs (drops) only use 3 colors (1-3)
            const colorRange = pairsGenerated < 2 ? 3 : 4;
            selectedColor = (Math.floor(Math.random() * colorRange) +
                1) as PuyoColor;
        }

        return {
            color: selectedColor,
            id: nextId++,
        };
    };

    const createNewPair = () => {
        if (!nextPair.value) {
            nextPair.value = { puyo1: createPuyo(), puyo2: createPuyo() };
        }

        const p1 = nextPair.value.puyo1;
        const p2 = nextPair.value.puyo2;

        pairsGenerated++;
        nextPair.value = { puyo1: createPuyo(), puyo2: createPuyo() };

        const startX = 2;
        // Check if spawn point is blocked
        if (grid.value[0]?.[startX] || grid.value[1]?.[startX]) {
            gameOver();
            return;
        }

        currentPair.value = {
            puyo1: p1,
            puyo2: p2,
            pos1: { x: startX, y: 1 },
            pos2: { x: startX, y: 0 },
            rotation: 0,
        };
    };

    const move = (dx: number) => {
        if (
            !currentPair.value ||
            isPaused.value ||
            isProcessing.value ||
            isGameOver.value
        )
            return;

        const newPos1 = {
            x: currentPair.value.pos1.x + dx,
            y: currentPair.value.pos1.y,
        };
        const newPos2 = {
            x: currentPair.value.pos2.x + dx,
            y: currentPair.value.pos2.y,
        };

        if (isValidPos(newPos1) && isValidPos(newPos2)) {
            currentPair.value.pos1 = newPos1;
            currentPair.value.pos2 = newPos2;
        }
    };

    const rotate = (dir: number) => {
        // 1 for clockwise, -1 for counter-clockwise
        if (
            !currentPair.value ||
            isPaused.value ||
            isProcessing.value ||
            isGameOver.value
        )
            return;

        const nextRotation = (currentPair.value.rotation + dir + 4) % 4;
        const offset = getRotationOffset(nextRotation);
        let newPos2 = {
            x: currentPair.value.pos1.x + offset.x,
            y: currentPair.value.pos1.y + offset.y,
        };

        // Simple wall kick
        if (!isValidPos(newPos2)) {
            // Try pushing away from wall
            const pushX = newPos2.x < 0 ? 1 : newPos2.x >= WIDTH ? -1 : 0;
            const pushY = newPos2.y < 0 ? 1 : newPos2.y >= HEIGHT ? -1 : 0;

            const kickedPos1 = {
                x: currentPair.value.pos1.x + pushX,
                y: currentPair.value.pos1.y + pushY,
            };
            const kickedPos2 = { x: newPos2.x + pushX, y: newPos2.y + pushY };

            if (isValidPos(kickedPos1) && isValidPos(kickedPos2)) {
                currentPair.value.pos1 = kickedPos1;
                currentPair.value.pos2 = kickedPos2;
                currentPair.value.rotation = nextRotation;
            }
        } else {
            currentPair.value.pos2 = newPos2;
            currentPair.value.rotation = nextRotation;
        }
    };

    const getRotationOffset = (rot: number): Point => {
        switch (rot) {
            case 0:
                return { x: 0, y: -1 };
            case 1:
                return { x: 1, y: 0 };
            case 2:
                return { x: 0, y: 1 };
            case 3:
                return { x: -1, y: 0 };
            default:
                return { x: 0, y: 0 };
        }
    };

    const isValidPos = (p: Point): boolean => {
        return (
            p.x >= 0 &&
            p.x < WIDTH &&
            p.y >= 0 &&
            p.y < HEIGHT &&
            !grid.value[p.y]?.[p.x]
        );
    };

    const drop = async () => {
        if (
            !currentPair.value ||
            isPaused.value ||
            isProcessing.value ||
            isGameOver.value
        )
            return;

        const nextY1 = currentPair.value.pos1.y + 1;
        const nextY2 = currentPair.value.pos2.y + 1;

        const canDrop1 =
            nextY1 < HEIGHT && !grid.value[nextY1]?.[currentPair.value.pos1.x];
        const canDrop2 =
            nextY2 < HEIGHT && !grid.value[nextY2]?.[currentPair.value.pos2.x];

        if (canDrop1 && canDrop2) {
            currentPair.value.pos1.y++;
            currentPair.value.pos2.y++;
        } else {
            await landPair();
        }
    };

    const landPair = async () => {
        if (!currentPair.value) return;

        const p1 = currentPair.value.puyo1;
        const p2 = currentPair.value.puyo2;
        const pos1 = currentPair.value.pos1;
        const pos2 = currentPair.value.pos2;

        currentPair.value = null;
        isProcessing.value = true;

        // Place them in grid
        grid.value[pos1.y]![pos1.x] = p1;
        grid.value[pos2.y]![pos2.x] = p2;

        await processGameSequence();
    };

    const processGameSequence = async () => {
        let hasMatches = true;
        combo.value = 0;

        while (hasMatches) {
            // 1. Gravity (falling down into holes)
            let gravityApplied = true;
            while (gravityApplied) {
                gravityApplied = applyGravity();
                if (gravityApplied) {
                    await new Promise((r) => setTimeout(r, 100));
                }
            }

            // 2. Matching
            const matchedPoints = findMatches();
            if (matchedPoints.length > 0) {
                hasMatches = true;
                combo.value++;
                score.value += calculateScore(
                    matchedPoints.length,
                    combo.value,
                );

                // Remove matches
                matchedPoints.forEach((p) => {
                    grid.value[p.y]![p.x] = null;
                });

                await new Promise((r) => setTimeout(r, 300));
            } else {
                hasMatches = false;
            }
        }

        isProcessing.value = false;
        createNewPair();
    };

    const applyGravity = (): boolean => {
        let moved = false;
        for (let x = 0; x < WIDTH; x++) {
            for (let y = HEIGHT - 2; y >= 0; y--) {
                const currentPuyo = grid.value[y]?.[x];
                const belowRow = grid.value[y + 1];
                if (currentPuyo && belowRow && !belowRow[x]) {
                    belowRow[x] = currentPuyo;
                    grid.value[y]![x] = null;
                    moved = true;
                }
            }
        }
        return moved;
    };

    const findMatches = (): Point[] => {
        const matched: Point[] = [];
        const visited = Array.from({ length: HEIGHT }, () =>
            Array(WIDTH).fill(false),
        );

        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                const puyo = grid.value[y]![x];
                if (puyo && !visited[y]![x]) {
                    const group = findConnected(x, y, puyo.color, visited);
                    if (group.length >= 4) {
                        matched.push(...group);
                    }
                }
            }
        }
        return matched;
    };

    const findConnected = (
        startX: number,
        startY: number,
        color: PuyoColor,
        visited: boolean[][],
    ): Point[] => {
        const group: Point[] = [];
        const stack: Point[] = [{ x: startX, y: startY }];
        visited[startY]![startX] = true;

        while (stack.length > 0) {
            const { x, y } = stack.pop()!;
            group.push({ x, y });

            const neighbors = [
                { x: x + 1, y },
                { x: x - 1, y },
                { x, y: y + 1 },
                { x, y: y - 1 },
            ];

            for (const n of neighbors) {
                if (
                    n.x >= 0 &&
                    n.x < WIDTH &&
                    n.y >= 0 &&
                    n.y < HEIGHT &&
                    !visited[n.y]![n.x] &&
                    grid.value[n.y]![n.x]?.color === color
                ) {
                    visited[n.y]![n.x] = true;
                    stack.push(n);
                }
            }
        }
        return group;
    };

    const calculateScore = (numPuyos: number, comboCount: number) => {
        // Basic scoring formula
        return numPuyos * 10 * comboCount;
    };

    const gameOver = () => {
        isGameOver.value = true;
        stopLoop();
    };

    const startLoop = () => {
        if (gameInterval) return;
        gameInterval = window.setInterval(() => {
            if (!isPaused.value && !isProcessing.value && !isGameOver.value) {
                drop();
            }
        }, 1000); // Constant slow speed as requested
    };

    const stopLoop = () => {
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
    };

    const togglePause = () => {
        isPaused.value = !isPaused.value;
    };

    const handleVisibilityChange = () => {
        if (document.hidden) {
            isPaused.value = true;
        }
    };

    const handleBlur = () => {
        isPaused.value = true;
    };

    const handleFocus = () => {
        // Stay paused until user explicitly unpauses?
        // Usually, games resume on focus if they were paused on blur.
        // Let's keep it paused if it was manually paused, but the user asked for "stop when inactive".
    };

    onMounted(() => {
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        initGame();
        startLoop();
    });

    onUnmounted(() => {
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );
        stopLoop();
    });

    return {
        grid,
        currentPair,
        nextPair,
        score,
        combo,
        isGameOver,
        isPaused,
        isProcessing,
        move,
        rotate,
        drop,
        initGame,
        togglePause,
    };
}
