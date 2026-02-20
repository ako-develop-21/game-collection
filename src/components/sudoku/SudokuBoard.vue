<script setup lang="ts">
import { type SudokuCell } from "../../composables/useSudoku";

const props = defineProps<{
    grid: SudokuCell[][];
    selectedCell: { row: number; col: number } | null;
}>();

const emit = defineEmits<{
    (e: "select", row: number, col: number): void;
}>();

const isRelated = (r: number, c: number) => {
    if (!props.selectedCell) return false;
    const { row: sr, col: sc } = props.selectedCell;
    if (r === sr && c === sc) return false; // Self is highlighted differently

    // Same row or column
    if (r === sr || c === sc) return true;

    // Same 3x3 box
    const boxRow = Math.floor(sr / 3) * 3;
    const boxCol = Math.floor(sc / 3) * 3;
    return r >= boxRow && r < boxRow + 3 && c >= boxCol && c < boxCol + 3;
};

const isSameValue = (cell: SudokuCell) => {
    if (!props.selectedCell || cell.value === null) return false;
    const selected =
        props.grid?.[props.selectedCell.row]?.[props.selectedCell.col];
    return cell.value === selected?.value;
};
</script>

<template>
    <div class="sudoku-board">
        <div v-for="(row, r) in grid" :key="r" class="sudoku-row">
            <div
                v-for="(cell, c) in row"
                :key="c"
                class="sudoku-cell"
                :class="{
                    selected:
                        selectedCell?.row === r && selectedCell?.col === c,
                    related: isRelated(r, c),
                    'same-value': isSameValue(cell),
                    original: cell.original,
                    error: cell.error,
                    'border-right': c % 3 === 2 && c !== 8,
                    'border-bottom': r % 3 === 2 && r !== 8,
                }"
                @click="emit('select', r, c)"
            >
                <span v-if="cell.value !== null" class="cell-value">{{
                    cell.value
                }}</span>
                <div v-else class="notes-grid">
                    <span v-for="n in 9" :key="n" class="note-digit">
                        {{ cell.notes.includes(n) ? n : "" }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.sudoku-board {
    display: grid;
    grid-template-rows: repeat(9, 1fr);
    aspect-ratio: 1 / 1;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    overflow: hidden;
    user-select: none;
}

.sudoku-row {
    display: grid;
    grid-template-columns: repeat(9, 1fr);
}

.sudoku-cell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    font-weight: 500;
    color: #4a90e2;
    cursor: pointer;
    transition: all 0.15s;
    border: 0.5px solid rgba(255, 255, 255, 0.05);

    &.border-right {
        border-right: 2px solid rgba(255, 255, 255, 0.3);
    }
    &.border-bottom {
        border-bottom: 2px solid rgba(255, 255, 255, 0.3);
    }

    &.original {
        color: white;
        font-weight: 700;
    }
    &.error {
        color: #e74c3c;
        background: rgba(231, 76, 60, 0.1);
    }

    &.related {
        background: rgba(255, 255, 255, 0.03);
    }
    &.same-value {
        background: rgba(74, 144, 226, 0.15);
    }
    &.selected {
        background: #4a90e2 !important;
        color: white !important;
    }

    &:hover:not(.selected) {
        background: rgba(255, 255, 255, 0.08);
    }
}

.cell-value {
    position: relative;
    z-index: 1;
}

.notes-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    width: 90%;
    height: 90%;
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1;
    text-align: center;
}

.note-digit {
    display: flex;
    align-items: center;
    justify-content: center;
}

@media (max-width: 500px) {
    .sudoku-cell {
        font-size: 1.2rem;
    }
    .notes-grid {
        font-size: 0.45rem;
    }
}
</style>
