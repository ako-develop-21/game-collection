<script setup lang="ts">
import { computed } from "vue";
import type { Cell } from "../../composables/useMinesweeper";

const props = defineProps<{
    cell: Cell;
}>();

const emit = defineEmits<{
    (e: "click"): void;
    (e: "right-click"): void;
}>();

const cellContent = computed(() => {
    if (props.cell.isFlagged) return "🚩";
    if (!props.cell.isOpen) return "";
    if (props.cell.isMine) return "💣";
    return props.cell.adjacentMines > 0 ? props.cell.adjacentMines : "";
});

const numberColor = computed(() => {
    const colors = [
        "",
        "text-blue-500",
        "text-green-500",
        "text-red-500",
        "text-purple-600",
        "text-orange-600",
        "text-teal-600",
        "text-gray-900",
        "text-gray-500",
    ];
    return colors[props.cell.adjacentMines] || "";
});
</script>

<template>
    <button
        class="cell"
        :class="[
            { 'is-open': cell.isOpen },
            { 'is-flagged': cell.isFlagged },
            numberColor,
        ]"
        @click="emit('click')"
        @contextmenu.prevent="emit('right-click')"
    >
        <span class="content">{{ cellContent }}</span>
    </button>
</template>

<style scoped lang="scss">
.cell {
    width: 40px;
    height: 40px;
    background-color: #fff;
    border: none;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: 600;
    font-size: 1.2rem;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.05),
        0 1px 2px rgba(0, 0, 0, 0.1);
    color: #334155;
}

.cell:hover:not(.is-open) {
    transform: translateY(-1px);
    box-shadow:
        0 4px 6px rgba(0, 0, 0, 0.05),
        0 2px 4px rgba(0, 0, 0, 0.1);
    background-color: #f8fafc;
}

.cell:active:not(.is-open) {
    transform: translateY(1px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.is-open {
    background-color: #e2e8f0; /* Slate-200 */
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
    cursor: default;
    transform: none !important;
}

.is-open.is-mine {
    background-color: #fee2e2; /* Red-100 */
    color: #ef4444;
}

.is-flagged {
    background-color: #fff7ed; /* Orange-50 */
}

.content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}
</style>
