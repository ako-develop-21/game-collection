<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import { useRouter } from "vue-router";
import HexBoard from "../components/catan/HexBoard.vue";
import { useCatan, type ResourceType } from "../composables/useCatan";
import { useCatanRoom } from "../composables/useCatanRoom";
import gongSound from "../assets/se/gong.mp3";

const router = useRouter();
const {
    hexes,
    nodes,
    edges,
    players,
    dice,
    currentPlayerId,
    userPlayerId,
    isUserTurn,
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
    logs,
    syncGameState,
    activeTradeRequest,
    forceSync,
    isInternalUpdate,
    isConnected,
} = useCatan();

const buildMode = ref<"road" | "settlement" | "city" | "trade" | null>(null);

const currentPlayer = computed(() => players.value[currentPlayerId.value]);

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

// Multiplayer State
const {
    roomId,
    roomPlayers,
    isHost,
    myPlayerIdInRoom,
    gameStartedInRoom,
    aiCountInRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    startGameInRoom,
    addAI,
    removeAI,
} = useCatanRoom();

const isMultiplayerMode = ref(false);
const showLobby = ref(false);
const playerName = ref("Player " + Math.floor(Math.random() * 1000));
const inputRoomId = ref("");
const connectionError = ref("");
const globalFeedbackMessage = ref("");

// Multiplayer Integration
watch(gameStartedInRoom, (started) => {
    if (started && !gameStarted.value) {
        const totalCount = roomPlayers.value.length + aiCountInRoom.value;
        const allPlayersInRoom = [...roomPlayers.value];

        // Add AI placeholders
        for (let i = 0; i < aiCountInRoom.value; i++) {
            const aiId = roomPlayers.value.length + i;
            allPlayersInRoom.push({
                id: aiId,
                name: `AI ${i + 1}`,
                color:
                    ["#3498db", "#2ecc71", "#f1c40f", "#9b59b6"][aiId] ||
                    "#9b59b6",
                isHost: false,
                isReady: true,
                joinedAt: Date.now(),
            });
        }

        initGame(totalCount, allPlayersInRoom, myPlayerIdInRoom.value!);
        syncGameState(roomId.value!);
    }
});

const handleCreateMultiplayer = async () => {
    try {
        await createRoom(playerName.value);
        isMultiplayerMode.value = true;
        showLobby.value = true;
    } catch (e: any) {
        connectionError.value = e.message;
    }
};

const handleJoinMultiplayer = async () => {
    if (!inputRoomId.value) return;
    try {
        await joinRoom(inputRoomId.value.toUpperCase(), playerName.value);
        isMultiplayerMode.value = true;
        showLobby.value = true;
    } catch (e: any) {
        connectionError.value = e.message;
    }
};

// Action Log Filter
const logFilter = ref<"all" | "dice" | number>("all");
const filteredLogs = computed(() => {
    if (logFilter.value === "all") return [...logs.value].reverse();
    if (logFilter.value === "dice")
        return logs.value.filter((l) => l.type === "dice").reverse();
    return logs.value.filter((l) => l.playerId === logFilter.value).reverse();
});
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
        turnPhase.value === "discarding" &&
        discardingPlayers.value.includes(userPlayerId.value)
    );
});

const totalHeld = computed(() => {
    const user = players.value[userPlayerId.value];
    if (!user) return 0;
    return Object.values(user.resources).reduce((a, b) => a + b, 0);
});

const isRoadBuildingMode = computed(() => roadBuildingMovesLeft.value > 0);
const requiredDiscardCount = computed(() => Math.floor(totalHeld.value / 2));

