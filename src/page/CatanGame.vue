<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useCatan, type ResourceType } from "../composables/useCatan";
import HexBoard from "../components/catan/HexBoard.vue";

const router = useRouter();
const {
    hexes,
    nodes,
    edges,
    players,
    dice,
    currentPlayerId,
    gameStarted,
    turnPhase,
    winnerId,
    setupPhase,
    setupStep,
    devCardDeck,
    turnCount,
    initGame,
    rollDice,
    nextTurn,
    aiPlayTurn,
    buildRoad,
    buildSettlement,
    buildCity,
    canAfford,
    buyDevelopmentCard,
    playDevelopmentCard,
    moveRobber,
    executeBankTrade,
    evaluatePlayerTrade,
    executePlayerTrade,
    getTradeRatio,
    continueGame,
    ports,
    discardingPlayers,
    discardResources,
    roadBuildingMovesLeft,
    awardHolders,
    calculateTotalPoints,
    calculatePublicPoints,
} = useCatan();

const buildMode = ref<"road" | "settlement" | "city" | "trade" | null>(null);
const currentPlayer = computed(() => players.value[currentPlayerId.value]);
const isUserTurn = computed(() => currentPlayerId.value === 0);

const modalType = ref<"monopoly" | "year_of_plenty" | "trade" | null>(null);
const selectedResources = ref<ResourceType[]>([]);
const pendingCardIndex = ref(-1);

// Trade State
const tradeMode = ref<"bank" | "player">("bank");
const sellRes = ref<ResourceType | null>(null);
const buyRes = ref<ResourceType | null>(null);
const tradeTargetId = ref<number | null>(null);
const offer = ref<Partial<Record<ResourceType, number>>>({});
const request = ref<Partial<Record<ResourceType, number>>>({});
const tradeMessage = ref("");

// Discard State
const resourcesToDiscard = ref<Partial<Record<ResourceType, number>>>({});
const showDiscardModal = computed(() => {
    console.log(
        "turnPhase:" +
            turnPhase.value +
            ", discardingPlayers:" +
            discardingPlayers.value,
    );
    return (
        turnPhase.value === "discarding" && discardingPlayers.value.includes(0)
    );
});

const totalHeld = computed(() => {
    if (!players.value[0]) return 0;
    return Object.values(players.value[0].resources).reduce((a, b) => a + b, 0);
});

const isRoadBuildingMode = computed(() => roadBuildingMovesLeft.value > 0);
const requiredDiscardCount = computed(() => Math.floor(totalHeld.value / 2));

const totalDiscardSelected = computed(() => {
    return Object.values(resourcesToDiscard.value).reduce(
        (a, b) => a + (b || 0),
        0,
    );
});

const toggleBuildMode = (mode: "road" | "settlement" | "city" | "trade") => {
    if (buildMode.value === mode) buildMode.value = null;
    else buildMode.value = mode;
};

const openResourceModal = (type: "monopoly" | "year_of_plenty") => {
    modalType.value = type;
    selectedResources.value = [];
};

const selectResource = (res: ResourceType) => {
    if (modalType.value === "monopoly") {
        playDevelopmentCard(0, pendingCardIndex.value, { resource: res });
        modalType.value = null;
    } else if (modalType.value === "year_of_plenty") {
        selectedResources.value.push(res);
        if (selectedResources.value.length === 2) {
            playDevelopmentCard(0, pendingCardIndex.value, {
                resources: selectedResources.value,
            });
            modalType.value = null;
        }
    }
};

const openTradeModal = () => {
    modalType.value = "trade";
    tradeMode.value = "bank";
    sellRes.value = null;
    buyRes.value = null;
    offer.value = {};
    request.value = {};
    tradeMessage.value = "";
};

const handleBankTrade = () => {
    if (sellRes.value && buyRes.value) {
        if (executeBankTrade(0, sellRes.value, buyRes.value)) {
            modalType.value = null;
        } else {
            tradeMessage.value = "Insufficient resources or invalid ratio.";
        }
    }
};

const handlePlayerTrade = () => {
    if (tradeTargetId.value !== null) {
        if (
            evaluatePlayerTrade(
                0,
                tradeTargetId.value,
                offer.value,
                request.value,
            )
        ) {
            executePlayerTrade(
                0,
                tradeTargetId.value,
                offer.value,
                request.value,
            );
            tradeMessage.value = "Trade Accepted!";
            setTimeout(() => (modalType.value = null), 1000);
        } else {
            tradeMessage.value = "AI rejected the trade.";
        }
    }
};

const updateTradeValue = (
    type: "offer" | "request",
    res: ResourceType,
    delta: number,
) => {
    const target = type === "offer" ? offer.value : request.value;
    const current = target[res] || 0;
    target[res] = Math.max(0, current + delta);
};

