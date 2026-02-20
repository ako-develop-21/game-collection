<script setup lang="ts">
import type {
    Card as CardType,
    CardLocation,
} from "../../composables/useFreecell";
import Card from "./Card.vue";

const props = defineProps<{
    tableau: CardType[][];
    freeCells: (CardType | null)[];
    foundations: CardType[][];
    selectedCard: { card: CardType; location: CardLocation } | null;
    checkPlayable: (card: CardType, location: CardLocation) => boolean;
}>();

const emit = defineEmits<{
    (e: "click-card", card: CardType, location: CardLocation): void;
    (e: "dblclick-card", card: CardType, location: CardLocation): void;
    (e: "click-empty-tableau", colIndex: number): void;
    (e: "click-freecell", index: number): void;
    (e: "click-foundation", index: number): void;
    (e: "drop-card", cardId: number, target: CardLocation): void;
}>();

const isSelected = (card: CardType) => {
    return props.selectedCard?.card.id === card.id;
};

const onDragStart = (event: DragEvent, card: CardType) => {
    if (event.dataTransfer) {
        event.dataTransfer.setData("text/plain", card.id.toString());
        event.dataTransfer.effectAllowed = "move";
    }
};

const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
    }
};

const onDrop = (event: DragEvent, location: CardLocation) => {
    event.preventDefault();
    const cardId = event.dataTransfer?.getData("text/plain");
    if (cardId) {
        emit("drop-card", parseInt(cardId), location);
    }
};
</script>

<template>
    <div class="board">
        <!-- Top Row: Freecells & Foundations -->
        <div class="top-row">
            <!-- Freecells -->
            <div class="cells-group">
                <div
                    v-for="(card, index) in freeCells"
                    :key="'free-' + index"
                    class="cell-slot"
                    @click="emit('click-freecell', index)"
                    @dragover="onDragOver"
                    @drop="onDrop($event, { type: 'freecell', index })"
                >
                    <Card
                        v-if="card"
                        :card="card"
                        :is-selected="isSelected(card)"
                        :is-playable="true"
                        @click="
                            emit('click-card', card, {
                                type: 'freecell',
                                index,
                            })
                        "
                        @dblclick="
                            emit('dblclick-card', card, {
                                type: 'freecell',
                                index,
                            })
                        "
                        @drag-start="(e) => onDragStart(e, card)"
                    />
                </div>
            </div>

            <!-- Foundations -->
            <div class="cells-group">
                <div
                    v-for="(pile, index) in foundations"
                    :key="'found-' + index"
                    class="cell-slot foundation"
                    @click="emit('click-foundation', index)"
                    @dragover="onDragOver"
                    @drop="onDrop($event, { type: 'foundation', index })"
                >
                    <div v-if="pile.length === 0" class="placeholder-icon">
                        {{ ["♥", "♦", "♣", "♠"][index] }}
                    </div>
                    <Card
                        v-if="pile.length > 0"
                        :card="pile[pile.length - 1]!"
                        :is-selected="false"
                        :is-playable="false"
                    />
                </div>
            </div>
        </div>

        <!-- Bottom Row: Tableau -->
        <div class="tableau-row">
            <div
                v-for="(column, colIndex) in tableau"
                :key="'col-' + colIndex"
                class="tableau-column"
                @click.self="emit('click-empty-tableau', colIndex)"
                @dragover="onDragOver"
                @drop="onDrop($event, { type: 'tableau', index: colIndex })"
            >
                <div
                    v-for="(card, cardIndex) in column"
                    :key="card.id"
                    class="tableau-card-wrapper"
                    :style="{
                        marginTop: cardIndex === 0 ? '0' : '-65px',
                        zIndex: cardIndex,
                    }"
                >
                    <Card
                        :card="card"
                        :is-selected="isSelected(card)"
                        :is-playable="
                            checkPlayable(card, {
                                type: 'tableau',
                                index: colIndex,
                            })
                        "
                        @click="
                            emit('click-card', card, {
                                type: 'tableau',
                                index: colIndex,
                            })
                        "
                        @dblclick="
                            emit('dblclick-card', card, {
                                type: 'tableau',
                                index: colIndex,
                            })
                        "
                        @drag-start="(e) => onDragStart(e, card)"
                    />
                </div>
                <!-- Extended click area for empty column is handled by .tableau-column padding/height -->
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.board {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 1rem;
    max-width: 800px;
    margin: 0 auto;
}

.top-row {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
}

.cells-group {
    display: flex;
    gap: 10px;
}

.cell-slot {
    width: 60px;
    height: 90px;
    background-color: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
}

.foundation {
    background-color: rgba(255, 255, 255, 0.05);
}

.placeholder-icon {
    font-size: 2rem;
    color: rgba(255, 255, 255, 0.1);
}

.tableau-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
}

.tableau-column {
    width: 60px;
    min-height: 400px;
    display: flex;
    flex-direction: column;
    position: relative;
    /* Allow clicking on empty column area */
    padding-bottom: 2rem;
}

.tableau-card-wrapper {
    position: relative;
}
</style>