const isCostsExpanded = ref(false);

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
        playDevelopmentCard(userPlayerId.value, pendingCardIndex.value, {
            resource: res,
        });
        modalType.value = null;
    } else if (modalType.value === "year_of_plenty") {
        selectedResources.value.push(res);
        if (selectedResources.value.length === 2) {
            playDevelopmentCard(userPlayerId.value, pendingCardIndex.value, {
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
        if (executeBankTrade(userPlayerId.value, sellRes.value, buyRes.value)) {
            modalType.value = null;
        } else {
            tradeMessage.value = "Insufficient resources or invalid ratio.";
        }
    }
};

const handlePlayerTrade = () => {
    if (tradeTargetId.value !== null) {
        const targetPlayer = players.value.find(
            (p) => p.id === tradeTargetId.value,
        );
        const isHuman = targetPlayer && !targetPlayer.name.startsWith("AI");

        if (isHuman) {
            activeTradeRequest.value = {
                fromId: userPlayerId.value,
                toId: tradeTargetId.value,
                offer: { ...offer.value },
                request: { ...request.value },
                status: "pending",
                timestamp: Date.now(),
            } as any;
            tradeMessage.value = "Request sent to " + targetPlayer!.name;
        } else {
            if (
                evaluatePlayerTrade(
                    userPlayerId.value,
                    tradeTargetId.value,
                    offer.value,
                    request.value,
                )
            ) {
                executePlayerTrade(
                    userPlayerId.value,
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
    }
};

const handleAcceptTrade = () => {
    if (activeTradeRequest.value) {
        executePlayerTrade(
            activeTradeRequest.value.fromId,
            activeTradeRequest.value.toId as number,
            activeTradeRequest.value.offer,
            activeTradeRequest.value.request,
        );
        activeTradeRequest.value = null;
    }
};

const handleRejectTrade = () => {
    activeTradeRequest.value = null;
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
    const player = players.value[userPlayerId.value];
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
        playDevelopmentCard(userPlayerId.value, index);
    }
};

const updateDiscard = (res: ResourceType, delta: number) => {
    const current = resourcesToDiscard.value[res] || 0;
    const playerRes = players.value[userPlayerId.value]?.resources[res] || 0;
    const newVal = Math.max(0, Math.min(playerRes, current + delta));
    resourcesToDiscard.value = {
        ...resourcesToDiscard.value,
        [res]: newVal,
    };
};

const handleDiscard = () => {
    if (totalDiscardSelected.value === requiredDiscardCount.value) {
        discardResources(userPlayerId.value, resourcesToDiscard.value);
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

// TODO:AIモードの時は personaNames を小さく表示する
// const personaNames: Record<string, string> = {
//   LAND: "拡大型",
//   CITY: "都市型",
//   BALANCE: "期待値型",
// };

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
    // Only the host (or local player in solo) should trigger AI moves
    const shouldTriggerAi = !isMultiplayerMode.value || isHost.value;

    if (
        newId !== userPlayerId.value &&
        gameStarted.value &&
        winnerId.value === null &&
        shouldTriggerAi
    ) {
        aiPlayTurn();
    }
});

watch(
    [gameStarted, setupPhase],
    ([started, phase], [_oldStarted, oldPhase] = [false, "none"]) => {
        const shouldTriggerAi = !isMultiplayerMode.value || isHost.value;
        if (started && !isUserTurn.value && shouldTriggerAi) {
            if (
                phase !== "none" ||
                (phase === "none" && oldPhase === "second")
            ) {
                aiPlayTurn();
            }
        }
    },
);

onMounted(() => {
    // Check for room ID in URL
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
        inputRoomId.value = room.toUpperCase();
        handleJoinMultiplayer();
    }
});

// UX Polish Watches
watch(isUserTurn, (isTurn) => {
    if (isTurn && gameStarted.value && winnerId.value === null) {
        const audio = new Audio(gongSound);
        audio.volume = 0.15;
        audio
            .play()
            .catch((e) => console.warn("Audio play blocked by browser:", e));
    }
});

watch(activeTradeRequest, (newReq, oldReq) => {
    if (oldReq && !newReq && oldReq.status === "pending") {
        // If it was our request and now it's gone, it was rejected or cancelled
        if (oldReq.fromId === userPlayerId.value) {
            globalFeedbackMessage.value = "Trade rejected or cancelled";
            setTimeout(() => (globalFeedbackMessage.value = ""), 3000);
        }
    }
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
                    <div class="setup-divider">OR</div>
                    <div class="mp-setup">
                        <input
                            v-model="playerName"
                            placeholder="Your Name"
                            class="mp-input"
                        />
                        <div class="mp-actions">
                            <button
                                class="setup-btn mp-btn"
                                @click="handleCreateMultiplayer"
                            >
                                <span class="btn-main">Create Room</span>
                            </button>
                            <div class="join-area">
                                <input
                                    v-model="inputRoomId"
                                    placeholder="Room ID"
                                    class="mp-input join-input"
                                    @keyup.enter="handleJoinMultiplayer"
                                />
                                <button
                                    class="setup-btn mp-btn"
                                    @click="handleJoinMultiplayer"
                                >
                                    <span class="btn-main">Join</span>
                                </button>
                            </div>
                        </div>
                        <p v-if="connectionError" class="error-msg">
                            {{ connectionError }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Lobby Overlay -->
            <div v-if="showLobby" class="setup-overlay">
                <div class="setup-card lobby-card">
                    <h1 class="setup-title">LOBBY: {{ roomId }}</h1>
                    <div class="player-list">
                        <div
                            v-for="p in roomPlayers"
                            :key="'human-' + p.id"
                            class="lobby-player"
                        >
                            <span
                                class="player-color-dot"
                                :style="{ backgroundColor: p.color }"
                            ></span>
                            <span class="player-name"
                                >{{ p.name }}
                                {{ p.isHost ? "(Host)" : "" }}</span
                            >
                            <span
                                v-if="p.id === myPlayerIdInRoom"
                                class="you-badge"
                                >YOU</span
                            >
                        </div>
                        <div
                            v-for="i in aiCountInRoom"
                            :key="'ai-' + i"
                            class="lobby-player ai-player"
                        >
                            <span
                                class="player-color-dot"
                                :style="{
                                    backgroundColor:
                                        [
                                            '#3498db',
                                            '#2ecc71',
                                            '#f1c40f',
                                            '#9b59b6',
                                        ][roomPlayers.length + i - 1] ||
                                        '#9b59b6',
                                }"
                            ></span>
                            <span class="player-name">AI {{ i }}</span>
                            <button
                                v-if="isHost"
                                class="ai-remove-btn"
                                @click="removeAI"
                            >
                                ×
                            </button>
                        </div>
                        <div
                            v-if="
                                isHost && roomPlayers.length + aiCountInRoom < 4
                            "
                            class="lobby-player add-ai-slot"
                        >
                            <button class="add-ai-btn" @click="addAI">
                                + Add AI Player
                            </button>
                        </div>
                        <div
                            v-for="i in 4 - roomPlayers.length - aiCountInRoom"
                            :key="'empty-' + i"
                            class="lobby-player empty"
                        >
                            <span class="player-color-dot empty"></span>
                            <span class="player-name">Waiting...</span>
                        </div>
                    </div>
                    <div class="lobby-actions">
                        <button
                            class="setup-btn"
                            @click="
                                leaveRoom();
                                showLobby = false;
                            "
                        >
                            <span class="btn-main">Leave</span>
                        </button>
                        <button
                            v-if="isHost"
                            class="setup-btn primary"
                            :disabled="roomPlayers.length < 2"
                            @click="startGameInRoom()"
                        >
                            <span class="btn-main">Start Game</span>
                            <span v-if="roomPlayers.length < 2" class="btn-sub"
                                >Min 2 humans required</span
                            >
                            <span v-else class="btn-sub"
                                >With
                                {{ roomPlayers.length + aiCountInRoom }}
                                players</span
                            >
                        </button>
                    </div>
                </div>
            </div>

            <!-- Global Feedback Toast -->
            <Transition name="fade-slide">
                <div v-if="globalFeedbackMessage" class="global-feedback-toast">
                    {{ globalFeedbackMessage }}
                </div>
            </Transition>

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
                        <button
                            class="setup-btn"
                            @click="router.push('/game-collection')"
                        >
                            <span class="btn-main">BACK TO HOME</span>
                        </button>
                    </div>
                </div>
            </div>

            <div v-else-if="gameStarted" class="game-content">
                <div class="header">
                    <div class="header-left">
                        <button
                            class="back-btn"
                            @click="router.push('/game-collection')"
                        >
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
                        <div
                            v-if="isMultiplayerMode"
                            class="connection-status"
                            :class="{ offline: !isConnected }"
                        >
                            <span class="status-dot"></span>
                            {{ isConnected ? "ONLINE" : "OFFLINE" }}
                        </div>

                        <button
                            v-if="isMultiplayerMode"
                            class="reset-mini-btn sync-btn"
                            @click="forceSync"
                            title="Force Sync State"
                        >
                            📡 SYNC
                            <span
                                v-if="isInternalUpdate"
                                class="sync-pulse-dot"
                            ></span>
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

                        <!-- Costs Overlay -->
                        <div
                            class="costs-overlay"
                            :class="{ expanded: isCostsExpanded }"
                            @click="isCostsExpanded = !isCostsExpanded"
                        >
                            <div class="costs-overlay-header">
                                <span class="costs-title">Costs</span>
                                <span class="costs-hint">{{
                                    isCostsExpanded ? "Collapse" : "Expand"
                                }}</span>
                            </div>
                            <div class="costs-grid">
                                <div class="cost-row">
                                    <span class="cost-label"
                                        >🏠 Settlement:</span
                                    >
                                    <span class="cost-icons">🌲🧱🐑🌾</span>
                                </div>
                                <div class="cost-row">
                                    <span class="cost-label">🏛️ City:</span>
                                    <span class="cost-icons">🌾🌾🏔️🏔️🏔️</span>
                                </div>
                                <div class="cost-row">
                                    <span class="cost-label">🚧 Road:</span>
                                    <span class="cost-icons">🌲🧱</span>
                                </div>
                                <div class="cost-row">
                                    <span class="cost-label">📜 Card:</span>
                                    <span class="cost-icons">🐑🌾🏔️</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="game-info-side">
                        <div class="player-resources">
                            <div class="info-header">
                                <h2>Players</h2>
                            </div>
                            <div class="player-cards-grid">
                                <div
                                    v-for="p in players"
                                    :key="p.id"
                                    class="player-card"
                                    :class="{
                                        active: p.id === currentPlayerId,
                                    }"
                                >
                                    <div class="player-header">
                                        <span
                                            class="color-indicator"
                                            :style="{
                                                backgroundColor:
                                                    p?.color || '#ccc',
                                            }"
                                        ></span>
                                        <span class="player-name">
                                            {{ p.name }}
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
                                                    p.id === userPlayerId ||
                                                    winnerId !== null
                                                        ? 'Total Points: ' +
                                                          calculateTotalPoints(
                                                              p.id,
                                                          )
                                                        : 'Public Points'
                                                "
                                            >
                                                {{
                                                    p.id === userPlayerId ||
                                                    winnerId !== null
                                                        ? calculateTotalPoints(
                                                              p.id,
                                                          )
                                                        : calculatePublicPoints(
                                                              p.id,
                                                          )
                                                }}
                                                PV
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Resources -->
                                    <div
                                        v-if="p.id === userPlayerId"
                                        class="resources-grid"
                                    >
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
                                    <div
                                        v-else
                                        class="opponent-resources-summary"
                                    >
                                        <span class="res-icon">🃏</span>
                                        <span class="res-total-label"
                                            >Resources:</span
                                        >
                                        <span class="res-val">{{
                                            Object.values(p.resources).reduce(
                                                (a, b) => a + (b || 0),
                                                0,
                                            )
                                        }}</span>
                                    </div>

                                    <!-- Hand Count & Played Cards -->
                                    <div class="player-card-footer">
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
                                        <div class="played-icons-mini">
                                            <span
                                                v-for="(
                                                    card, idx
                                                ) in p.devCards.filter(
                                                    (c) => c.played,
                                                )"
                                                :key="idx"
                                                class="mini-card-icon"
                                            >
                                                {{
                                                    card.type === "knight"
                                                        ? "⚔️"
                                                        : card.type ===
                                                            "road_building"
                                                          ? "🚧"
                                                          : card.type ===
                                                              "monopoly"
                                                            ? "📜"
                                                            : "✨"
                                                }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- My Unplayed Cards (User only) - Inside card for 4th player space -->
                                    <div
                                        v-if="
                                            p.id === userPlayerId &&
                                            p.devCards.filter(
                                                (c) =>
                                                    !c.played &&
                                                    c.type !== 'vp',
                                            ).length > 0
                                        "
                                        class="my-hand-mini"
                                    >
                                        <div
                                            v-for="(
                                                card, idx
                                            ) in p.devCards.filter(
                                                (c) =>
                                                    !c.played &&
                                                    c.type !== 'vp',
                                            )"
                                            :key="idx"
                                            class="mini-hand-item"
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
                                            {{
                                                card.type === "knight"
                                                    ? "⚔️"
                                                    : "📜"
                                            }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Action Log -->
                        <div class="action-log-card">
                            <div class="info-header">
                                <h2>Action Log</h2>
                            </div>
                            <div class="log-filters">
                                <button
                                    :class="{ active: logFilter === 'all' }"
                                    @click="logFilter = 'all'"
                                >
                                    All
                                </button>
                                <button
                                    :class="{ active: logFilter === 'dice' }"
                                    @click="logFilter = 'dice'"
                                >
                                    Dice
                                </button>
                                <button
                                    v-for="p in players"
                                    :key="p.id"
                                    :class="{ active: logFilter === p.id }"
                                    @click="logFilter = p.id"
                                >
                                    P{{ p.id }}
                                </button>
                            </div>
                            <div class="log-entries">
                                <div
                                    v-for="log in filteredLogs"
                                    :key="log.id"
                                    class="log-entry"
                                    :class="log.type"
                                >
                                    <span
                                        v-if="log.playerId !== null"
                                        class="log-color-dot"
                                        :style="{
                                            backgroundColor:
                                                players[log.playerId]?.color,
                                        }"
                                    ></span>
                                    <span class="log-turn"
                                        >T{{ log.turn }}</span
                                    >
                                    <span class="log-msg">{{
                                        log.message
                                    }}</span>
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
                                                players[userPlayerId]
                                                    ?.resources[res]
                                            }}</span
                                        ></span
                                    >
                                    <button
                                        class="adjust-btn-mini"
                                        @click="updateDiscard(res, 1)"
                                        :disabled="
                                            (resourcesToDiscard[res] || 0) >=
                                            (players[userPlayerId]?.resources[
                                                res
                                            ] || 0)
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
                                                ? getTradeRatio(
                                                      userPlayerId,
                                                      sellRes,
                                                  )
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
                                                    (players[userPlayerId]
                                                        ?.resources?.[res] ??
                                                        0) <
                                                    getTradeRatio(
                                                        userPlayerId,
                                                        res,
                                                    ),
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
                                                (p) => p.id !== userPlayerId,
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
            <!-- end game-content -->
            <!-- Trade Request Overlay -->

            <div
                v-if="
                    activeTradeRequest &&
                    activeTradeRequest.status === 'pending' &&
                    (activeTradeRequest.toId === userPlayerId ||
                        activeTradeRequest.fromId === userPlayerId)
                "
                class="setup-overlay"
            >
                <div class="setup-card trade-offer-modal">
                    <template v-if="activeTradeRequest.toId === userPlayerId">
                        <h2 class="setup-title">TRADE OFFER</h2>
                        <p class="setup-subtitle">
                            {{ players[activeTradeRequest.fromId]?.name }} wants
                            to trade
                        </p>
                        <div class="trade-visual-comparison">
                            <div class="trade-give">
                                <p>YOU GET</p>
                                <div class="trade-res-list">
                                    <template
                                        v-for="(
                                            val, res
                                        ) in activeTradeRequest.offer"
                                        :key="res"
                                    >
                                        <span
                                            v-if="(val || 0) > 0"
                                            class="trade-badge"
                                            >{{ resourceEmoji[res] }} x{{
                                                val
                                            }}</span
                                        >
                                    </template>
                                </div>
                            </div>
                            <div class="trade-dir">🔃</div>
                            <div class="trade-receive">
                                <p>YOU GIVE</p>
                                <div class="trade-res-list">
                                    <template
                                        v-for="(
                                            val, res
                                        ) in activeTradeRequest.request"
                                        :key="res"
                                    >
                                        <span
                                            v-if="(val || 0) > 0"
                                            class="trade-badge"
                                            >{{ resourceEmoji[res] }} x{{
                                                val
                                            }}</span
                                        >
                                    </template>
                                </div>
                            </div>
                        </div>
                        <div class="trade-actions-row">
                            <button
                                class="setup-btn highlight"
                                @click="handleAcceptTrade"
                            >
                                <span class="btn-main">ACCEPT</span>
                            </button>
                            <button
                                class="setup-btn"
                                @click="handleRejectTrade"
                            >
                                <span class="btn-main">REJECT</span>
                            </button>
                        </div>
                    </template>
                    <template v-else>
                        <h2 class="setup-title">OFFERING...</h2>
                        <p class="setup-subtitle">
                            Waiting for
                            {{
                                players[activeTradeRequest.toId as number]?.name
                            }}
                        </p>

                        <div class="loading-bar-container">
                            <div class="loading-bar-fill"></div>
                        </div>
                        <button class="setup-btn" @click="handleRejectTrade">
                            <span class="btn-main">CANCEL OFFER</span>
                        </button>
                    </template>
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