const handlePlayCard = (index: number) => {
    const player = players.value[0];
    if (!player) return;
    const card = player.devCards[index];
    if (
        !card ||
        card.played ||
        card.turnBought === turnCount.value ||
        !isUserTurn.value ||
        turnPhase.value !== "rolled"
    )
        return;

    if (card.type === "monopoly" || card.type === "year_of_plenty") {
        pendingCardIndex.value = index;
        openResourceModal(card.type);
    } else {
        playDevelopmentCard(0, index);
    }
};

const updateDiscard = (res: ResourceType, delta: number) => {
    const current = resourcesToDiscard.value[res] || 0;
    const playerRes = players.value[0]?.resources[res] || 0;
    const newVal = Math.max(0, Math.min(playerRes, current + delta));
    resourcesToDiscard.value = {
        ...resourcesToDiscard.value,
        [res]: newVal,
    };
};

const handleDiscard = () => {
    if (totalDiscardSelected.value === requiredDiscardCount.value) {
        discardResources(0, resourcesToDiscard.value);
        resourcesToDiscard.value = {};
    }
};

const setupInstruction = computed(() => {
    if (setupPhase.value === "none") {
        if (isRoadBuildingMode.value)
            return `Road Building: Place ${roadBuildingMovesLeft.value} more roads`;
        return null;
    }
    const step = setupStep.value === "settlement" ? "Settlement" : "Road";
    const ordinal = setupPhase.value === "first" ? "1st" : "2nd";
    return `Setup: Place your ${ordinal} ${step}`;
});

const resourceEmoji: Record<string, string> = {
    wood: "🌲",
    brick: "🧱",
    wool: "🐑",
    wheat: "🌾",
    ore: "🏔️",
    desert: "🌵",
};

const personaNames: Record<string, string> = {
    LAND: "拡大型",
    CITY: "都市型",
    BALANCE: "期待値型",
};

const handleNodeClick = (nodeId: string) => {
    if (!isUserTurn.value || winnerId.value !== null) return;

    if (setupPhase.value !== "none") {
        if (setupStep.value === "settlement") {
            buildSettlement(nodeId, currentPlayerId.value, true);
        }
        return;
    }

    if (buildMode.value === "settlement") {
        if (buildSettlement(nodeId, currentPlayerId.value)) {
            buildMode.value = null;
        }
    } else if (buildMode.value === "city") {
        if (buildCity(nodeId, currentPlayerId.value)) {
            buildMode.value = null;
        }
    }
};

const handleEdgeClick = (edgeId: string) => {
    if (!isUserTurn.value || winnerId.value !== null) return;

    if (setupPhase.value !== "none") {
        if (setupStep.value === "road") {
            buildRoad(edgeId, currentPlayerId.value, true);
        }
        return;
    }

    if (isRoadBuildingMode.value) {
        if (buildRoad(edgeId, currentPlayerId.value, true)) {
            roadBuildingMovesLeft.value--;
        }
        return;
    }

    if (buildMode.value === "road") {
        if (buildRoad(edgeId, currentPlayerId.value)) {
            buildMode.value = null;
        }
    }
};

const handleHexClick = (hexId: number) => {
    if (!isUserTurn.value || turnPhase.value !== "robber") return;
    moveRobber(hexId, currentPlayerId.value);
};

watch(currentPlayerId, (newId) => {
    if (newId !== 0 && gameStarted.value && winnerId.value === null) {
        aiPlayTurn();
    }
});

watch([gameStarted, setupPhase], ([started, phase]) => {
    if (started && phase !== "none" && !isUserTurn.value) {
        aiPlayTurn();
    }
});

onMounted(() => {
    // Game init happens via UI overlay
});
</script>

