<script setup lang="ts">
import { computed } from "vue";
import PuyoCell from "./PuyoCell.vue";
import type { Puyo, Point } from "../../composables/usePuyoPuyo";

const props = defineProps<{
    grid: (Puyo | null)[][];
    currentPair: {
        puyo1: Puyo;
        puyo2: Puyo;
        pos1: Point;
        pos2: Point;
    } | null;
}>();

const width = 6;
const height = 12;

const displayGrid = computed(() => {
    const display = props.grid.map((row) => [...row]);

    if (props.currentPair) {
        const { puyo1, puyo2, pos1, pos2 } = props.currentPair;
        if (pos1.y >= 0 && pos1.y < height && pos1.x >= 0 && pos1.x < width) {
            display[pos1.y]![pos1.x] = puyo1;
        }
        if (pos2.y >= 0 && pos2.y < height && pos2.x >= 0 && pos2.x < width) {
            display[pos2.y]![pos2.x] = puyo2;
        }
    }

    return display;
});
</script>

<template>
    <div class="puyo-board">
        <div v-for="(row, y) in displayGrid" :key="y" class="puyo-row">
            <div v-for="(puyo, x) in row" :key="x" class="puyo-cell-container">
                <PuyoCell v-if="puyo" :color="puyo.color" :id="puyo.id" />
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.puyo-board {
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.4);
    border: 4px solid #444;
    border-radius: 8px;
    padding: 4px;
    width: fit-content;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.puyo-row {
    display: flex;
}

.puyo-cell-container {
    width: 40px;
    height: 40px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
}
</style>