.game-container {
    display: flex;
    gap: 1.5rem;
    margin-top: 1rem;
    height: 85vh; /* Fixed height for the main container */
}

.board-wrapper {
    flex: 1;
    position: relative;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.game-info-side {
    width: 380px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
    overflow: hidden;
}

.player-resources {
    flex: 0 0 auto;
    max-height: 480px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 0.8rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    &::-webkit-scrollbar {
        width: 6px;
    }
}

.player-cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
    margin-top: 0.4rem;
}

.player-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 0.6rem;
    transition: all 0.3s;
    position: relative;
    display: flex;
    flex-direction: column;

    &.active {
        background: rgba(241, 196, 15, 0.08);
        border-color: rgba(241, 196, 15, 0.4);
        box-shadow: 0 0 10px rgba(241, 196, 15, 0.1);
    }
}

.player-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 0.4rem;

    .color-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .player-name {
        font-weight: bold;
        font-size: 0.75rem;
        flex-grow: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .award-badges {
        display: flex;
        gap: 2px;
    }

    .award-badge {
        font-size: 0.8rem;
    }

    .player-points {
        font-weight: bold;
        font-size: 0.75rem;
        color: #f1c40f;
        background: rgba(241, 196, 15, 0.1);
        padding: 1px 4px;
        border-radius: 3px;
        flex-shrink: 0;
    }
}