<template>
    <div class="catan-game-page">
        <div class="catan-container">
            <!-- Setup Overlay -->
            <div v-if="!gameStarted" class="setup-overlay">
                <div class="setup-card">
                    <h1 class="setup-title">CATAN SOLO</h1>
                    <p class="setup-subtitle">Select number of AI players</p>
                    <div class="setup-options">
                        <button class="setup-btn" @click="initGame(2)">
                            <span class="btn-main">1 VS 1</span>
                            <span class="btn-sub">Duel Mode</span>
                        </button>
                        <button class="setup-btn" @click="initGame(3)">
                            <span class="btn-main">1 VS 2</span>
                            <span class="btn-sub">Triangle Battle</span>
                        </button>
                        <button
                            class="setup-btn highlight"
                            @click="initGame(4)"
                        >
                            <span class="btn-main">1 VS 3</span>
                            <span class="btn-sub">Full Classic</span>
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="winnerId !== null" class="setup-overlay victory">
                <div class="setup-card">
                    <h1 class="setup-title">VICTORY!</h1>
                    <p class="setup-subtitle">
                        {{ players[winnerId]?.name }} wins the game!
                    </p>
                    <div class="setup-options">
                        <button
                            class="setup-btn highlight"
                            @click="continueGame"
                        >
                            <span class="btn-main">CONTINUE</span>
                            <span class="btn-sub">Keep playing for fun</span>
                        </button>
                        <button
                            class="setup-btn"
                            @click="initGame(players.length)"
                        >
                            <span class="btn-main">RESTART</span>
                            <span class="btn-sub"
                                >Play again with same players</span
                            >
                        </button>
                        <button class="setup-btn" @click="router.push('/')">
                            <span class="btn-main">BACK TO HOME</span>
                        </button>
                    </div>
                </div>
            </div>

            <div v-else-if="gameStarted" class="game-content">
                <div class="header">
                    <div class="header-left">
                        <button class="back-btn" @click="router.push('/')">
                            ← BACK
                        </button>
                        <div class="turn-mini">
                            <span
                                class="dot"
                                :style="{
                                    backgroundColor: currentPlayer?.color,
                                }"
                            ></span>
                            <span class="name">{{
                                isUserTurn ? "YOUR TURN" : currentPlayer?.name
                            }}</span>
                        </div>
                        <button
                            class="reset-mini-btn"
                            @click="initGame(players.length)"
                            title="Reset Game"
                        >
                            🔄 RESET
                        </button>
                    </div>

                    <div class="game-toolbar" v-if="setupPhase === 'none'">
                        <!-- Dice -->
                        <div
                            class="dice-section"
                            @click="rollDice"
                            :class="{
                                'can-roll': isUserTurn && turnPhase === 'ready',
                            }"
                        >
                            <div class="die">{{ dice[0] }}</div>
                            <div class="die">{{ dice[1] }}</div>
                            <div class="dice-total">
                                {{ dice[0] + dice[1] }}
                            </div>
                        </div>

                        <div class="divider"></div>

                        <!-- Build Actions -->
                        <div
                            class="build-section"
                            v-if="isUserTurn && turnPhase === 'rolled'"
                        >
                            <button
                                v-for="type in [
                                    'road',
                                    'settlement',
                                    'city',
                                ] as const"
                                :key="type"
                                class="toolbar-btn build"
                                :class="{
                                    active: buildMode === type,
                                    disabled: !canAfford(currentPlayerId, type),
                                }"
                                @click="toggleBuildMode(type)"
                            >
                                {{ type.toUpperCase() }}
                            </button>
                            <button
                                class="toolbar-btn build buy-card"
                                :class="{
                                    disabled:
                                        !canAfford(
                                            currentPlayerId,
                                            'devCard',
                                        ) || devCardDeck.length === 0,
                                }"
                                @click="buyDevelopmentCard(currentPlayerId)"
                            >
                                {{
                                    devCardDeck.length > 0
                                        ? "BUY CARD"
                                        : "SOLD OUT"
                                }}
                            </button>
                            <button
                                class="toolbar-btn build trade-btn"
                                @click="openTradeModal"
                            >
                                TRADE
                            </button>
                        </div>

                        <div
                            class="divider"
                            v-if="isUserTurn && turnPhase === 'rolled'"
                        ></div>

                        <!-- Turn Actions -->
                        <div class="action-section" v-if="isUserTurn">
                            <button
                                v-if="turnPhase === 'ready'"
                                class="toolbar-btn roll"
                                @click="isUserTurn ? rollDice() : null"
                            >
                                ROLL
                            </button>
                            <button
                                v-else-if="turnPhase !== 'robber'"
                                class="toolbar-btn end"
                                @click="nextTurn"
                            >
                                END TURN
                            </button>
                        </div>

                        <!-- AI Wait -->
                        <div v-if="!isUserTurn" class="ai-wait-toolbar">
                            <span class="loading-dots">AI Thinking</span>
                        </div>
                    </div>

                    <!-- Robber Toolbar -->
                    <div
                        class="game-toolbar robber-mode"
                        v-else-if="turnPhase === 'robber' && isUserTurn"
                    >
                        <span class="robber-icon">🦹</span>
                        <span class="robber-text"
                            >Move the Robber to a new tile!</span
                        >
                    </div>

                    <!-- Setup / Road Building Phase Dashboard -->
                    <div class="setup-dash" v-else>
                        <div
                            class="setup-message"
                            :class="{ 'road-building': isRoadBuildingMode }"
                        >
                            <span class="setup-icon">{{
                                isRoadBuildingMode ? "🚧" : "🏠"
                            }}</span>
                            <span class="setup-text">{{
                                setupInstruction
                            }}</span>
                        </div>
                    </div>
                </div>

                <div class="game-container">
                    <div class="board-wrapper">
                        <p
                            v-if="setupInstruction && isUserTurn"
                            class="build-instruction-overlay setup"
                        >
                            {{ setupInstruction }}
                        </p>
                        <p
                            v-else-if="buildMode"
                            class="build-instruction-overlay"
                        >
                            Click board to place {{ buildMode.toUpperCase() }}
                        </p>
                        <HexBoard
                            :hexes="hexes"
                            :nodes="nodes"
                            :edges="edges"
                            :players="players"
                            :ports="ports"
                            @node-click="handleNodeClick"
                            @edge-click="handleEdgeClick"
                            :class="{
                                ['build-' + buildMode]: buildMode,
                                'setup-mode':
                                    setupPhase !== 'none' || isRoadBuildingMode,
                                'robber-mode': turnPhase === 'robber',
                            }"
                            @hex-click="handleHexClick"
                        />
                    </div>

                    <div class="game-info-side">
                        <div class="player-resources">
                            <div class="info-header">
                                <h2>Players</h2>
                            </div>
                            <div
                                v-for="p in players"
                                :key="p.id"
                                class="player-card"
                                :class="{ active: p.id === currentPlayerId }"
                            >
                                <div class="player-header">
                                    <span
                                        class="color-indicator"
                                        :style="{
                                            backgroundColor: p?.color || '#ccc',
                                        }"
                                    ></span>
                                    <span class="player-name">
                                        {{ p.name }}
                                        <span
                                            v-if="p.id !== 0"
                                            class="persona-tag"
                                            >({{
                                                personaNames[p.persona]
                                            }})</span
                                        >
                                    </span>
                                    <div class="award-badges">
                                        <span
                                            v-if="
                                                awardHolders.longestRoad
                                                    .playerId === p.id
                                            "
                                            class="award-badge"
                                            title="Longest Road"
                                            >🎖️</span
                                        >
                                        <span
                                            v-if="
                                                awardHolders.largestArmy
                                                    .playerId === p.id
                                            "
                                            class="award-badge"
                                            title="Largest Army"
                                            >⚔️</span
                                        >
                                    </div>
                                    <div class="player-stats-mini">
                                        <span
                                            class="player-points"
                                            :title="
                                                p.id === 0 || winnerId !== null
                                                    ? 'Total Points: ' +
                                                      calculateTotalPoints(p.id)
                                                    : 'Public Points'
                                            "
                                        >
                                            {{
                                                p.id === 0 || winnerId !== null
                                                    ? calculateTotalPoints(p.id)
                                                    : calculatePublicPoints(
                                                          p.id,
                                                      )
                                            }}
                                            PV
                                        </span>
                                        <span
                                            class="card-count"
                                            v-if="
                                                p.devCards.filter(
                                                    (c) => !c.played,
                                                ).length > 0
                                            "
                                            title="Held Cards"
                                        >
                                            🎴
                                            {{
                                                p.devCards.filter(
                                                    (c) => !c.played,
                                                ).length
                                            }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Resources -->
                                <div class="resources-grid">
                                    <template
                                        v-for="(val, res) in p.resources"
                                        :key="res"
                                    >
                                        <div
                                            v-if="res !== 'desert'"
                                            class="resource-item"
                                            :title="res"
                                        >
                                            <span class="res-icon">{{
                                                resourceEmoji[res] || "?"
                                            }}</span>
                                            <span class="res-val">{{
                                                val
                                            }}</span>
                                        </div>
                                    </template>
                                </div>

                                <!-- Played Cards (Visible to all) -->
                                <div
                                    v-if="
                                        p.devCards.filter((c) => c.played)
                                            .length > 0
                                    "
                                    class="played-cards-section"
                                >
                                    <div class="played-cards-list">
                                        <span
                                            v-for="(
                                                card, idx
                                            ) in p.devCards.filter(
                                                (c) => c.played,
                                            )"
                                            :key="idx"
                                            class="played-card-icon"
                                            :title="card.type.toUpperCase()"
                                        >
                                            {{
                                                card.type === "knight"
                                                    ? "⚔️"
                                                    : card.type ===
                                                        "road_building"
                                                      ? "🚧"
                                                      : card.type === "monopoly"
                                                        ? "📜"
                                                        : "✨"
                                            }}
                                        </span>
                                    </div>
                                </div>

                                <!-- My Unplayed Cards (User only) -->
                                <div
                                    v-if="
                                        p.id === 0 &&
                                        p.devCards.filter(
                                            (c) => !c.played && c.type !== 'vp',
                                        ).length > 0
                                    "
                                    class="my-cards-section"
                                >
                                    <div class="cards-header">Your Hand</div>
                                    <div class="cards-list">
                                        <div
                                            v-for="(
                                                card, idx
                                            ) in p.devCards.filter(
                                                (c) =>
                                                    !c.played &&
                                                    c.type !== 'vp',
                                            )"
                                            :key="idx"
                                            class="card-item"
                                            :class="{
                                                playable:
                                                    card.turnBought <
                                                        turnCount &&
                                                    isUserTurn &&
                                                    turnPhase === 'rolled',
                                            }"
                                            @click="
                                                handlePlayCard(
                                                    p.devCards.indexOf(card),
                                                )
                                            "
                                        >
                                            <span class="card-icon">{{
                                                card.type === "knight"
                                                    ? "⚔️"
                                                    : "📜"
                                            }}</span>
                                            <span class="card-label">{{
                                                card.type
                                                    .replace("_", " ")
                                                    .toUpperCase()
                                            }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Costs Reference -->
                        <div class="costs-reference-card">
                            <div class="info-header">
                                <h3>Costs</h3>
                            </div>
                            <div class="costs-grid">
                                <div class="cost-row">
                                    <span>🏠 Settlement:</span>
                                    <span class="cost-icons">🌲🧱🐑🌾</span>
                                </div>
                                <div class="cost-row">
                                    <span>🏛️ City:</span>
                                    <span class="cost-icons">🌾🌾🏔️🏔️🏔️</span>
                                </div>
                                <div class="cost-row">
                                    <span>🚧 Road:</span>
                                    <span class="cost-icons">🌲🧱</span>
                                </div>
                                <div class="cost-row">
                                    <span>📜 Card:</span>
                                    <span class="cost-icons">🐑🌾🏔️</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Multi-purpose Modal (Resource Selection / Trade) -->
                <div
                    v-if="modalType || showDiscardModal"
                    class="resource-modal-overlay"
                >
                    <div
                        class="resource-modal"
                        :class="{
                            'trade-modal':
                                modalType === 'trade' || showDiscardModal,
                        }"
                    >
                        <template v-if="showDiscardModal">
                            <h3>RESOURCE OVERFLOW!</h3>
                            <p class="discard-instruction">
                                A '7' was rolled. You have
                                {{ totalHeld }} cards.
                            </p>
                            <p class="discard-instruction highlight">
                                You must discard
                                {{ requiredDiscardCount }} cards.
                            </p>

                            <div class="discard-grid">
                                <div
                                    v-for="res in [
                                        'wood',
                                        'brick',
                                        'wool',
                                        'wheat',
                                        'ore',
                                    ] as const"
                                    :key="res"
                                    class="discard-item"
                                >
                                    <span class="res-icon-mini">{{
                                        resourceEmoji[res]
                                    }}</span>
                                    <button
                                        class="adjust-btn-mini"
                                        @click="updateDiscard(res, -1)"
                                        :disabled="!resourcesToDiscard[res]"
                                    >
                                        -
                                    </button>
                                    <span class="val-mini"
                                        >{{ resourcesToDiscard[res] || 0
                                        }}<span class="max-part"
                                            >/{{
                                                players[0]?.resources[res]
                                            }}</span
                                        ></span
                                    >
                                    <button
                                        class="adjust-btn-mini"
                                        @click="updateDiscard(res, 1)"
                                        :disabled="
                                            (resourcesToDiscard[res] || 0) >=
                                            (players[0]?.resources[res] || 0)
                                        "
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <p class="discard-status">
                                Selected: {{ totalDiscardSelected }} /
                                {{ requiredDiscardCount }}
                            </p>
                            <button
                                class="execute-btn warning"
                                :disabled="
                                    totalDiscardSelected !==
                                    requiredDiscardCount
                                "
                                @click="handleDiscard"
                            >
                                DISCARD RESOURCES
                            </button>
                        </template>

                        <template v-else-if="modalType === 'trade'">
                            <h3>TRADING</h3>
                            <div class="trade-tabs">
                                <button
                                    :class="{ active: tradeMode === 'bank' }"
                                    @click="tradeMode = 'bank'"
                                >
                                    BANK
                                </button>
                                <button
                                    :class="{ active: tradeMode === 'player' }"
                                    @click="tradeMode = 'player'"
                                >
                                    PLAYERS
                                </button>
                            </div>

                            <!-- Bank Trade UI -->
                            <div
                                v-if="tradeMode === 'bank'"
                                class="bank-trade-ui"
                            >
                                <div class="trade-section">
                                    <p>
                                        SELL ({{
                                            sellRes
                                                ? getTradeRatio(0, sellRes)
                                                : "?"
                                        }}:1)
                                    </p>
                                    <div class="resource-select-mini">
                                        <button
                                            v-for="res in [
                                                'wood',
                                                'brick',
                                                'wool',
                                                'wheat',
                                                'ore',
                                            ] as const"
                                            :key="res"
                                            :class="{
                                                selected: sellRes === res,
                                                disabled:
                                                    (players[0]?.resources?.[
                                                        res
                                                    ] ?? 0) <
                                                    getTradeRatio(0, res),
                                            }"
                                            @click="sellRes = res"
                                        >
                                            {{ resourceEmoji[res] }}
                                        </button>
                                    </div>
                                </div>
                                <div class="trade-arrow">⬇️</div>
                                <div class="trade-section">
                                    <p>BUY (1)</p>
                                    <div class="resource-select-mini">
                                        <button
                                            v-for="res in [
                                                'wood',
                                                'brick',
                                                'wool',
                                                'wheat',
                                                'ore',
                                            ] as const"
                                            :key="res"
                                            :class="{
                                                selected: buyRes === res,
                                            }"
                                            @click="buyRes = res"
                                        >
                                            {{ resourceEmoji[res] }}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    class="execute-btn"
                                    :disabled="!sellRes || !buyRes"
                                    @click="handleBankTrade"
                                >
                                    EXECUTE TRADE
                                </button>
                            </div>

                            <!-- Player Trade UI -->
                            <div v-else class="player-trade-ui">
                                <div class="target-select">
                                    <p>TRADE WITH:</p>
                                    <div class="ai-targets">
                                        <button
                                            v-for="p in players.filter(
                                                (p) => p.id !== 0,
                                            )"
                                            :key="p.id"
                                            :class="{
                                                selected:
                                                    tradeTargetId === p.id,
                                            }"
                                            @click="tradeTargetId = p.id"
                                        >
                                            {{ p.name }}
                                        </button>
                                    </div>
                                </div>
                                <div class="trade-grid">
                                    <div class="trade-col">
                                        <p>YOU OFFER</p>
                                        <div
                                            v-for="res in [
                                                'wood',
                                                'brick',
                                                'wool',
                                                'wheat',
                                                'ore',
                                            ] as const"
                                            :key="res"
                                            class="trade-row"
                                        >
                                            <span>{{
                                                resourceEmoji[res]
                                            }}</span>
                                            <button
                                                @click="
                                                    updateTradeValue(
                                                        'offer',
                                                        res,
                                                        -1,
                                                    )
                                                "
                                            >
                                                -
                                            </button>
                                            <span class="val">{{
                                                offer[res] || 0
                                            }}</span>
                                            <button
                                                @click="
                                                    updateTradeValue(
                                                        'offer',
                                                        res,
                                                        1,
                                                    )
                                                "
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <div class="trade-col">
                                        <p>THEY GIVE</p>
                                        <div
                                            v-for="res in [
                                                'wood',
                                                'brick',
                                                'wool',
                                                'wheat',
                                                'ore',
                                            ] as const"
                                            :key="res"
                                            class="trade-row"
                                        >
                                            <span>{{
                                                resourceEmoji[res]
                                            }}</span>
                                            <button
                                                @click="
                                                    updateTradeValue(
                                                        'request',
                                                        res,
                                                        -1,
                                                    )
                                                "
                                            >
                                                -
                                            </button>
                                            <span class="val">{{
                                                request[res] || 0
                                            }}</span>
                                            <button
                                                @click="
                                                    updateTradeValue(
                                                        'request',
                                                        res,
                                                        1,
                                                    )
                                                "
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    class="execute-btn"
                                    :disabled="tradeTargetId === null"
                                    @click="handlePlayerTrade"
                                >
                                    OFFER TRADE
                                </button>
                            </div>

                            <p class="trade-msg" v-if="tradeMessage">
                                {{ tradeMessage }}
                            </p>
                        </template>

                        <template v-else>
                            <h3>
                                {{
                                    modalType === "monopoly"
                                        ? "Select resource to MONOPOLIZE"
                                        : "Select 2 resources for YEAR OF PLENTY"
                                }}
                            </h3>
                            <p v-if="modalType === 'year_of_plenty'">
                                Selected:
                                {{
                                    selectedResources
                                        .map((r) => resourceEmoji[r])
                                        .join(" ")
                                }}
                            </p>
                            <div class="resource-select-grid">
                                <button
                                    v-for="res in [
                                        'wood',
                                        'brick',
                                        'wool',
                                        'wheat',
                                        'ore',
                                    ] as const"
                                    :key="res"
                                    class="res-select-btn"
                                    @click="selectResource(res)"
                                >
                                    <span class="res-icon">{{
                                        resourceEmoji[res]
                                    }}</span>
                                    <span class="res-label">{{
                                        res.toUpperCase()
                                    }}</span>
                                </button>
                            </div>
                        </template>
                        <button
                            v-if="!showDiscardModal"
                            class="cancel-btn"
                            @click="modalType = null"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.catan-game-page {
    min-height: 100vh;
    background: #1a1a2e;
    color: white;
    padding: 1rem;
    font-family: "Outfit", sans-serif;
}

