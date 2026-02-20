<script setup lang="ts">
import { computed } from "vue";
import type { Tile } from "../../composables/useGame2048";

const props = defineProps<{
    tile: Tile;
}>();

const tileClass = computed(() => `tile-${props.tile.value}`);

const positionStyle = computed(() => ({
    transform: `translate(${props.tile.x * 100}%, ${props.tile.y * 100}%)`,
}));
</script>

<template>
    <div class="tile-wrapper" :style="positionStyle">
        <div :class="['tile', tileClass]">
            <span class="tile-inner">{{ tile.value }}</span>
        </div>
    </div>
</template>

<style scoped lang="scss">
.tile-wrapper {
    position: absolute;
    width: 25%;
    height: 25%;
    padding: 8px;
    box-sizing: border-box;
    transition: transform 0.15s ease-in-out;
    z-index: 10;
}

.tile {
    width: 100%;
    height: 100%;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Outfit", sans-serif;
    font-weight: 700;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.tile-inner {
    font-size: 2rem;
}

/* 2048 Colors */
.tile-2 {
    background: #eee4da;
    color: #776e65;
}
.tile-4 {
    background: #ede0c8;
    color: #776e65;
}
.tile-8 {
    background: #f2b179;
    color: #f9f6f2;
}
.tile-16 {
    background: #f59563;
    color: #f9f6f2;
}
.tile-32 {
    background: #f67c5f;
    color: #f9f6f2;
}
.tile-64 {
    background: #f65e3b;
    color: #f9f6f2;
}
.tile-128 {
    background: #edcf72;
    color: #f9f6f2;
    font-size: 1.5rem;
}
.tile-256 {
    background: #edcc61;
    color: #f9f6f2;
    font-size: 1.5rem;
}
.tile-512 {
    background: #edc850;
    color: #f9f6f2;
    font-size: 1.5rem;
}
.tile-1024 {
    background: #edc53f;
    color: #f9f6f2;
    font-size: 1.25rem;
}
.tile-2048 {
    background: #edc22e;
    color: #f9f6f2;
    font-size: 1.25rem;
    box-shadow: 0 0 15px #edc22e;
}
.tile-4096 {
    background: #3c3a32;
    color: #f9f6f2;
    font-size: 1.25rem;
}

.tile-128 .tile-inner,
.tile-256 .tile-inner,
.tile-512 .tile-inner {
    font-size: 1.8rem;
}
.tile-1024 .tile-inner,
.tile-2048 .tile-inner,
.tile-4096 .tile-inner {
    font-size: 1.5rem;
}
</style>