.resources-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3px;
}

.resource-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 2px;
    background: rgba(0, 0, 0, 0.2);
    padding: 2px;
    border-radius: 4px;

    .res-icon {
        font-size: 0.75rem;
    }
    .res-val {
        font-size: 0.7rem;
        font-weight: bold;
    }
}

.opponent-resources-summary {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.05);
    padding: 4px 8px;
    border-radius: 6px;
    margin: 4px 0;

    .res-icon {
        font-size: 1rem;
        filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.2));
    }
    .res-total-label {
        font-size: 0.7rem;
        color: #888;
        text-transform: uppercase;
    }
    .res-val {
        font-size: 0.85rem;
        font-weight: bold;
        color: #eee;
    }
}

.player-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.4rem;
    font-size: 0.65rem;
}

.card-count {
    color: #888;
    display: flex;
    align-items: center;
    gap: 2px;
}

.played-icons-mini {
    display: flex;
    gap: 1px;
}

.mini-card-icon {
    font-size: 0.75rem;
    opacity: 0.7;
}

.my-hand-mini {
    margin-top: 0.4rem;
    display: flex;
    gap: 2px;
    flex-wrap: wrap;
    padding-top: 3px;
    border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.mini-hand-item {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-size: 0.7rem;
    cursor: pointer;

    &.playable {
        background: #f1c40f;
        color: #1a1a1a;
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

.action-log-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    flex: 1; /* Take remaining space */
    min-height: 0; /* Important for flex child scroll */
}

.log-filters {
    flex: 0 0 auto;
    display: flex;
    gap: 4px;
    margin-bottom: 0.8rem;
    overflow-x: auto;
    padding-bottom: 4px;

    button {
        background: rgba(162, 114, 114, 0.05);
        border: none;
        border-radius: 4px;
        color: #888;
        padding: 2px 8px;
        font-size: 0.7rem;
        cursor: pointer;
        white-space: nowrap;

        &.active {
            background: #f1c40f;
            color: #1a1a1a;
            font-weight: bold;
        }
    }
}

.log-entries {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 4px;

    &::-webkit-scrollbar {
        width: 4px;
    }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
    }
}

.log-entry {
    font-size: 0.75rem;
    display: flex;
    gap: 8px;
    padding: 4px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.02);
    line-height: 1.4;

    .log-turn {
        color: #f1c40f;
        font-weight: bold;
        min-width: 24px;
    }

    .log-msg {
        color: #ccc;
    }

    &.dice {
        border-left: 2px solid #e74c3c;
    }
    &.build {
        border-left: 2px solid #2ecc71;
    }
    &.trade {
        border-left: 2px solid #3498db;
    }
    &.devCard {
        border-left: 2px solid #9b59b6;
    }
    &.award {
        border-left: 2px solid #f39c12;
    }
}