.catan-container {
    max-width: 1400px;
    margin: 0 auto;
}

.header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    padding: 0.8rem 1.5rem;
    background: rgba(10, 10, 30, 0.8);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.back-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 0.4rem 1rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
}

.turn-mini {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.4rem 1rem;
    border-radius: 50px;
    .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }
    .name {
        font-weight: bold;
        font-size: 0.9rem;
        color: #f1c40f;
        letter-spacing: 1px;
    }
}

.reset-mini-btn {
    background: rgba(231, 76, 60, 0.1);
    border: 1px solid rgba(231, 76, 60, 0.3);
    color: #e74c3c;
    padding: 0.4rem 0.8rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
        background: rgba(231, 76, 60, 0.2);
        transform: scale(1.05);
    }
}

.game-toolbar {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.4rem 1.2rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.dice-section {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.2rem 0.6rem;
    border-radius: 8px;
    opacity: 0.6;
    transition: all 0.3s;

    &.can-roll {
        opacity: 1;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.1);
        &:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    }
}

.die {
    width: 28px;
    height: 28px;
    background: white;
    color: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.dice-total {
    font-weight: bold;
    color: #f1c40f;
    font-size: 1.2rem;
    min-width: 30px;
    text-align: center;
}

.divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
}

.build-section,
.action-section {
    display: flex;
    gap: 0.5rem;
}

