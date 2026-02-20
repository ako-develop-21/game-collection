<script setup lang="ts">
import { computed } from "vue";
import type { Hex, Node, Edge, Player, Port } from "../../composables/useCatan";

const props = defineProps<{
    hexes: Hex[];
    nodes: Record<string, Node>;
    edges: Record<string, Edge>;
    players: Player[];
    ports: Port[];
}>();

const emit = defineEmits<{
    (e: "node-click", nodeId: string): void;
    (e: "edge-click", edgeId: string): void;
    (e: "hex-click", hexId: number): void;
}>();

const HEX_SIZE = 50;

const getHexPos = (q: number, r: number) => {
    const x = HEX_SIZE * ((3 / 2) * q);
    const y = HEX_SIZE * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
    return { x, y };
};

const resourceEmoji: Record<string, string> = {
    wood: "🌲",
    brick: "🧱",
    wool: "🐑",
    wheat: "🌾",
    ore: "🏔️",
    any: "⚓",
};

const getPortLabelPos = (port: Port) => {
    const n1 = props.nodes[port.nodeIds[0]!];
    const n2 = props.nodes[port.nodeIds[1]!];
    if (!n1 || !n2) return { x: 0, y: 0 };

    const hPos = getHexPos(port.q, port.r);
    const midX = (n1.x + n2.x) / 2;
    const midY = (n1.y + n2.y) / 2;

    const dx = midX - hPos.x;
    const dy = midY - hPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;

    return { x: midX + nx * 25, y: midY + ny * 25 };
};

const HEX_POINTS = computed(() => {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i;
        const angle_rad = (Math.PI / 180) * angle_deg;
        points.push(
            `${HEX_SIZE * Math.cos(angle_rad)},${HEX_SIZE * Math.sin(angle_rad)}`,
        );
    }
    return points.join(" ");
});

const getResourceColor = (resource: string) => {
    switch (resource) {
        case "wood":
            return "#27ae60";
        case "brick":
            return "#e67e22";
        case "wool":
            return "#ccff33";
        case "wheat":
            return "#f1c40f";
        case "ore":
            return "#95a5a6";
        case "desert":
            return "#d35400";
        default:
            return "#7f8c8d";
    }
};

const getPlayerColor = (playerId: number | null) => {
    if (playerId === null) return "transparent";
    return props.players.find((p) => p.id === playerId)?.color || "#ccc";
};
</script>

