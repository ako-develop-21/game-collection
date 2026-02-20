<script setup lang="ts">
import { computed } from "vue";
import type { Card } from "../../composables/useFreecell";

const props = defineProps<{
    card: Card;
    isSelected?: boolean;
    isPlayable?: boolean;
}>();

const emit = defineEmits<{
    (e: "click"): void;
    (e: "dblclick"): void;
    (e: "drag-start", event: DragEvent): void;
}>();

const onDragStart = (event: DragEvent) => {
    if (props.isPlayable) {
        emit("drag-start", event);
    } else {
        event.preventDefault();
    }
};

const suitIcon = computed(() => {
    switch (props.card.suit) {
        case "hearts":
            return "♥";
        case "diamonds":
            return "♦";
        case "clubs":
            return "♣";
        case "spades":
            return "♠";
    }
});

const rankDisplay = computed(() => {
    switch (props.card.rank) {
        case 1:
            return "A";
        case 11:
            return "J";
        case 12:
            return "Q";
        case 13:
            return "K";
        default:
            return props.card.rank.toString();
    }
});

const isRed = computed(() => props.card.color === "red");
</script>

<template>
    <div
        class="card"
        :class="{
            red: isRed,
            black: !isRed,
            selected: isSelected,
            playable: isPlayable,
        }"
        :draggable="isPlayable"
        @click="emit('click')"
        @dblclick="emit('dblclick')"
        @dragstart="onDragStart"
    >
        <div class="top-left">
            <div class="rank">{{ rankDisplay }}</div>
            <div class="suit">{{ suitIcon }}</div>
        </div>
        <div class="center-suit">{{ suitIcon }}</div>
        <div class="bottom-right">
            <div class="rank">{{ rankDisplay }}</div>
            <div class="suit">{{ suitIcon }}</div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.card {
    width: 60px;
    height: 90px;
    background-color: white;
    border-radius: 8px;
    border: 2px solid #ccc;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 4px;
    position: relative;
    user-select: none;
    cursor: default;
    transition:
        transform 0.2s,
        box-shadow 0.2s;
    box-sizing: border-box;
}

.playable {
    cursor: pointer;
}

.selected {
    transform: translateY(-8px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    border: 2px solid #3b82f6;
}

.playable:hover:not(.selected) {
    transform: translateY(-4px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.red {
    color: #ef4444;
}
.black {
    color: #1f2937;
}

.top-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    font-size: 0.9rem;
    font-weight: bold;
    align-self: flex-start;
}

.bottom-right {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    font-size: 0.9rem;
    font-weight: bold;
    align-self: flex-end;
    transform: rotate(180deg);
}

.center-suit {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    opacity: 0.15;
}
</style>