.toolbar-btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    font-weight: bold;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover:not(.disabled) {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
    }

    &.active {
        background: #f1c40f;
        color: #1a1a2e;
        border-color: #f1c40f;
    }

    &.disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    &.roll {
        background: #f1c40f;
        color: #1a1a2e;
        border: none;
        &:hover {
            background: #d4ac0d;
        }
    }

    &.end {
        background: #3498db;
        border: none;
        &:hover {
            background: #2980b9;
        }
    }

    &.buy-card {
        background: linear-gradient(135deg, #f5a623, #f8e71c);
        color: #000;
        &:hover:not(.disabled) {
            box-shadow: 0 0 15px rgba(245, 166, 35, 0.5);
        }
    }
}

.game-toolbar.robber-mode {
    background: rgba(231, 76, 60, 0.1);
    border-color: #e74c3c;
    .robber-icon {
        font-size: 1.2rem;
        margin-right: 0.5rem;
    }
    .robber-text {
        color: #e74c3c;
        font-weight: bold;
    }
}

.ai-wait-toolbar {
    color: #888;
    font-size: 0.8rem;
    font-style: italic;
    padding: 0 1rem;
}

.setup-dash {
    background: rgba(241, 196, 15, 0.1);
    border: 1px solid rgba(241, 196, 15, 0.3);
    padding: 0.4rem 1.5rem;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.setup-message {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    .setup-icon {
        font-size: 1.2rem;
    }
    .setup-text {
        font-weight: bold;
        color: #f1c40f;
        font-size: 0.9rem;
        letter-spacing: 1px;
    }
}

.game-container {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
}

.board-wrapper {
    position: relative;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 24px;
    padding: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 600px;
}

.build-instruction-overlay {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(241, 196, 15, 0.9);
    color: #1a1a2e;
    padding: 4px 16px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
    z-index: 10;
    pointer-events: none;
    &.setup {
        background: #2ecc71;
        color: white;
    }
}

.game-info-side {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.player-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1rem;
    transition: all 0.3s;

    &.active {
        background: rgba(241, 196, 15, 0.1);
        border-color: rgba(241, 196, 15, 0.3);
    }
}

.player-header {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 0.8rem;
    .color-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }
    .player-name {
        font-weight: bold;
        font-size: 0.9rem;
        flex-grow: 1;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        .persona-tag {
            font-size: 0.7rem;
            font-weight: normal;
            color: #888;
        }
    }
    .award-badges {
        display: flex;
        gap: 4px;
        margin-right: 8px;
    }
    .award-badge {
        font-size: 1rem;
        filter: drop-shadow(0 0 4px rgba(241, 196, 15, 0.5));
    }
    .player-points {
        font-weight: bold;
        font-size: 0.8rem;
        color: #f1c40f;
    }
}