<template>
    <div class="hex-board-container">
        <svg viewBox="-300 -300 600 600" class="catan-svg">
            <!-- Hex Tiles -->
            <g
                v-for="hex in hexes"
                :key="hex.id"
                :transform="`translate(${getHexPos(hex.q, hex.r).x}, ${getHexPos(hex.q, hex.r).y})`"
            >
                <polygon
                    :points="HEX_POINTS"
                    :fill="getResourceColor(hex.resource)"
                    class="hex-polygon"
                />
                <g v-if="hex.number" class="number-chip">
                    <circle
                        r="20"
                        fill="white"
                        stroke="#333"
                        stroke-width="1"
                    />
                    <text
                        text-anchor="middle"
                        dominant-baseline="central"
                        :fill="
                            hex.number === 6 || hex.number === 8
                                ? 'red'
                                : 'black'
                        "
                        font-weight="bold"
                        font-size="20px"
                    >
                        {{ hex.number }}
                    </text>
                </g>
                <!-- Robber -->
                <circle
                    v-if="hex.hasRobber"
                    r="10"
                    fill="#333"
                    stroke="white"
                    stroke-width="2"
                    class="robber-token"
                />
                <!-- Clickable Area for Robber Movement -->
                <polygon
                    :points="HEX_POINTS"
                    fill="transparent"
                    class="clickable-overlay"
                    @click="emit('hex-click', hex.id)"
                />
            </g>

            <!-- Ports (Sea Side Labels) -->
            <g
                v-for="(port, idx) in ports"
                :key="'port-' + idx"
                :transform="`translate(${getPortLabelPos(port).x}, ${getPortLabelPos(port).y})`"
            >
                <circle
                    r="15"
                    fill="rgba(10, 10, 30, 0.8)"
                    stroke="#f1c40f"
                    stroke-width="1"
                />
                <text
                    text-anchor="middle"
                    dominant-baseline="central"
                    font-size="14px"
                    y="-2"
                >
                    {{ resourceEmoji[port.type] }}
                </text>
                <text
                    y="10"
                    text-anchor="middle"
                    fill="#f1c40f"
                    font-size="8px"
                    font-weight="bold"
                >
                    {{ port.type === "any" ? "3:1" : "2:1" }}
                </text>
            </g>

            <!-- Edges (Roads) -->
            <g
                v-for="edge in edges"
                :key="edge.id"
                class="edge-group"
                @click="emit('edge-click', edge.id)"
            >
                <line
                    v-if="
                        nodes[edge.id.split('--')[0] ?? ''] &&
                        nodes[edge.id.split('--')[1] ?? '']
                    "
                    :x1="nodes[edge.id.split('--')[0] ?? '']?.x"
                    :y1="nodes[edge.id.split('--')[0] ?? '']?.y"
                    :x2="nodes[edge.id.split('--')[1] ?? '']?.x"
                    :y2="nodes[edge.id.split('--')[1] ?? '']?.y"
                    stroke-width="12"
                    stroke="transparent"
                    class="clickable-overlay"
                />
                <line
                    v-if="
                        nodes[edge.id.split('--')[0] ?? ''] &&
                        nodes[edge.id.split('--')[1] ?? '']
                    "
                    :x1="nodes[edge.id.split('--')[0] ?? '']?.x"
                    :y1="nodes[edge.id.split('--')[0] ?? '']?.y"
                    :x2="nodes[edge.id.split('--')[1] ?? '']?.x"
                    :y2="nodes[edge.id.split('--')[1] ?? '']?.y"
                    :stroke="
                        edge.road
                            ? getPlayerColor(edge.road.playerId)
                            : 'rgba(255,255,255,0.05)'
                    "
                    :stroke-width="edge.road ? 6 : 4"
                    class="road-line"
                    :class="{ built: !!edge.road }"
                />
            </g>

            <!-- Nodes (Settlements/Cities) -->
            <g
                v-for="node in nodes"
                :key="node.id"
                class="node-group"
                @click="emit('node-click', node.id)"
            >
                <circle
                    :cx="node.x"
                    :cy="node.y"
                    r="12"
                    fill="transparent"
                    class="clickable-overlay"
                />
                <g
                    v-if="node.building"
                    :transform="`translate(${node.x}, ${node.y})`"
                >
                    <rect
                        v-if="node.building.type === 'city'"
                        x="-8"
                        y="-8"
                        width="16"
                        height="16"
                        :fill="getPlayerColor(node.building.playerId)"
                        stroke="white"
                        stroke-width="1"
                    />
                    <circle
                        v-else
                        r="7"
                        :fill="getPlayerColor(node.building.playerId)"
                        stroke="white"
                        stroke-width="1"
                    />
                </g>
                <g v-else>
                    <!-- Port Point Indicator (Subtle ring) -->
                    <g
                        v-if="node.port"
                        :transform="`translate(${node.x}, ${node.y})`"
                    >
                        <circle
                            r="6"
                            fill="transparent"
                            stroke="#f1c40f"
                            stroke-width="2"
                            stroke-dasharray="2 1"
                        />
                    </g>
                    <circle
                        v-else
                        :cx="node.x"
                        :cy="node.y"
                        r="4"
                        fill="rgba(255,255,255,0.1)"
                        class="empty-node"
                    />
                </g>
            </g>
        </svg>
    </div>
</template>

<style scoped lang="scss">
.hex-board-container {
    width: 100%;
    max-width: 600px;
    background: #1a1a2e;
    border-radius: 24px;
    padding: 10px;
}

.catan-svg {
    width: 100%;
    height: auto;
    overflow: visible;
}

.hex-polygon {
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 2;
    transition: all 0.2s;
}

.clickable-overlay {
    cursor: pointer;
    pointer-events: all;
}

.road-line {
    transition: all 0.2s;
    pointer-events: none;
    stroke-linecap: round;
}

.edge-group:hover .road-line:not(.built) {
    stroke: rgba(255, 255, 255, 0.3);
}

.node-group:hover .empty-node {
    fill: rgba(255, 255, 255, 0.5);
    r: 6;
}

.empty-node {
    transition: all 0.2s;
    pointer-events: none;
}
</style>
