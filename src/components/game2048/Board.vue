<script setup lang="ts">
import type { Tile as TileType } from "../../composables/useGame2048";
import Tile from "./Tile.vue";

defineProps<{
    tiles: TileType[];
}>();
</script>

<template>
    <div class="board-container">
        <div class="grid">
            <div v-for="i in 16" :key="i" class="grid-cell"></div>

            <transition-group name="tile-move">
                <Tile v-for="tile in tiles" :key="tile.id" :tile="tile" />
            </transition-group>
        </div>
    </div>
</template>

<style scoped lang="scss">
.board-container {
    background: #bbada0;
    border-radius: 8px;
    padding: 12px;
    position: relative;
    width: 400px;
    height: 400px;
    box-sizing: border-box;
}

.grid {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    height: 100%;
    position: relative;
}

.grid-cell {
    width: 25%;
    height: 25%;
    padding: 8px;
    box-sizing: border-box;
}

.grid-cell::after {
    content: "";
    display: block;
    width: 100%;
    height: 100%;
    background: rgba(238, 228, 218, 0.35);
    border-radius: 6px;
}

.tile-move-move {
    transition: transform 0.15s ease-in-out;
}
</style>