.resources-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.4rem;
}

.resource-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.4rem 0.2rem;
    border-radius: 8px;
    .res-icon {
        font-size: 1rem;
        margin-bottom: 2px;
    }
    .res-val {
        font-size: 0.8rem;
        font-weight: bold;
    }
}

.player-stats-mini {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
}

.player-points {
    font-weight: bold;
    font-size: 0.85rem;
    color: #f1c40f;
    background: rgba(241, 196, 15, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
}

.card-count {
    font-size: 0.75rem;
    color: #aaa;
    display: flex;
    align-items: center;
    gap: 4px;
}

.played-cards-section {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.played-cards-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.played-card-icon {
    font-size: 1rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px;
    border-radius: 4px;
    opacity: 0.8;
}

.costs-reference-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 0.8rem;
    margin-top: 1rem;

    h3 {
        font-size: 0.8rem;
        text-transform: uppercase;
        color: #888;
        margin-bottom: 0.5rem;
    }
}

.costs-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.cost-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: #ccc;

    .cost-icons {
        letter-spacing: -2px;
    }
}

.my-cards-section {
    margin-top: 1rem;
    padding-top: 0.8rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    .cards-header {
        font-size: 0.7rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        margin-bottom: 0.5rem;
    }

    .cards-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
    }

    .card-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0.4rem;
        min-width: 50px;
        height: 70px;
        justify-content: space-between;
        transition: all 0.2s;

        &.playable {
            cursor: pointer;
            &:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: translateY(-2px);
            }
        }
        &.played {
            opacity: 0.5;
            filter: grayscale(1);
        }

        .card-icon {
            font-size: 1.5rem;
        }
        .card-label {
            font-size: 0.6rem;
            font-weight: bold;
            text-align: center;
        }
    }
}

