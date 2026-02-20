<script setup lang="ts">
import { computed } from "vue";
import type { PuyoColor } from "../../composables/usePuyoPuyo";

const props = defineProps<{
    color: PuyoColor | null;
    id?: number;
    isGhost?: boolean;
}>();

const colorClass = computed(() => {
    if (!props.color) return "";
    const colors = ["red", "blue", "green", "yellow"];
    return colors[props.color - 1];
});
</script>

<template>
    <div :class="['puyo', colorClass, { ghost: isGhost }]">
        <div v-if="color" class="puyo-eye left"></div>
        <div v-if="color" class="puyo-eye right"></div>
    </div>
</template>

<style scoped lang="scss">
.puyo {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.1s ease;
    box-shadow:
        inset -4px -4px 8px rgba(0, 0, 0, 0.2),
        2px 2px 4px rgba(0, 0, 0, 0.1);

    &.red {
        background: radial-gradient(circle at 30% 30%, #ff8e8e, #ff4d4d);
    }
    &.blue {
        background: radial-gradient(circle at 30% 30%, #8eafff, #4d79ff);
    }
    &.green {
        background: radial-gradient(circle at 30% 30%, #8eff8e, #4dff4d);
    }
    &.yellow {
        background: radial-gradient(circle at 30% 30%, #ffff8e, #ffd700);
    }

    &.ghost {
        opacity: 0.3;
        box-shadow: none;
    }

    .puyo-eye {
        position: absolute;
        width: 25%;
        height: 35%;
        background: white;
        border-radius: 50%;
        top: 25%;

        &::after {
            content: "";
            position: absolute;
            width: 50%;
            height: 50%;
            background: black;
            border-radius: 50%;
            bottom: 10%;
            left: 25%;
        }

        &.left {
            left: 20%;
        }
        &.right {
            right: 20%;
        }
    }
}
</style>