/* Costs Overlay Styles */
.costs-overlay {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(20, 20, 20, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 8px 12px;
    width: 130px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 100;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);

    &.expanded {
        width: 240px;
        padding: 15px;
    }

    .costs-overlay-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;

        .costs-title {
            font-weight: bold;
            font-size: 0.8rem;
            color: #f1c40f;
        }
        .costs-hint {
            font-size: 0.6rem;
            color: #666;
        }
    }

    .costs-grid {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .cost-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;

        .cost-label {
            color: #bbb;
            white-space: nowrap;
            display: none;
        }
        .cost-icons {
            letter-spacing: 2px;
        }
    }

    &.expanded .cost-label {
        display: block;
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

/* Multiplayer Styles */
.setup-divider {
    margin: 1.5rem 0;
    display: flex;
    align-items: center;
    color: #666;
    font-size: 0.8rem;
    font-weight: bold;
    &::before,
    &::after {
        content: "";
        flex: 1;
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 0 1rem;
    }
}

.mp-setup {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.mp-input {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.8rem 1rem;
    border-radius: 10px;
    color: white;
    width: 100%;
    text-align: center;
    font-size: 1rem;
    &:focus {
        outline: none;
        border-color: #4a90e2;
    }
}

.mp-actions {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
}

.join-area {
    display: flex;
    gap: 0.5rem;
    .join-input {
        flex: 1;
        font-family: monospace;
        letter-spacing: 2px;
        text-transform: uppercase;
    }
}

.mp-btn {
    padding: 0.8rem 1rem;
    .btn-main {
        font-size: 1rem;
    }
}

.error-msg {
    color: #e74c3c;
    font-size: 0.8rem;
    margin-top: 0.5rem;
}

.lobby-card {
    min-width: 400px;
}

.player-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    margin: 2rem 0;
}

.lobby-player {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    &.empty {
        opacity: 0.5;
        border-style: dashed;
    }
}

.player-color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    &.empty {
        background: #333;
    }
}