.discard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin: 0.5rem 0;
    max-width: 320px;
    margin-left: auto;
    margin-right: auto;
}

.discard-item {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.3rem;
    border-radius: 6px;
    gap: 0.3rem;
}

.discard-instruction {
    text-align: center;
    margin-bottom: 0.2rem;
    font-size: 0.85rem;
    color: #ccc;
    &.highlight {
        color: #e74c3c;
        font-weight: bold;
        font-size: 0.95rem;
        margin-bottom: 0.4rem;
    }
}

.res-icon-mini {
    font-size: 1.1rem;
}

.val-mini {
    font-size: 0.9rem;
    font-weight: bold;
    min-width: 30px;
    text-align: center;
}
.max-part {
    font-size: 0.7rem;
    color: #888;
    font-weight: normal;
    margin-left: 2px;
}

.discard-status {
    text-align: center;
    font-weight: bold;
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: #f1c40f;
}

.execute-btn.warning {
    background: #e74c3c;
    border-color: #c0392b;
    margin-top: 0.5rem;
    padding: 0.5rem;
    width: 100%;
    font-size: 0.85rem;
    &:hover:not(:disabled) {
        background: #c0392b;
        transform: scale(1.02);
    }
}

.adjust-btn-mini {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-weight: bold;
    font-size: 0.8rem;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
    }
    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
}

