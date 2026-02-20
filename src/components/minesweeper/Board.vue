<script setup lang="ts">
import { computed } from "vue";
import type { Cell as CellType } from "../../composables/useMinesweeper";
import Cell from "./Cell.vue";

const props = defineProps<{
    board: CellType[];
    width: number;
    height: number;
}>();

const emit = defineEmits<{
    (e: "open", cell: CellType): void;
    (e: "flag", cell: CellType): void;
}>();

const gridStyle = computed(() => ({
    display: "grid",
    gridTemplateColumns: `repeat(${props.width}, 40px)`,
    gap: "4px",
    padding: "16px",
    backgroundColor: "#f1f5f9" /* Slate-100 */,
    borderRadius: "16px",
    width: "fit-content",
    margin: "0 auto",
    boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
}));
</script>

<template>
    <div class="board-container">
        <div :style="gridStyle">
            <Cell
                v-for="cell in board"
                :key="cell.id"
                :cell="cell"
                @click="emit('open', cell)"
                @right-click="emit('flag', cell)"
            />
        </div>
    </div>
</template>

<style scoped lang="scss">
.board-container {
    display: flex;
    justify-content: center;
    padding: 0;
}
</style>