.player-name {
    font-weight: bold;
    flex: 1;
    text-align: left;
}

.you-badge {
    font-size: 0.6rem;
    background: #2ecc71;
    color: #1a1a2e;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-weight: 900;
}

.lobby-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    .setup-btn {
        flex: 1;
        &.primary {
            background: #f1c40f;
            border-color: #f1c40f;
            .btn-main {
                color: #1a1a2e;
            }
        }
    }
}

.ai-player {
    background: rgba(52, 152, 219, 0.1);
    border-color: rgba(52, 152, 219, 0.2);
}

.ai-remove-btn {
    background: transparent;
    border: none;
    color: #e74c3c;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 0.5rem;
    line-height: 1;
    &:hover {
        transform: scale(1.2);
    }
}

.add-ai-slot {
    border-style: dashed;
    justify-content: center;
    background: rgba(255, 255, 255, 0.02);
}

.add-ai-btn {
    background: transparent;
    border: none;
    color: #4a90e2;
    font-weight: bold;
    cursor: pointer;
    width: 100%;
    height: 100%;
    &:hover {
        background: rgba(46, 204, 113, 0.2);
        transform: scale(1.05);
    }
}

.sync-pulse-dot {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 10px;
    height: 10px;
    background: #2ecc71;
    border-radius: 50%;
    box-shadow: 0 0 10px #2ecc71;
    animation: syncPulse 1.5s infinite;
}