.max-val {
    font-size: 0.8rem;
    color: #888;
    margin-left: 0.5rem;
}

.resource-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.resource-modal {
    background: #1e1e30;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    text-align: center;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);

    h3 {
        margin-bottom: 1.5rem;
        font-size: 1.1rem;
        color: #4a90e2;
    }
    .resource-select-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        margin-bottom: 2rem;
    }
    .res-select-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
        &:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: #4a90e2;
        }
        .res-icon {
            font-size: 1.5rem;
            margin-bottom: 0.3rem;
        }
        .res-label {
            font-size: 0.7rem;
            font-weight: 700;
        }
    }
    .cancel-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.6);
        padding: 0.6rem 2rem;
        border-radius: 10px;
        cursor: pointer;
    }
}

.trade-modal {
    max-width: 600px;
    .trade-tabs {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        justify-content: center;
        button {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #888;
            padding: 0.5rem 2rem;
            border-radius: 8px;
            cursor: pointer;
            &.active {
                background: #4a90e2;
                color: white;
                border-color: #4a90e2;
            }
        }
    }

    .bank-trade-ui,
    .player-trade-ui {
        background: rgba(0, 0, 0, 0.2);
        padding: 1.5rem;
        border-radius: 16px;
        margin-bottom: 2rem;
    }

    .trade-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        p {
            font-size: 0.8rem;
            font-weight: bold;
            color: #888;
        }
    }

    .resource-select-mini {
        display: flex;
        gap: 0.5rem;
        button {
            font-size: 1.5rem;
            padding: 0.5rem;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            cursor: pointer;
            transition: all 0.2s;
            &.selected {
                border-color: #f1c40f;
                background: rgba(241, 196, 15, 0.1);
            }
            &.disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
        }
    }

    .trade-arrow {
        font-size: 1.5rem;
        margin: 1rem 0;
        color: #888;
    }

    .execute-btn {
        margin-top: 1.5rem;
        width: 100%;
        padding: 1rem;
        border-radius: 12px;
        border: none;
        background: #f1c40f;
        color: #1a1a2e;
        font-weight: bold;
        font-size: 1rem;
        cursor: pointer;
        &:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }
    }

    .ai-targets {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        margin-top: 0.5rem;
        button {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            padding: 0.4rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            &.selected {
                border-color: #2ecc71;
                background: rgba(46, 204, 113, 0.1);
            }
        }
    }

    .trade-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-top: 1.5rem;
        .trade-col {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            p {
                font-size: 0.7rem;
                font-weight: bold;
                color: #888;
                margin-bottom: 0.5rem;
            }
        }
        .trade-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(0, 0, 0, 0.2);
            padding: 0.3rem 0.6rem;
            border-radius: 6px;
            .val {
                flex-grow: 1;
                font-weight: bold;
                font-size: 0.9rem;
            }
            button {
                width: 24px;
                height: 24px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.05);
                color: white;
                cursor: pointer;
            }
        }
    }

    .trade-msg {
        margin-top: 1rem;
        font-weight: bold;
        color: #f1c40f;
    }
}

.setup-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 30, 0.9);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.setup-card {
    background: #1a1a2e;
    padding: 3rem;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
}

.setup-title {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    color: #f1c40f;
    letter-spacing: 4px;
}
.setup-subtitle {
    color: #888;
    margin-bottom: 2rem;
}

.setup-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.setup-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem 2rem;
    border-radius: 12px;
    color: white;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
    transition: all 0.3s;
    &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: #f1c40f;
    }
    &.highlight {
        border-color: #f1c40f;
        background: rgba(241, 196, 15, 0.05);
    }
    .btn-main {
        font-weight: bold;
        font-size: 1.2rem;
    }
    .btn-sub {
        font-size: 0.8rem;
        color: #888;
    }
}
</style>
