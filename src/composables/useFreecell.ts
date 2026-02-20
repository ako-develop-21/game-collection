import { ref, computed } from "vue";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Color = "red" | "black";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
    id: number;
    suit: Suit;
    rank: Rank;
    color: Color;
}

export type LocationType = "tableau" | "freecell" | "foundation";

export interface CardLocation {
    type: LocationType;
    index: number; // column index for tableau, cell index for freecell/foundation
}

export function useFreecell() {
    const tableau = ref<Card[][]>([]);
    const freeCells = ref<(Card | null)[]>([null, null, null, null]);
    const foundations = ref<Card[][]>([[], [], [], []]); // 0:hearts, 1:diamonds, 2:clubs, 3:spades

    const selectedCard = ref<{ card: Card; location: CardLocation } | null>(
        null,
    );
    const gameState = ref<"playing" | "won">("playing");

    /* Timer & Score */
    const timer = ref(0);
    const timerInterval = ref<number | null>(null);
    const bestScore = ref<number | null>(
        Number(localStorage.getItem("freecell_best_score")) || null,
    );

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

    const resetTimer = () => {
        stopTimer();
        timer.value = 0;
    };

    /* History Management */
    interface HistoryState {
        tableau: Card[][];
        freeCells: (Card | null)[];
        foundations: Card[][];
        gameState: "playing" | "won";
    }

    const history = ref<HistoryState[]>([]);
    const historyIndex = ref(-1);

    const saveState = () => {
        // Clone current state
        const state: HistoryState = {
            tableau: JSON.parse(JSON.stringify(tableau.value)),
            freeCells: JSON.parse(JSON.stringify(freeCells.value)),
            foundations: JSON.parse(JSON.stringify(foundations.value)),
            gameState: gameState.value,
        };

        // Remove future history if we are in middle
        if (historyIndex.value < history.value.length - 1) {
            history.value = history.value.slice(0, historyIndex.value + 1);
        }

        history.value.push(state);

        // Limit to 10 steps
        if (history.value.length > 10) {
            history.value.shift();
        } else {
            historyIndex.value++;
        }
    };

    const restoreState = (state: HistoryState) => {
        tableau.value = JSON.parse(JSON.stringify(state.tableau));
        freeCells.value = JSON.parse(JSON.stringify(state.freeCells));
        foundations.value = JSON.parse(JSON.stringify(state.foundations));
        gameState.value = state.gameState;
        selectedCard.value = null;
    };

    const undo = () => {
        if (gameState.value === "won") return;
        if (historyIndex.value > 0) {
            historyIndex.value--;
            restoreState(history.value[historyIndex.value]!);
        }
    };

    const redo = () => {
        if (gameState.value === "won") return;
        if (historyIndex.value < history.value.length - 1) {
            historyIndex.value++;
            restoreState(history.value[historyIndex.value]!);
        }
    };

    const canUndo = computed(
        () => historyIndex.value > 0 && gameState.value !== "won",
    );
    const canRedo = computed(
        () =>
            historyIndex.value < history.value.length - 1 &&
            gameState.value !== "won",
    );

    /* Helpers */
    const getSuitColor = (suit: Suit): Color => {
        return suit === "hearts" || suit === "diamonds" ? "red" : "black";
    };

    const checkEffectiveWin = () => {
        // 1. Check Freecells are empty
        if (freeCells.value.some((c) => c !== null)) return false;

        // 2. Check Tableau columns are sorted (valid sequences)
        for (const col of tableau.value) {
            if (col.length <= 1) continue;
            for (let i = 0; i < col.length - 1; i++) {
                const current = col[i];
                const next = col[i + 1];
                if (!current || !next) return false;
                if (
                    current.color === next.color ||
                    current.rank !== next.rank + 1
                )
                    return false;
            }
        }
        return true;
    };

    const performAutoCompletion = async () => {
        // Move all cards to foundations logically
        let moved = true;
        while (moved) {
            moved = false;
            // Tableau to Foundation
            for (const col of tableau.value) {
                if (col.length === 0) continue;
                const card = col[col.length - 1];
                if (!card) continue;

                // Find target foundation
                const fIndex = foundations.value.findIndex((pile) => {
                    if (pile.length === 0) return card.rank === 1;
                    const top = pile[pile.length - 1];
                    return (
                        top?.suit === card.suit && top.rank === card.rank - 1
                    );
                });

                if (fIndex !== -1) {
                    foundations.value[fIndex]!.push(card);
                    col.pop();
                    moved = true;
                }
            }
        }
        checkWin();
    };

    const checkWin = () => {
        const totalFoundation = foundations.value.reduce(
            (sum, pile) => sum + (pile?.length || 0),
            0,
        );
        if (totalFoundation === 52) {
            gameState.value = "won";
            stopTimer();
            // Update Best Score
            if (bestScore.value === null || timer.value < bestScore.value) {
                bestScore.value = timer.value;
                localStorage.setItem(
                    "freecell_best_score",
                    timer.value.toString(),
                );
            }
            return;
        }

        if (checkEffectiveWin()) {
            performAutoCompletion();
        }
    };

    const findCard = (
        id: number,
    ): { card: Card; location: CardLocation } | null => {
        // check freecells
        const fIndex = freeCells.value.findIndex((c) => c?.id === id);
        if (fIndex !== -1)
            return {
                card: freeCells.value[fIndex]!,
                location: { type: "freecell", index: fIndex },
            };

        // check tableau
        for (let i = 0; i < tableau.value.length; i++) {
            const col = tableau.value[i];
            if (!col) continue;
            const cIndex = col.findIndex((c) => c.id === id);
            if (cIndex !== -1)
                return {
                    card: col[cIndex]!,
                    location: { type: "tableau", index: i },
                };
        }
        return null;
    };

    /* Core Logic */
    const initGame = () => {
        // create deck
        const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
        const deck: Card[] = [];
        let id = 0;
        for (const suit of suits) {
            for (let rank = 1; rank <= 13; rank++) {
                deck.push({
                    id: id++,
                    suit,
                    rank: rank as Rank,
                    color: getSuitColor(suit),
                });
            }
        }

        // shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = deck[i];
            deck[i] = deck[j]!;
            deck[j] = temp!;
        }

        // distribute to 8 tableau columns
        tableau.value = Array.from({ length: 8 }, () => [] as Card[]);
        deck.forEach((card, index) => {
            tableau.value[index % 8]!.push(card);
        });

        freeCells.value = [null, null, null, null];
        foundations.value = [[], [], [], []];
        selectedCard.value = null;
        gameState.value = "playing";

        resetTimer();

        // Clear history
        history.value = [];
        historyIndex.value = -1;
        // Save initial state logic could go here if we wanted "undo to start"
        saveState();
    };

    // Auto start timer on interaction
    const ensureTimerStarted = () => {
        if (
            gameState.value === "playing" &&
            timer.value === 0 &&
            !timerInterval.value
        ) {
            startTimer();
        }
    };

    const saveStateWithType = () => {
        ensureTimerStarted();
        saveState();
    };

    const getMovableLimit = (destinationIsEmpty = false) => {
        // Formula: (1 + EmptyFreeCells) * 2^(EmptyTableauCols)
        // "EmptyTableauCols" refers to empty columns used for transit.
        // If the destination itself is empty, it cannot be used as a transit column.

        const emptyFreeCells = freeCells.value.filter((c) => c === null).length;
        const emptyTableauCols = tableau.value.filter(
            (c) => c.length === 0,
        ).length;

        // If destination is empty, available transit columns = total empty - 1
        // If destination is NOT empty, available transit columns = total empty
        const availableTransitCols = destinationIsEmpty
            ? Math.max(0, emptyTableauCols - 1)
            : emptyTableauCols;

        return (1 + emptyFreeCells) * Math.pow(2, availableTransitCols);
    };

    const selectCard = (card: Card, location: CardLocation) => {
        if (selectedCard.value?.card.id === card.id) {
            selectedCard.value = null;
            return;
        }

        if (location.type === "tableau") {
            const col = tableau.value[location.index];
            if (!col || col.length === 0) return;

            const cardIndex = col.findIndex((c) => c.id === card.id);
            if (cardIndex === -1) return;

            // Check if it's the top card
            if (cardIndex === col.length - 1) {
                selectedCard.value = { card, location };
                return;
            }

            // Check if it's a valid stack
            // 1. Sequence check (descending rank, alternating color) from cardIndex to End
            for (let i = cardIndex; i < col.length - 1; i++) {
                const current = col[i];
                const next = col[i + 1];
                if (!current || !next) return; // Should not happen
                if (
                    current.color === next.color ||
                    current.rank !== next.rank + 1
                )
                    return;
            }

            // 2. Capacity check
            // For selection, we assume best case (destination non-empty or destination is ONE of the empties?).
            // If we are just selecting, we don't know the destination.
            // But typically we should show selectable if it CAN move somewhere.
            // The most restrictive move is to an empty column (limit smaller).
            // The least restrictive is to a non-empty column (limit larger).
            // Let's use the larger limit for selection permissiveness.
            const stackSize = col.length - cardIndex;
            if (stackSize > getMovableLimit(false)) return;

            selectedCard.value = { card, location };
        } else {
            // Freecell/Foundation: only single, already implicitly top
            selectedCard.value = { card, location };
        }
    };

    const moveToFreecell = (index: number) => {
        if (!selectedCard.value) return;
        if (freeCells.value[index] !== null) return;

        // Stack cannot move to freecell (only single card)
        if (selectedCard.value.location.type === "tableau") {
            const col = tableau.value[selectedCard.value.location.index];
            // Check if selected card is NOT the last one (i.e. it's a stack)
            if (
                col &&
                col.length > 0 &&
                col[col.length - 1]?.id !== selectedCard.value.card.id
            )
                return;
        }

        saveStateWithType();

        removeCardFromSource(selectedCard.value.location);
        freeCells.value[index] = selectedCard.value.card;
        selectedCard.value = null;
        checkWin();
    };

    const moveToFoundation = (fIndex: number) => {
        if (!selectedCard.value) return;
        // Stack cannot move to foundation
        if (selectedCard.value.location.type === "tableau") {
            const col = tableau.value[selectedCard.value.location.index];
            if (
                col &&
                col.length > 0 &&
                col[col.length - 1]?.id !== selectedCard.value.card.id
            )
                return;
        }

        const card = selectedCard.value.card;
        const pile = foundations.value[fIndex];
        if (!pile) return;

        if (pile.length === 0) {
            if (card.rank !== 1) return;
        } else {
            const top = pile[pile.length - 1];
            if (!top) return;
            if (top.suit !== card.suit || card.rank !== top.rank + 1) return;
        }

        saveStateWithType();

        removeCardFromSource(selectedCard.value.location);
        pile.push(card);
        selectedCard.value = null;
        checkWin();
    };

    const moveToTableau = (colIndex: number) => {
        if (!selectedCard.value) return;
        const card = selectedCard.value.card; // This is the "deepest" card of the stack (the one we clicked/dragged)
        const col = tableau.value[colIndex];
        if (!col) return;

        // Validate connection to target tableau column
        if (col.length > 0) {
            const top = col[col.length - 1];
            if (!top) return;
            if (top.color === card.color || top.rank !== card.rank + 1) return;
        }

        // Calculate stack to move
        let stack: Card[] = [];
        if (selectedCard.value.location.type === "tableau") {
            const sourceCol = tableau.value[selectedCard.value.location.index];
            if (!sourceCol) return;
            const startIndex = sourceCol.findIndex((c) => c.id === card.id);
            if (startIndex === -1) return;
            // Get the stack from start to end (shallow copy)
            stack = sourceCol.slice(startIndex);
        } else {
            stack = [card];
        }

        // Capacity check with destination knowledge
        const isDestEmpty = col.length === 0;
        if (stack.length > getMovableLimit(isDestEmpty)) return;

        saveStateWithType();

        // Execute Move
        // 1. Remove from source
        removeCardsFromSource(selectedCard.value.location, stack.length);
        // 2. Add to target
        stack.forEach((c) => col.push(c));

        selectedCard.value = null;
        checkWin();
    };

    const removeCardFromSource = (loc: CardLocation) => {
        removeCardsFromSource(loc, 1);
    };

    const removeCardsFromSource = (loc: CardLocation, count: number) => {
        if (loc.type === "tableau") {
            const col = tableau.value[loc.index];
            if (col) {
                // Remove 'count' items from end
                col.splice(col.length - count, count);
            }
        } else if (loc.type === "freecell") {
            freeCells.value[loc.index] = null;
        }
    };

    const handleDrop = (cardId: number, targetLocation: CardLocation) => {
        if (!selectedCard.value || selectedCard.value.card.id !== cardId) {
            const source = findCard(cardId);
            if (!source) return;
            selectedCard.value = source;
        }

        if (targetLocation.type === "freecell") {
            moveToFreecell(targetLocation.index);
        } else if (targetLocation.type === "foundation") {
            moveToFoundation(targetLocation.index);
        } else if (targetLocation.type === "tableau") {
            moveToTableau(targetLocation.index);
        }
    };

    /* Double Click Auto Move */
    const tryMoveToFoundation = (card: Card, location: CardLocation) => {
        if (location.type === "freecell") {
            if (
                !freeCells.value[location.index] ||
                freeCells.value[location.index]?.id !== card.id
            )
                return;
        } else if (location.type === "tableau") {
            const col = tableau.value[location.index];
            if (!col || col.length === 0) return;
            if (col[col.length - 1]?.id !== card.id) return;
        } else {
            return;
        }

        // Try Foundation
        for (let f = 0; f < 4; f++) {
            const pile = foundations.value[f];
            if (!pile) continue;

            let canMove = false;
            if (pile.length === 0) {
                if (card.rank === 1) canMove = true;
            } else {
                const top = pile[pile.length - 1];
                if (
                    top &&
                    top.suit === card.suit &&
                    top.rank === card.rank - 1
                ) {
                    canMove = true;
                }
            }

            if (canMove) {
                saveStateWithType();
                removeCardFromSource(location);
                pile.push(card);
                checkWin();
                return; // Moved to foundation
            }
        }

        // Fallback: Try Freecell
        if (location.type !== "freecell") {
            const emptyIndex = freeCells.value.findIndex((c) => c === null);
            if (emptyIndex !== -1) {
                saveStateWithType();
                removeCardFromSource(location);
                freeCells.value[emptyIndex] = card;
                return; // Moved to freecell
            }
        }
    };

    initGame();

    const checkPlayable = (card: Card, location: CardLocation): boolean => {
        if (location.type === "freecell") return true;
        if (location.type === "tableau") {
            const col = tableau.value[location.index];
            if (!col || col.length === 0) return false;

            const cardIndex = col.findIndex((c) => c.id === card.id);
            if (cardIndex === -1) return false;

            // Top card always playable
            if (cardIndex === col.length - 1) return true;

            // Stack check
            // 1. Sequence
            for (let i = cardIndex; i < col.length - 1; i++) {
                const current = col[i];
                const next = col[i + 1];
                if (!current || !next) return false;
                if (
                    current.color === next.color ||
                    current.rank !== next.rank + 1
                )
                    return false;
            }
            // 2. Capacity
            const stackSize = col.length - cardIndex;
            // For drag startability, allow if it fits in best case (non-empty dest)
            // Or should we be stricter? If it can't fit in ANY available slot, it shouldn't draggable.
            // But we don't know user intent. Best case is fine.
            return stackSize <= getMovableLimit(false);
        }
        return false;
    };

    return {
        tableau,
        freeCells,
        foundations,
        selectedCard,
        gameState,
        timer,
        bestScore,
        initGame,
        selectCard,
        moveToFreecell,
        moveToFoundation,
        moveToTableau,
        handleDrop,
        tryMoveToFoundation,
        undo,
        redo,
        canUndo,
        canRedo,
        checkPlayable,
    };
}