@keyframes syncPulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.5);
        opacity: 0.5;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Log Improvements */
.log-color-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-right: 4px;
}

/* Feedback Toast */
.global-feedback-toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    padding: 0.8rem 1.5rem;
    border-radius: 50px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    font-weight: bold;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.3s ease;
}
.fade-slide-enter-from {
    opacity: 0;
    transform: translate(-50%, 20px);
}
.fade-slide-leave-to {
    opacity: 0;
    transform: translate(-50%, -20px);
}

/* Trade Offer Modal Styles */
.trade-offer-modal {
    max-width: 500px;
    border-color: #f1c40f !important;
    background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
}

.trade-visual-comparison {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    margin: 2rem 0;
    background: rgba(0, 0, 0, 0.2);
    padding: 1.5rem;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.trade-give,
.trade-receive {
    flex: 1;
    p {
        font-size: 0.7rem;
        color: #888;
        font-weight: bold;
        margin-bottom: 0.8rem;
        text-transform: uppercase;
    }
}

.trade-res-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
}

.trade-badge {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.4rem 0.8rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: bold;
    border: 1px solid rgba(255, 255, 255, 0.1);
    white-space: nowrap;
}

.trade-dir {
    font-size: 1.5rem;
    color: #f1c40f;
    animation: pulse 2s infinite;
}

.trade-actions-row {
    display: flex;
    gap: 1rem;
    justify-content: center;
    .setup-btn {
        flex: 1;
    }
}

.loading-bar-container {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
    margin-bottom: 2rem;
    overflow: hidden;
}

.loading-bar-fill {
    height: 100%;
    background: #f1c40f;
    width: 30%;
    border-radius: 2px;
    animation: loadingSlide 2s infinite ease-in-out;
}

@keyframes loadingSlide {
    0% {
        transform: translateX(-100%);
    }
    100% {
        transform: translateX(330%);
    }
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.1);
        opacity: 0.7;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Connection Status Indicator */
.connection-status {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(46, 204, 113, 0.1);
    padding: 4px 10px;
    border-radius: 50px;
    border: 1px solid rgba(46, 204, 113, 0.2);
    color: #2ecc71;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.5px;
    margin-left: 8px;
    transition: all 0.3s ease;

    .status-dot {
        width: 6px;
        height: 6px;
        background: #2ecc71;
        border-radius: 50%;
        box-shadow: 0 0 8px #2ecc71;
        animation: pulse-green 2s infinite;
    }

    &.offline {
        background: rgba(231, 76, 60, 0.1);
        border-color: rgba(231, 76, 60, 0.2);
        color: #e74c3c;

        .status-dot {
            background: #e74c3c;
            box-shadow: 0 0 8px #e74c3c;
            animation: pulse-red 2s infinite;
        }
    }
}

.sync-pulse-dot {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 8px;
    height: 8px;
    background: #3498db;
    border-radius: 50%;
    border: 2px solid #1a1a2e;
    animation: sync-pulse 1s infinite;
}

@keyframes pulse-green {
    0% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.2);
        opacity: 0.7;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes pulse-red {
    0% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.2);
        opacity: 0.5;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes sync-pulse {
    0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7);
    }
    70% {
        transform: scale(1.1);
        box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
    }
    100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
    }
}

.sync-btn {
    position: relative;
    background: rgba(52, 152, 219, 0.1);
    border-color: rgba(52, 152, 219, 0.2);
    color: #3498db;

    &:hover {
        background: rgba(52, 152, 219, 0.2);
        border-color: #3498db;
    }
}
</style>
