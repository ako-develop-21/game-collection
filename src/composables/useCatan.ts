import { ref } from "vue";

export type ResourceType =
    | "wood"
    | "brick"
    | "wool"
    | "wheat"
    | "ore"
    | "desert";

export type DevCardType =
    | "knight"
    | "vp"
    | "road_building"
    | "monopoly"
    | "year_of_plenty";

export interface DevelopmentCard {
    type: DevCardType;
    played: boolean;
    turnBought: number;
}

export type AIPersona = "LAND" | "CITY" | "BALANCE";

export interface Player {
    id: number;
    name: string;
    color: string;
    resources: Record<ResourceType, number>;
    points: number;
    devCards: DevelopmentCard[];
    armySize: number;
    persona: AIPersona;
}

export interface Hex {
    id: number;
    q: number;
    r: number;
    s: number;
    resource: ResourceType;
    number: number | null;
    hasRobber: boolean;
}

export interface Node {
    id: string; // Format: "q,r,type"
    q: number;
    r: number;
    x: number;
    y: number;
    building: {
        type: "settlement" | "city";
        playerId: number;
    } | null;
    port: ResourceType | "any" | null;
}

export interface Edge {
    id: string; // Format: "nodeId1-nodeId2"
    road: {
        playerId: number;
    } | null;
}

export interface Port {
    type: ResourceType | "any";
    nodeIds: string[];
    q: number;
    r: number;
}

export type TurnPhase = "ready" | "rolled" | "robber" | "discarding";

export function useCatan() {
    const hexes = ref<Hex[]>([]);
    const nodes = ref<Record<string, Node>>({});
    const edges = ref<Record<string, Edge>>({});
    const players = ref<Player[]>([]);
    const currentPlayerId = ref(0);
    const dice = ref<[number, number]>([1, 1]);
    const gameStarted = ref(false);
    const turnPhase = ref<TurnPhase>("ready");
    const setupPhase = ref<"none" | "first" | "second">("none");
    const setupStep = ref<"settlement" | "road">("settlement");
    const winnerId = ref<number | null>(null);
    const devCardDeck = ref<DevCardType[]>([]);
    const turnCount = ref(1);
    const lastSettlementNodeId = ref<string | null>(null);
    const ports = ref<Port[]>([]);
    const isContinuationMode = ref(false);
    const discardingPlayers = ref<number[]>([]);
    const roadBuildingMovesLeft = ref(0);
    const awardHolders = ref<{
        longestRoad: { playerId: number | null; count: number };
        largestArmy: { playerId: number | null; count: number };
    }>({
        longestRoad: { playerId: null, count: 0 },
        largestArmy: { playerId: null, count: 0 },
    });

    const ALL_PLAYERS: Player[] = [
        {
            id: 0,
            name: "You",
            color: "#e74c3c",
            resources: {
                wood: 0,
                brick: 0,
                wool: 0,
                wheat: 0,
                ore: 0,
                desert: 0,
            },
            points: 0,
            devCards: [],
            armySize: 0,
            persona: "BALANCE",
        },
        {
            id: 1,
            name: "AI 1",
            color: "#3498db",
            resources: {
                wood: 0,
                brick: 0,
                wool: 0,
                wheat: 0,
                ore: 0,
                desert: 0,
            },
            points: 0,
            devCards: [],
            armySize: 0,
            persona: "LAND",
        },
        {
            id: 2,
            name: "AI 2",
            color: "#2ecc71",
            resources: {
                wood: 0,
                brick: 0,
                wool: 0,
                wheat: 0,
                ore: 0,
                desert: 0,
            },
            points: 0,
            devCards: [],
            armySize: 0,
            persona: "CITY",
        },
        {
            id: 3,
            name: "AI 3",
            color: "#f1c40f",
            resources: {
                wood: 0,
                brick: 0,
                wool: 0,
                wheat: 0,
                ore: 0,
                desert: 0,
            },
            points: 0,
            devCards: [],
            armySize: 0,
            persona: "BALANCE",
        },
    ];

    const resourceTypes: ResourceType[] = [
        "wood",
        "wood",
        "wood",
        "wood",
        "wool",
        "wool",
        "wool",
        "wool",
        "wheat",
        "wheat",
        "wheat",
        "wheat",
        "brick",
        "brick",
        "brick",
        "ore",
        "ore",
        "ore",
        "desert",
    ];

    const hexToNodes = new Map<number, string[]>();
    const numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

    const COSTS: Record<string, Record<ResourceType, number>> = {
        road: { wood: 1, brick: 1, wool: 0, wheat: 0, ore: 0, desert: 0 },
        settlement: { wood: 1, brick: 1, wool: 1, wheat: 1, ore: 0, desert: 0 },
        city: { wood: 0, brick: 0, wool: 0, wheat: 2, ore: 3, desert: 0 },
        devCard: { wood: 0, brick: 0, wool: 1, wheat: 1, ore: 1, desert: 0 },
    };

    const HEX_SIZE = 50;

    const PERSONA_WEIGHTS: Record<AIPersona, Record<ResourceType, number>> = {
        LAND: {
            wood: 1.3,
            brick: 1.3,
            wool: 1.0,
            wheat: 1.0,
            ore: 0.8,
            desert: 0,
        },
        CITY: {
            wood: 0.8,
            brick: 0.8,
            wool: 1.0,
            wheat: 1.2,
            ore: 1.4,
            desert: 0,
        },
        BALANCE: {
            wood: 1.0,
            brick: 1.0,
            wool: 1.0,
            wheat: 1.0,
            ore: 1.0,
            desert: 0,
        },
    };

    const PIP_MAP: Record<number, number> = {
        2: 1,
        12: 1,
        3: 2,
        11: 2,
        4: 3,
        10: 3,
        5: 4,
        9: 4,
        6: 5,
        8: 5,
    };

    const initGame = (playerCount: number) => {
        // Shuffled personas for AI players to ensure uniqueness
        const aiPersonas: AIPersona[] = ["LAND", "CITY", "BALANCE"];
        for (let i = aiPersonas.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = aiPersonas[i]!;
            aiPersonas[i] = aiPersonas[j]!;
            aiPersonas[j] = temp;
        }

        players.value = ALL_PLAYERS.slice(0, playerCount).map((p) => {
            let persona: AIPersona = "BALANCE";
            if (p.id === 0) {
                persona = "BALANCE";
            } else {
                // Assign from shuffled list (AI 1 gets index 0, AI 2 gets index 1, etc.)
                persona = aiPersonas[p.id - 1] || "BALANCE";
            }

            return {
                ...p,
                resources: {
                    wood: 0,
                    brick: 0,
                    wool: 0,
                    wheat: 0,
                    ore: 0,
                    desert: 0,
                },
                points: 0,
                devCards: [],
                armySize: 0,
                persona,
            };
        });
        currentPlayerId.value = 0;
        gameStarted.value = true;
        setupPhase.value = "first";
        setupStep.value = "settlement";
        ports.value = [];
        dice.value = [1, 1];
        turnPhase.value = "ready";
        winnerId.value = null;
        isContinuationMode.value = false;
        roadBuildingMovesLeft.value = 0;
        turnCount.value = 1;
        awardHolders.value = {
            longestRoad: { playerId: null, count: 0 },
            largestArmy: { playerId: null, count: 0 },
        };
        generateBoard();
        initDevCardDeck();
    };

    const continueGame = () => {
        winnerId.value = null;
        isContinuationMode.value = true;
    };

    const initDevCardDeck = () => {
        const deck: DevCardType[] = [
            ...Array(14).fill("knight"),
            ...Array(5).fill("vp"),
            ...Array(2).fill("road_building"),
            ...Array(2).fill("monopoly"),
            ...Array(2).fill("year_of_plenty"),
        ];
        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = deck[i]!;
            deck[i] = deck[j]!;
            deck[j] = temp;
        }
        devCardDeck.value = deck;
    };

    const buyDevelopmentCard = (playerId: number) => {
        if (!canAfford(playerId, "devCard")) return false;
        if (devCardDeck.value.length === 0) return false;

        deductCost(playerId, "devCard");
        const type = devCardDeck.value.pop()!;
        const player = players.value.find((p) => p.id === playerId);
        if (player) {
            player.devCards.push({
                type,
                played: false,
                turnBought: turnCount.value,
            });
            // VP cards points are calculated dynamically in calculateTotalPoints
            checkWinner();
        }
        return true;
    };

    const playDevelopmentCard = (
        playerId: number,
        cardIndex: number,
        data?: any,
    ) => {
        const player = players.value.find((p) => p.id === playerId);
        if (!player) return false;
        const card = player.devCards[cardIndex];
        if (!card || card.played || card.turnBought === turnCount.value)
            return false;
        // VP cards cannot be "played" manually usually
        if (card.type === "vp") return false;

        card.played = true;

        switch (card.type) {
            case "knight":
                player.armySize++;
                updateAwards();
                turnPhase.value = "robber"; // Activate robber
                break;
            case "road_building":
                roadBuildingMovesLeft.value = 2;
                break;
            case "year_of_plenty":
                if (data?.resources) {
                    data.resources.forEach(
                        (r: ResourceType) =>
                            player.resources[r as ResourceType]++,
                    );
                }
                break;
            case "monopoly":
                if (data?.resource) {
                    const res = data.resource as ResourceType;
                    players.value.forEach((p) => {
                        if (p.id !== playerId) {
                            const amount = p.resources[res];
                            p.resources[res] = 0;
                            player.resources[res] += amount;
                        }
                    });
                }
                break;
        }
        return true;
    };

    const generateBoard = () => {
        const shuffledResources = [...resourceTypes].sort(
            () => Math.random() - 0.5,
        );
        // Make sure desert is not on a 6 or 8 if possible? (Actually numbers are placed skipping desert)

        // Original simplified logic:
        const shuffledNumbers = [...numbers].sort(() => Math.random() - 0.5);

        const newHexes: Hex[] = [];
        const newNodes: Record<string, Node> = {};
        const newEdges: Record<string, Edge> = {};
        let numberIdx = 0;
        let id = 0;

        const getHexPos = (q: number, r: number) => {
            const x = HEX_SIZE * ((3 / 2) * q);
            const y = HEX_SIZE * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
            return { x, y };
        };

        const addNodeAtAngle = (
            hx: number,
            hy: number,
            q: number,
            r: number,
            angleDeg: number,
        ) => {
            const angleRad = (Math.PI / 180) * angleDeg;
            const vx = hx + HEX_SIZE * Math.cos(angleRad);
            const vy = hy + HEX_SIZE * Math.sin(angleRad);

            // Use coordinates to create a shared ID. Rounding to handle precision issues.
            const roundedX = Math.round(vx * 100) / 100;
            const roundedY = Math.round(vy * 100) / 100;
            const nodeId = `v_${roundedX}_${roundedY}`;

            if (!newNodes[nodeId]) {
                newNodes[nodeId] = {
                    id: nodeId,
                    q,
                    r,
                    x: vx,
                    y: vy,
                    building: null,
                    port: null,
                };
            }
            return nodeId;
        };

        const addEdge = (n1: string, n2: string) => {
            const edgeId = [n1, n2].sort().join("--");
            if (!newEdges[edgeId]) {
                newEdges[edgeId] = { id: edgeId, road: null };
            }
            return edgeId;
        };

        for (let q = -2; q <= 2; q++) {
            for (let r = Math.max(-2, -q - 2); r <= Math.min(2, -q + 2); r++) {
                const s = -q - r;
                const resource = shuffledResources[id]!;
                const num =
                    resource === "desert"
                        ? null
                        : shuffledNumbers[numberIdx++]!;
                const hasRobber = resource === "desert";

                const hex: Hex = {
                    id: id++,
                    q,
                    r,
                    s,
                    resource,
                    number: num,
                    hasRobber,
                };
                newHexes.push(hex);

                const { x: hx, y: hy } = getHexPos(q, r);

                // Generate all 6 vertices
                const hexNodes: string[] = [];
                for (let i = 0; i < 6; i++) {
                    hexNodes.push(addNodeAtAngle(hx, hy, q, r, i * 60));
                }

                hexToNodes.set(hex.id, hexNodes);

                // Add 6 edges connecting adjacent vertices
                for (let i = 0; i < 6; i++) {
                    addEdge(hexNodes[i]!, hexNodes[(i + 1) % 6]!);
                }
            }
        }

        const portDefinitions: {
            q: number;
            r: number;
            type: ResourceType | "any";
            nodes: number[];
        }[] = [
            { q: 1, r: -2, type: "brick", nodes: [5, 0] }, // 4列1段 (北東), 右上の辺
            { q: 2, r: -1, type: "wood", nodes: [5, 0] }, // 5列2段 (東), 右上の辺
            { q: 1, r: 1, type: "wheat", nodes: [1, 2] }, // 4列4段 (南東), 下の辺
            { q: -1, r: 2, type: "ore", nodes: [1, 2] }, // 2列4段 (南西), 下の辺
            { q: -2, r: 1, type: "wool", nodes: [3, 4] }, // 1列2段 (西), 左上の辺
            { q: -2, r: 2, type: "any", nodes: [2, 3] }, // 1列3段 (南西), 左下の辺
            { q: -1, r: -1, type: "any", nodes: [3, 4] }, // 2列1段 (北西), 左上の辺
            { q: 0, r: -2, type: "any", nodes: [4, 5] }, // 3列1段 (北), 上の辺
            { q: 2, r: 0, type: "any", nodes: [0, 1] }, // 5列3段 (南東), 右下の辺
        ];

        const newPorts: Port[] = [];
        portDefinitions.forEach((pd) => {
            const hex = newHexes.find((h) => h.q === pd.q && h.r === pd.r);
            if (hex) {
                const hexNodes = hexToNodes.get(hex.id);
                if (hexNodes) {
                    const nodeIds: string[] = [];
                    pd.nodes.forEach((idx) => {
                        const nodeId = hexNodes[idx];
                        if (nodeId && newNodes[nodeId]) {
                            newNodes[nodeId].port = pd.type;
                            nodeIds.push(nodeId);
                        }
                    });
                    newPorts.push({ type: pd.type, nodeIds, q: pd.q, r: pd.r });
                }
            }
        });
        ports.value = newPorts;
        hexes.value = newHexes;
        nodes.value = newNodes;
        edges.value = newEdges;
    };

    const canAfford = (playerId: number, type: string) => {
        const player = players.value.find((p) => p.id === playerId);
        const cost = COSTS[type];
        if (!player || !cost) return false;
        return (Object.entries(cost) as [ResourceType, number][]).every(
            ([res, val]) => player.resources[res] >= val,
        );
    };

    const deductCost = (playerId: number, type: string) => {
        const player = players.value.find((p) => p.id === playerId);
        const cost = COSTS[type];
        if (!player || !cost) return;
        (Object.entries(cost) as [ResourceType, number][]).forEach(
            ([res, val]) => {
                player.resources[res] -= val;
            },
        );
    };

    const checkWinner = () => {
        if (isContinuationMode.value) return;
        const winner = players.value.find(
            (p) => calculateTotalPoints(p.id) >= 10,
        );
        if (winner) {
            winnerId.value = winner.id;
        }
    };

    const calculateTotalPoints = (playerId: number) => {
        const player = players.value.find((p) => p.id === playerId);
        if (!player) return 0;
        let total = calculatePublicPoints(playerId);
        // Add hidden VP from development cards
        player.devCards.forEach((c) => {
            if (c.type === "vp") total++;
        });
        return total;
    };

    const calculatePublicPoints = (playerId: number) => {
        const player = players.value.find((p) => p.id === playerId);
        if (!player) return 0;
        let total = player.points; // Points from buildings (settlement=1, city=2 total)
        if (awardHolders.value.longestRoad.playerId === playerId) total += 2;
        if (awardHolders.value.largestArmy.playerId === playerId) total += 2;
        return total;
    };

    const getDominanceScore = (playerId: number) => {
        const p = players.value.find((player) => player.id === playerId);
        if (!p) return 0;
        const points = calculatePublicPoints(playerId);
        const cities = Object.values(nodes.value).filter(
            (n) =>
                n.building?.type === "city" && n.building.playerId === playerId,
        ).length;
        const resources = Object.values(p.resources).reduce((a, b) => a + b, 0);
        const devCards = p.devCards.filter((c) => !c.played).length;

        // Weighted score to represent spec priority: Points > Cities > Resources > Cards
        return points * 1000 + cities * 100 + resources * 10 + devCards;
    };

    const updateAwards = () => {
        // Largest Army
        let currentLargestArmy = awardHolders.value.largestArmy;
        players.value.forEach((p) => {
            if (p.armySize >= 3 && p.armySize > currentLargestArmy.count) {
                currentLargestArmy = { playerId: p.id, count: p.armySize };
            }
        });
        awardHolders.value.largestArmy = currentLargestArmy;

        // Longest Road
        let currentRoadHolder = awardHolders.value.longestRoad.playerId;
        let bestRoadLen = 0;
        const roadLengths = players.value.map((p) => ({
            id: p.id,
            len: calculateLongestRoad(p.id),
        }));

        roadLengths.forEach((r) => {
            if (r.len > bestRoadLen) bestRoadLen = r.len;
        });

        if (bestRoadLen < 5) {
            awardHolders.value.longestRoad = { playerId: null, count: 0 };
        } else {
            const topPlayers = roadLengths.filter((r) => r.len === bestRoadLen);
            if (topPlayers.length === 1) {
                awardHolders.value.longestRoad = {
                    playerId: topPlayers[0]!.id,
                    count: bestRoadLen,
                };
            } else {
                // Tie
                const holderStillInTop = topPlayers.find(
                    (tp) => tp.id === currentRoadHolder,
                );
                if (holderStillInTop) {
                    awardHolders.value.longestRoad = {
                        playerId: currentRoadHolder,
                        count: bestRoadLen,
                    };
                } else {
                    // Current holder is no longer the longest, and there's a tie for new longest.
                    // According to Catan Alamanac: "the award is set aside and no one receives it"
                    awardHolders.value.longestRoad = {
                        playerId: null,
                        count: bestRoadLen,
                    };
                }
            }
        }

        checkWinner();
    };

    const calculateLongestRoad = (playerId: number): number => {
        const playerEdges = Object.values(edges.value).filter(
            (e) => e.road?.playerId === playerId,
        );
        if (playerEdges.length === 0) return 0;

        let maxLen = 0;
        const edgeIds = playerEdges.map((e) => e.id);

        const getNeighbors = (edgeId: string) => {
            const [n1, n2] = edgeId.split("--");
            const neighbors: string[] = [];

            // Check node 1
            const node1 = nodes.value[n1!];
            if (
                node1 &&
                (node1.building === null ||
                    node1.building.playerId === playerId)
            ) {
                playerEdges.forEach((e) => {
                    if (
                        e.id !== edgeId &&
                        e.id.includes(n1!) &&
                        !neighbors.includes(e.id)
                    ) {
                        neighbors.push(e.id);
                    }
                });
            }

            // Check node 2
            const node2 = nodes.value[n2!];
            if (
                node2 &&
                (node2.building === null ||
                    node2.building.playerId === playerId)
            ) {
                playerEdges.forEach((e) => {
                    if (
                        e.id !== edgeId &&
                        e.id.includes(n2!) &&
                        !neighbors.includes(e.id)
                    ) {
                        neighbors.push(e.id);
                    }
                });
            }
            return neighbors;
        };

        const dfs = (edgeId: string, visited: Set<string>): number => {
            visited.add(edgeId);
            let currentMax = 0;
            const neighbors = getNeighbors(edgeId);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    currentMax = Math.max(
                        currentMax,
                        dfs(neighbor, new Set(visited)),
                    );
                }
            }
            return 1 + currentMax;
        };

        edgeIds.forEach((id) => {
            maxLen = Math.max(maxLen, dfs(id, new Set()));
        });

        return maxLen;
    };

    const buildRoad = (edgeId: string, playerId: number, free = false) => {
        const isSetup = setupPhase.value !== "none";
        if (!free && !isSetup && !canAfford(playerId, "road")) return false;
        const edge = edges.value[edgeId];
        if (!edge || edge.road) return false;

        // Validation: Connected to your building or road
        const nodesInEdge = edgeId.split("--");
        const hasConnection =
            Object.values(edges.value).some(
                (e) =>
                    e.road?.playerId === playerId &&
                    nodesInEdge.some((nid) => e.id.includes(nid)),
            ) ||
            nodesInEdge.some((nid) => {
                const node = nodes.value[nid];
                return node?.building?.playerId === playerId;
            });

        if (!free && !isSetup && !hasConnection) return false;

        // Setup specific: Must be connected to the JUST placed settlement
        if (isSetup && setupStep.value === "road") {
            if (lastSettlementNodeId.value) {
                const isAdjacent = edgeId.includes(lastSettlementNodeId.value);
                if (!isAdjacent) return false;
            }
        }

        if (!free && !isSetup) deductCost(playerId, "road");
        edge.road = { playerId };
        updateAwards();

        if (isSetup && setupStep.value === "road") {
            lastSettlementNodeId.value = null; // Reset after use
            nextTurn();
        }
        return true;
    };

    const buildSettlement = (
        nodeId: string,
        playerId: number,
        free = false,
    ) => {
        const isSetup = setupPhase.value !== "none";
        if (!free && !isSetup && !canAfford(playerId, "settlement"))
            return false;
        const node = nodes.value[nodeId];
        if (!node || node.building) return false;

        // Distance rule: No building in adjacent nodes
        const isTooClose = Object.keys(edges.value).some((eid) => {
            if (eid.includes(nodeId)) {
                const otherNodeId = eid.split("--").find((id) => id !== nodeId);
                if (otherNodeId) {
                    const otherNode = nodes.value[otherNodeId];
                    return otherNode && otherNode.building !== null;
                }
            }
            return false;
        });
        if (isTooClose) return false;

        // Connection rule: Must be connected to your road (except during setup)
        const hasRoad = Object.values(edges.value).some(
            (e) => e.road?.playerId === playerId && e.id.includes(nodeId),
        );
        if (!free && !isSetup && !hasRoad) return false;

        if (!free && !isSetup) deductCost(playerId, "settlement");
        node.building = { type: "settlement", playerId };
        const player = players.value.find((p) => p.id === playerId);
        if (player) {
            player.points += 1;

            // Award resources on second placement
            if (setupPhase.value === "second") {
                hexes.value.forEach((hex) => {
                    const nodesInHex = hexToNodes.get(hex.id);
                    if (
                        nodesInHex &&
                        nodesInHex.includes(nodeId) &&
                        hex.resource !== "desert"
                    ) {
                        player.resources[hex.resource] += 1;
                    }
                });
            }

            checkWinner();
        }

        if (isSetup && setupStep.value === "settlement") {
            lastSettlementNodeId.value = nodeId;
            setupStep.value = "road";
        }

        return true;
    };

    const buildCity = (nodeId: string, playerId: number) => {
        if (setupPhase.value !== "none") return false; // Cannot build city in setup
        if (!canAfford(playerId, "city")) return false;
        const node = nodes.value[nodeId];
        if (
            !node ||
            !node.building ||
            node.building.type !== "settlement" ||
            node.building.playerId !== playerId
        )
            return false;

        deductCost(playerId, "city");
        node.building = { type: "city", playerId };
        const player = players.value.find((p) => p.id === playerId);
        if (player) {
            player.points += 1; // Total 2
            checkWinner();
        }
        return true;
    };

    const nextTurn = () => {
        if (setupPhase.value === "none") {
            currentPlayerId.value =
                (currentPlayerId.value + 1) % players.value.length;
            turnPhase.value = "ready";
            turnCount.value++; // Increment turn counter to track card purchase turn
        } else {
            // Setup phase logic (Snake order)
            const count = players.value.length;
            setupStep.value = "settlement";

            if (setupPhase.value === "first") {
                if (currentPlayerId.value < count - 1) {
                    currentPlayerId.value++;
                } else {
                    setupPhase.value = "second";
                    // Stay on the same player (last player goes twice)
                }
            } else if (setupPhase.value === "second") {
                if (currentPlayerId.value > 0) {
                    currentPlayerId.value--;
                } else {
                    setupPhase.value = "none";
                    turnPhase.value = "ready";
                    currentPlayerId.value = 0; // Start normal game with player 0
                }
            }
        }
    };

    const moveRobber = (hexId: number, playerId: number) => {
        // If the robber is already on the hex, do nothing
        const currentHex = hexes.value.find((h) => h.hasRobber);
        if (currentHex?.id === hexId) return;
        // Clear old robber
        hexes.value.forEach((h) => (h.hasRobber = false));
        // Set new robber
        const targetHex = hexes.value.find((h) => h.id === hexId);
        if (targetHex) {
            targetHex.hasRobber = true;
        }

        // Steal from adjacent player
        const adjacentNodeIds = hexToNodes.get(hexId) || [];
        const victimCandidates = new Set<number>();

        adjacentNodeIds.forEach((nodeId) => {
            const node = nodes.value[nodeId];
            if (node && node.building && node.building.playerId !== playerId) {
                victimCandidates.add(node.building.playerId);
            }
        });

        if (victimCandidates.size > 0) {
            const victims = Array.from(victimCandidates);
            // AI or simple logic: Randomly pick one victim
            const victimId =
                victims[Math.floor(Math.random() * victims.length)];
            const victim = players.value.find((p) => p.id === victimId);
            const thief = players.value.find((p) => p.id === playerId);

            if (victim && thief) {
                // Pick random resource from victim
                const victimResources = (
                    Object.entries(victim.resources) as [ResourceType, number][]
                ).flatMap(([res, count]) => Array(count).fill(res));

                if (victimResources.length > 0) {
                    const stolenRes = victimResources[
                        Math.floor(Math.random() * victimResources.length)
                    ] as ResourceType;
                    victim.resources[stolenRes]--;
                    thief.resources[stolenRes]++;
                    // console.log(`Player ${playerId} stole ${stolenRes} from Player ${victimId}`)
                }
            }
        }

        turnPhase.value = "rolled"; // Back to build phase
    };

    const rollDice = () => {
        if (turnPhase.value !== "ready") return;

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        dice.value = [d1, d2];
        const total = d1 + d2;

        // Robber check
        if (total === 7) {
            turnPhase.value = "robber";

            // Resource Burst (Discards) logic
            const playersToDiscard: number[] = [];
            players.value.forEach((p) => {
                const totalCards = Object.values(p.resources).reduce(
                    (a, b) => a + b,
                    0,
                );
                if (totalCards >= 8) {
                    playersToDiscard.push(p.id);
                }
            });

            if (playersToDiscard.length > 0) {
                discardingPlayers.value = playersToDiscard;
                turnPhase.value = "discarding";

                // Auto-discard for AI immediately
                playersToDiscard.forEach((pid) => {
                    if (pid !== 0) {
                        // Assuming 0 is human
                        const p = players.value.find((pl) => pl.id === pid);
                        if (p) {
                            const total = Object.values(p.resources).reduce(
                                (a, b) => a + b,
                                0,
                            );
                            const discardCount = Math.floor(total / 2);

                            // Randomly discard for now
                            const currentResources = (
                                Object.entries(p.resources) as [
                                    ResourceType,
                                    number,
                                ][]
                            ).flatMap(([res, count]) => Array(count).fill(res));

                            // Shuffle and pick discard count
                            for (
                                let i = currentResources.length - 1;
                                i > 0;
                                i--
                            ) {
                                const j = Math.floor(Math.random() * (i + 1));
                                const temp = currentResources[i]!;
                                currentResources[i] = currentResources[j]!;
                                currentResources[j] = temp;
                            }

                            // Determine what to keep
                            const kept = currentResources.slice(discardCount); // Removing first 'discardCount' items

                            // Update player resources
                            p.resources = {
                                wood: 0,
                                brick: 0,
                                wool: 0,
                                wheat: 0,
                                ore: 0,
                                desert: 0,
                            };
                            kept.forEach(
                                (r) => p.resources[r as ResourceType]++,
                            );

                            // Remove from discarding list
                            discardingPlayers.value =
                                discardingPlayers.value.filter(
                                    (id) => id !== pid,
                                );
                        }
                    }
                });

                // If only AI had to discard, we might be done already
                if (discardingPlayers.value.length === 0) {
                    turnPhase.value = "robber";
                }
            } else {
                turnPhase.value = "robber";
            }
            return;
        }

        turnPhase.value = "rolled";

        hexes.value.forEach((hex) => {
            // Robber blocks production
            if (hex.number === total && !hex.hasRobber) {
                const adjacentNodeIds = hexToNodes.get(hex.id) || [];
                adjacentNodeIds.forEach((nodeId) => {
                    const node = nodes.value[nodeId];
                    if (node && node.building) {
                        const player = players.value.find(
                            (p) => p.id === node.building!.playerId,
                        );
                        if (player) {
                            const amount =
                                node.building.type === "city" ? 2 : 1;
                            player.resources[hex.resource] += amount;
                        }
                    }
                });
            }
        });
    };

    const aiPlayTurn = async () => {
        if (currentPlayerId.value === 0 || winnerId.value !== null) return;

        if (setupPhase.value !== "none") {
            const p = players.value[currentPlayerId.value];
            if (!p) return;

            if (setupStep.value === "settlement") {
                const validNodes = Object.keys(nodes.value).filter((id) => {
                    const n = nodes.value[id];
                    if (!n || n.building) return false;
                    const isTooClose = Object.keys(edges.value).some((eid) => {
                        if (eid.includes(id)) {
                            const otherNodeId = eid
                                .split("--")
                                .find((oid) => oid !== id);
                            return (
                                otherNodeId &&
                                nodes.value[otherNodeId]?.building !== null
                            );
                        }
                        return false;
                    });
                    return !isTooClose;
                });

                // Strategic Choice
                let bestNodeId = null;
                let maxScore = -Infinity;

                // 2nd turn correction: booster weights for missing resources
                let tempWeights = { ...PERSONA_WEIGHTS[p.persona] };
                if (setupPhase.value === "second") {
                    const firstSettlement = Object.values(nodes.value).find(
                        (n) => n.building?.playerId === p.id,
                    );
                    if (firstSettlement) {
                        const firstResources = hexes.value
                            .filter((h) =>
                                hexToNodes
                                    .get(h.id)
                                    ?.includes(firstSettlement.id),
                            )
                            .map((h) => h.resource);

                        // Boost value of resources we DON'T have yet
                        (
                            [
                                "wood",
                                "brick",
                                "wool",
                                "wheat",
                                "ore",
                            ] as ResourceType[]
                        ).forEach((res: ResourceType) => {
                            if (!firstResources.includes(res)) {
                                tempWeights[res] += 0.5;
                            }
                        });
                    }
                }

                validNodes.forEach((id) => {
                    // Custom score calculation with tempWeights
                    let score = 0;
                    hexes.value.forEach((hex) => {
                        const nodesInHex = hexToNodes.get(hex.id);
                        if (nodesInHex && nodesInHex.includes(id)) {
                            if (hex.resource !== "desert" && hex.number) {
                                const pips = PIP_MAP[hex.number] || 0;
                                const weight = tempWeights[hex.resource] || 1;
                                score += pips * weight;
                            }
                        }
                    });

                    // Port penalty/bonus logic here if needed (getIntersectionScore has coast penalty)
                    // We'll just use a slightly modified getIntersectionScore inline to support tempWeights
                    const node = nodes.value[id];
                    if (node && node.port === null) {
                        const isCoast =
                            hexes.value.filter((hex) =>
                                hexToNodes.get(hex.id)?.includes(id),
                            ).length < 3;
                        if (isCoast) score -= 2;
                    } else if (node && node.port !== null) {
                        score += 1; // Bonus for port in setup
                    }

                    if (score > maxScore) {
                        maxScore = score;
                        bestNodeId = id;
                    }
                });

                if (bestNodeId) {
                    buildSettlement(bestNodeId, currentPlayerId.value, true);
                    await new Promise((r) => setTimeout(r, 1000));
                }
            }

            if (setupStep.value === "road") {
                const validEdges = Object.keys(edges.value).filter((id) => {
                    const e = edges.value[id];
                    if (!e || e.road) return false;
                    return (
                        lastSettlementNodeId.value &&
                        id.includes(lastSettlementNodeId.value)
                    );
                });

                // Pick edge that leads to the best future settlement spot
                let bestEdgeId = null;
                let maxFutureScore = -Infinity;

                validEdges.forEach((eid) => {
                    const otherNodeId = eid
                        .split("--")
                        .find((nid) => nid !== lastSettlementNodeId.value);
                    if (otherNodeId) {
                        // Score is sum of neighbors of neighbor
                        let edgeScore = 0;
                        Object.keys(edges.value).forEach((nextEid) => {
                            if (
                                nextEid.includes(otherNodeId) &&
                                nextEid !== eid
                            ) {
                                const targetNodeId = nextEid
                                    .split("--")
                                    .find((nid) => nid !== otherNodeId);
                                if (targetNodeId) {
                                    edgeScore += getIntersectionScore(
                                        targetNodeId,
                                        p.id,
                                    );
                                }
                            }
                        });
                        if (edgeScore > maxFutureScore) {
                            maxFutureScore = edgeScore;
                            bestEdgeId = eid;
                        }
                    }
                });

                const finalEdge = bestEdgeId || validEdges[0];
                if (finalEdge) {
                    buildRoad(finalEdge, currentPlayerId.value, true);
                }
            }
            return;
        }

        const player = players.value[currentPlayerId.value];
        if (!player) return;

        // AI Robber Logic
        if (turnPhase.value === "robber") {
            await new Promise((r) => setTimeout(r, 1000));
            // Pick a random hex that is NOT the current robber hex and ideally has adjacent opponent buildings
            // For now, completely random hex that isn't the current one.
            const currentRobberHex = hexes.value.find((h) => h.hasRobber);
            const otherHexes = hexes.value.filter(
                (h) => h !== currentRobberHex,
            );
            const targetHex =
                otherHexes[Math.floor(Math.random() * otherHexes.length)];
            if (targetHex) {
                moveRobber(targetHex.id, currentPlayerId.value);
            }
            return;
        }

        // 1. Roll Dice
        rollDice();
        await new Promise((r) => setTimeout(r, 1000));

        // ... (discarding logic)
        // Await user discarding
        if (turnPhase.value === "discarding") {
            await new Promise<void>((r) => {
                const check = () => {
                    if (turnPhase.value === "robber") {
                        r();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        }

        // 7 rolled by AI or Knight played
        if ((turnPhase.value as TurnPhase) === "robber") {
            const targetHexId = findBestRobberHex(currentPlayerId.value);
            if (targetHexId !== null) {
                moveRobber(targetHexId, currentPlayerId.value);
                await new Promise((r) => setTimeout(r, 1000));
            } else {
                // Fallback
                const currentRobberHex = hexes.value.find((h) => h.hasRobber);
                const otherHexes = hexes.value.filter(
                    (h) => h !== currentRobberHex && h.resource !== "desert",
                );
                const fallback =
                    otherHexes[Math.floor(Math.random() * otherHexes.length)];
                if (fallback) moveRobber(fallback.id, currentPlayerId.value);
            }
        }

        // 2. Play Dev Cards (Basic: Knight if robber on my hex, or Road Building)
        const canPlayCard = (type: DevCardType) => {
            const cardIdx = player.devCards.findIndex(
                (c) =>
                    c.type === type &&
                    !c.played &&
                    c.turnBought < turnCount.value,
            );
            return cardIdx;
        };

        // AI Road Building Card
        const rbIdx = canPlayCard("road_building");
        if (rbIdx !== -1) {
            playDevelopmentCard(currentPlayerId.value, rbIdx);
            await new Promise((r) => setTimeout(r, 500));
        }

        // AI Monopoly Card
        const monoIdx = canPlayCard("monopoly");
        if (monoIdx !== -1) {
            // AI "cheats" slightly by looking at current resource totals to pick the best one
            let bestMonoRes: ResourceType = "wood";
            let maxTotal = -1;

            const resources: ResourceType[] = [
                "wood",
                "brick",
                "wool",
                "wheat",
                "ore",
            ];
            resources.forEach((res) => {
                const total = players.value
                    .filter((p) => p.id !== currentPlayerId.value)
                    .reduce((acc, p) => acc + p.resources[res], 0);
                if (total > maxTotal) {
                    maxTotal = total;
                    bestMonoRes = res;
                }
            });

            playDevelopmentCard(currentPlayerId.value, monoIdx, {
                resource: bestMonoRes,
            });
            await new Promise((r) => setTimeout(r, 500));
        }

        // AI Year of Plenty Card
        const yopIdx = canPlayCard("year_of_plenty");
        if (yopIdx !== -1) {
            // Goal-oriented discovery: what do we need for our next build?
            const targetTypes: (keyof typeof COSTS)[] = [
                "city",
                "settlement",
                "road",
            ];
            let pickedResources: ResourceType[] = [];

            for (const type of targetTypes) {
                const cost = COSTS[type];
                if (!cost) continue;
                const missing = (Object.keys(cost) as ResourceType[]).filter(
                    (r) => player.resources[r] < cost[r],
                );
                if (missing.length > 0 && missing.length <= 2) {
                    // We can finish this build!
                    missing.forEach((r) => {
                        const countNeeded = cost[r] - player.resources[r];
                        for (
                            let i = 0;
                            i < countNeeded && pickedResources.length < 2;
                            i++
                        ) {
                            pickedResources.push(r);
                        }
                    });
                    break;
                }
            }

            // If still need more, pick based on persona preference or just what we have least of
            if (pickedResources.length < 2) {
                const sorted = (Object.keys(player.resources) as ResourceType[])
                    .filter((r) => r !== "desert")
                    .sort((a, b) => {
                        const wa = PERSONA_WEIGHTS[player.persona][a] || 1;
                        const wb = PERSONA_WEIGHTS[player.persona][b] || 1;
                        return (
                            player.resources[a] / wa - player.resources[b] / wb
                        );
                    });
                while (pickedResources.length < 2) {
                    pickedResources.push(sorted[0] || "wood");
                    if (pickedResources.length < 2)
                        pickedResources.push(sorted[1] || "brick");
                }
            }

            playDevelopmentCard(currentPlayerId.value, yopIdx, {
                resources: pickedResources.slice(0, 2),
            });
            await new Promise((r) => setTimeout(r, 500));
        }

        // Knight card logic: play if robber is on a high-value current hex, or if we can take/defend Largest Army
        const knightIdx = canPlayCard("knight");
        if (knightIdx !== -1) {
            const currentRobberHex = hexes.value.find((h) => h.hasRobber);
            const nodesInHex = currentRobberHex
                ? hexToNodes.get(currentRobberHex.id) || []
                : [];
            const isBlockingMe = nodesInHex.some(
                (nid) =>
                    nodes.value[nid]?.building?.playerId ===
                    currentPlayerId.value,
            );

            let shouldPlayKnight = isBlockingMe;

            // Check Largest Army contest
            if (!shouldPlayKnight) {
                const myArmy = player.armySize;
                const currentAward = awardHolders.value.largestArmy;
                if (currentAward.playerId === null) {
                    // If no one has it, try to get it if we are at 2 (playing would make it 3)
                    if (myArmy === 2) shouldPlayKnight = true;
                } else if (currentAward.playerId !== currentPlayerId.value) {
                    // If someone else has it, try to take it if we can overtake
                    // (Playing makes us myArmy + 1, must be > count)
                    if (myArmy >= currentAward.count) shouldPlayKnight = true;
                } else {
                    // If we have it, defend it if someone is close
                    const maxOtherArmy = Math.max(
                        ...players.value
                            .filter((p) => p.id !== currentPlayerId.value)
                            .map((p) => p.armySize),
                    );
                    if (maxOtherArmy >= myArmy - 1) shouldPlayKnight = true;
                }
            }

            if (shouldPlayKnight) {
                playDevelopmentCard(currentPlayerId.value, knightIdx);
                await new Promise((r) => setTimeout(r, 800));
            }
        }

        // 3. Perform Free Roads from Road Building
        while (roadBuildingMovesLeft.value > 0) {
            const bestNodeId = findBestTargetNode(currentPlayerId.value);
            const path = bestNodeId
                ? getPathToNode(currentPlayerId.value, bestNodeId)
                : [];
            const targetEdge = path.find(
                (eid) => edges.value[eid] && !edges.value[eid]!.road,
            );

            if (targetEdge) {
                buildRoad(targetEdge, currentPlayerId.value, true);
                roadBuildingMovesLeft.value--;
                await new Promise((r) => setTimeout(r, 800));
            } else {
                // Path is blocked or already has roads. Fallback to any valid edge.
                const validEdges = Object.keys(edges.value).filter((eid) => {
                    const e = edges.value[eid];
                    if (!e || e.road) return false;
                    const nodesInEdge = eid.split("--");
                    return (
                        Object.values(edges.value).some(
                            (ee) =>
                                ee.road?.playerId === currentPlayerId.value &&
                                nodesInEdge.some((nid) => ee.id.includes(nid)),
                        ) ||
                        nodesInEdge.some(
                            (nid) =>
                                nodes.value[nid]?.building?.playerId ===
                                currentPlayerId.value,
                        )
                    );
                });
                const randomEdge =
                    validEdges[Math.floor(Math.random() * validEdges.length)];
                if (randomEdge) {
                    buildRoad(randomEdge, currentPlayerId.value, true);
                    roadBuildingMovesLeft.value--;
                    await new Promise((r) => setTimeout(r, 800));
                } else {
                    roadBuildingMovesLeft.value = 0;
                }
            }
        }

        // 4. Proactive Bank Trading
        // AI checks if trading one resource for another with the bank allows a build
        const proactiveBankTrade = () => {
            const targetTypes: (keyof typeof COSTS)[] = [
                "city",
                "settlement",
                "road",
            ];
            for (const type of targetTypes) {
                const cost = COSTS[type];
                if (!cost) continue;

                // Check if we are missing exactly one type of resource
                const missingResources = (
                    Object.keys(cost) as ResourceType[]
                ).filter((res) => player.resources[res] < cost[res]);
                if (missingResources.length === 1) {
                    const missingRes = missingResources[0]!;
                    const required =
                        cost[missingRes] - player.resources[missingRes];

                    if (required === 1) {
                        // Find a resource we can sell
                        for (const res of Object.keys(
                            player.resources,
                        ) as ResourceType[]) {
                            if (res === missingRes || res === "desert")
                                continue;
                            const ratio = getTradeRatio(player.id, res);
                            const surplus = player.resources[res] - cost[res];
                            if (surplus >= ratio) {
                                // Perform trade!
                                if (
                                    executeBankTrade(player.id, res, missingRes)
                                )
                                    return true;
                            }
                        }
                    }
                }
            }
            return false;
        };

        if (proactiveBankTrade()) {
            await new Promise((r) => setTimeout(r, 800));
        }

        // 5. Build stuff (Strategic)
        const targetNodeId = findBestTargetNode(currentPlayerId.value);
        const pathToTarget = targetNodeId
            ? getPathToNode(currentPlayerId.value, targetNodeId)
            : [];

        const tryUpgradeCity = async () => {
            const potentialCities = Object.keys(nodes.value).filter(
                (nid) =>
                    nodes.value[nid]?.building?.type === "settlement" &&
                    nodes.value[nid]?.building?.playerId ===
                        currentPlayerId.value,
            );
            for (const nid of potentialCities) {
                if (buildCity(nid, currentPlayerId.value)) {
                    await new Promise((r) => setTimeout(r, 800));
                    return true;
                }
            }
            return false;
        };

        const tryBuildSettlement = async () => {
            if (targetNodeId && pathToTarget.length === 0) {
                if (buildSettlement(targetNodeId, currentPlayerId.value)) {
                    await new Promise((r) => setTimeout(r, 800));
                    return true;
                }
            }
            return false;
        };

        const tryBuildRoad = async () => {
            const nextEdgeId = pathToTarget[0];
            if (nextEdgeId) {
                // Only build road if we need it to reach land
                if (pathToTarget.length > 0) {
                    if (buildRoad(nextEdgeId, currentPlayerId.value)) {
                        await new Promise((r) => setTimeout(r, 800));
                        return true;
                    }
                }
            }
            return false;
        };

        const tryBuyDevCard = async () => {
            if (canAfford(currentPlayerId.value, "devCard")) {
                const totalRes = Object.values(player.resources).reduce(
                    (a, b) => a + b,
                    0,
                );
                // Type B buys cards more aggressively. Others buy if they have surplus.
                const threshold = player.persona === "CITY" ? 3 : 6;
                if (totalRes > threshold) {
                    if (buyDevelopmentCard(currentPlayerId.value)) {
                        await new Promise((r) => setTimeout(r, 800));
                        return true;
                    }
                }
            }
            return false;
        };

        // Persona-based execution order
        const executeActions = async () => {
            if (player.persona === "LAND") {
                // Priority: Settlement > Road > City > Card
                if (await tryBuildSettlement()) return;
                if (await tryBuildRoad()) return;
                if (await tryUpgradeCity()) return;
                if (await tryBuyDevCard()) return;
            } else if (player.persona === "CITY") {
                // Priority: City > Card > Settlement > Road
                if (await tryUpgradeCity()) return;
                if (await tryBuyDevCard()) return;
                if (await tryBuildSettlement()) return;
                if (await tryBuildRoad()) return;
            } else {
                // Priority: City > Settlement > Road > Card (Balanced)
                if (await tryUpgradeCity()) return;
                if (await tryBuildSettlement()) return;
                if (await tryBuildRoad()) return;
                if (await tryBuyDevCard()) return;
            }
        };

        await executeActions();

        await new Promise((r) => setTimeout(r, 1000));
        // 3. Next Turn
        nextTurn();
    };

    const getTradeRatio = (playerId: number, resource: ResourceType) => {
        let ratio = 4;
        const playerNodes = Object.values(nodes.value).filter(
            (n) => n.building?.playerId === playerId,
        );

        const hasAnyPort = playerNodes.some((n) => n.port === "any");
        if (hasAnyPort) ratio = 3;

        const hasSpecificPort = playerNodes.some((n) => n.port === resource);
        if (hasSpecificPort) ratio = 2;

        return ratio;
    };

    const executeBankTrade = (
        playerId: number,
        sellRes: ResourceType,
        buyRes: ResourceType,
    ) => {
        const player = players.value.find((p) => p.id === playerId);
        if (!player) return false;

        const ratio = getTradeRatio(playerId, sellRes);
        if (player.resources[sellRes] < ratio) return false;

        player.resources[sellRes] -= ratio;
        player.resources[buyRes] += 1;
        return true;
    };

    const evaluatePlayerTrade = (
        offeringPlayerId: number,
        targetPlayerId: number,
        offer: Partial<Record<ResourceType, number>>,
        request: Partial<Record<ResourceType, number>>,
    ) => {
        const target = players.value.find((p) => p.id === targetPlayerId);
        const offerer = players.value.find((p) => p.id === offeringPlayerId);
        if (!target || !offerer) return false;

        const weights = PERSONA_WEIGHTS[target.persona];

        // Calculate values based on persona weights
        const getTradeValue = (
            resMap: Partial<Record<ResourceType, number>>,
        ) => {
            return (Object.entries(resMap) as [ResourceType, number][]).reduce(
                (acc, [res, count]) => {
                    return acc + (count || 0) * (weights[res] || 1);
                },
                0,
            );
        };

        const offerValue = getTradeValue(offer);
        const requestValue = getTradeValue(request);

        // Rivalry Cost: AI is more careful if the offerer is close to winning
        let rivalryCost = 0;
        const offererPoints = calculateTotalPoints(offeringPlayerId);
        if (offererPoints >= 9) rivalryCost = 2.0;
        else if (offererPoints >= 8) rivalryCost = 1.0;
        else if (offererPoints >= 7) rivalryCost = 0.5;

        // Basic fulfillment check
        const canFulfill = (
            Object.entries(request) as [ResourceType, number][]
        ).every(([res, val]) => target.resources[res] >= (val || 0));
        if (!canFulfill) return false;

        // Acceptance condition: Offer must be worth more than the request plus rivalry penalty
        return offerValue >= requestValue + rivalryCost;
    };

    const executePlayerTrade = (
        p1Id: number,
        p2Id: number,
        offer: Partial<Record<ResourceType, number>>,
        request: Partial<Record<ResourceType, number>>,
    ) => {
        const p1 = players.value.find((p) => p.id === p1Id);
        const p2 = players.value.find((p) => p.id === p2Id);
        if (!p1 || !p2) return false;

        // Check p1 can afford offer
        const p1CanAfford = (
            Object.entries(offer) as [ResourceType, number][]
        ).every(([res, _val]) => p1.resources[res] >= (_val || 0));
        if (!p1CanAfford) return false;

        // Check p2 can afford request
        const p2CanAfford = (
            Object.entries(request) as [ResourceType, number][]
        ).every(([res, val]) => p2.resources[res] >= (val || 0));
        if (!p2CanAfford) return false;

        // Execute
        (Object.entries(offer) as [ResourceType, number][]).forEach(
            ([res, val]) => {
                p1.resources[res] -= val || 0;
                p2.resources[res] += val || 0;
            },
        );
        (Object.entries(request) as [ResourceType, number][]).forEach(
            ([res, val]) => {
                p2.resources[res] -= val || 0;
                p1.resources[res] += val || 0;
            },
        );

        return true;
    };

    const getIntersectionScore = (nodeId: string, playerId: number) => {
        const player = players.value.find((p) => p.id === playerId);
        if (!player) return 0;
        const weights = PERSONA_WEIGHTS[player.persona];

        let score = 0;
        hexes.value.forEach((hex) => {
            const nodesInHex = hexToNodes.get(hex.id);
            if (nodesInHex && nodesInHex.includes(nodeId)) {
                if (hex.resource !== "desert" && hex.number) {
                    const pips = PIP_MAP[hex.number] || 0;
                    const weight = weights[hex.resource];
                    score += pips * weight;
                }
            }
        });

        // Penalty for coastal without port
        const node = nodes.value[nodeId];
        if (node && node.port === null) {
            const isCoast =
                hexes.value.filter((hex) => {
                    const nodesInHex = hexToNodes.get(hex.id);
                    return nodesInHex && nodesInHex.includes(nodeId);
                }).length < 3;
            if (isCoast) score -= 2;
        }

        return score;
    };

    const discardResources = (
        playerId: number,
        resourcesToDiscard: Partial<Record<ResourceType, number>>,
    ) => {
        const player = players.value.find((p) => p.id === playerId);
        if (!player) return false;
        if (!discardingPlayers.value.includes(playerId)) return false;

        // Validate has resources
        const hasResources = (
            Object.entries(resourcesToDiscard) as [ResourceType, number][]
        ).every(([res, count]) => {
            return player.resources[res] >= (count || 0);
        });
        if (!hasResources) return false;

        // Validate correct amount
        const totalHeld = Object.values(player.resources).reduce(
            (a, b) => a + b,
            0,
        );
        const requiredDiscard = Math.floor(totalHeld / 2);
        const totalDiscarding = Object.values(resourcesToDiscard).reduce(
            (a, b) => a + (b || 0),
            0,
        );

        if (totalDiscarding !== requiredDiscard) return false;

        // Execute
        (
            Object.entries(resourcesToDiscard) as [ResourceType, number][]
        ).forEach(([res, count]) => {
            player.resources[res] -= count || 0;
        });

        // Update State
        discardingPlayers.value = discardingPlayers.value.filter(
            (id) => id !== playerId,
        );
        if (discardingPlayers.value.length === 0) {
            turnPhase.value = "robber";

            // If the current player is AI, they need to proceed with Robber phase
            if (currentPlayerId.value !== 0) {
                aiPlayTurn();
            }
        }
        return true;
    };

    const findBestTargetNode = (playerId: number): string | null => {
        let bestNodeId: string | null = null;
        let maxScore = -Infinity;

        Object.keys(nodes.value).forEach((nodeId) => {
            const node = nodes.value[nodeId];
            if (!node || node.building) return;

            // Check distance rule (2 edges apart)
            const isTooClose = Object.keys(edges.value).some((eid) => {
                if (eid.includes(nodeId)) {
                    const otherNodeId = eid
                        .split("--")
                        .find((oid) => oid !== nodeId);
                    return (
                        otherNodeId &&
                        nodes.value[otherNodeId]?.building !== null
                    );
                }
                return false;
            });
            if (isTooClose) return;

            // AI should only target reachable spots (or for future expansion)
            // For now, let's score ALL valid spots and we'll pathfind to them.
            const score = getIntersectionScore(nodeId, playerId);
            if (score > maxScore) {
                maxScore = score;
                bestNodeId = nodeId;
            }
        });

        return bestNodeId;
    };

    const findBestRobberHex = (playerId: number): number | null => {
        let bestHexId: number | null = null;
        let maxBlockScore = -Infinity;

        // Identify targets based on dominance
        const opponents = players.value.filter((p) => p.id !== playerId);
        const dominanceScores: Record<number, number> = {};
        opponents.forEach((p) => {
            dominanceScores[p.id] = getDominanceScore(p.id);
        });

        hexes.value.forEach((hex) => {
            if (hex.resource === "desert" || hex.hasRobber) return;

            let blockScore = 0;
            const nodesInHex = hexToNodes.get(hex.id) || [];
            let blocksSelf = false;

            nodesInHex.forEach((nid) => {
                const node = nodes.value[nid];
                if (node?.building) {
                    const ownerId = node.building.playerId;
                    if (ownerId !== playerId) {
                        // Target opponent. Use dominance score and hex probability.
                        const dScore = dominanceScores[ownerId] || 0;
                        const pips = PIP_MAP[hex.number!] || 0;
                        // Contribution to score: pips * dominance factor
                        blockScore += pips * (1 + dScore / 500);
                    } else {
                        blocksSelf = true;
                    }
                }
            });

            if (blocksSelf) blockScore = -Infinity; // Absolute avoidance of self-blocking if possible

            if (blockScore > maxBlockScore) {
                maxBlockScore = blockScore;
                bestHexId = hex.id;
            }
        });

        return bestHexId;
    };

    const getPathToNode = (
        playerId: number,
        targetNodeId: string,
    ): string[] => {
        // BFS to find shortest path from player's network to targetNodeId
        const queue: { nodeId: string; path: string[] }[] = [];
        const visited = new Set<string>();

        // Starting points: all nodes where the player has a building or a road
        Object.keys(nodes.value).forEach((nid) => {
            const n = nodes.value[nid];
            if (n?.building?.playerId === playerId) {
                queue.push({ nodeId: nid, path: [] });
                visited.add(nid);
            }
        });
        Object.keys(edges.value).forEach((eid) => {
            const e = edges.value[eid];
            if (e?.road?.playerId === playerId) {
                const [n1, n2] = eid.split("--");
                if (n1) {
                    queue.push({ nodeId: n1, path: [] });
                    visited.add(n1);
                }
                if (n2) {
                    queue.push({ nodeId: n2, path: [] });
                    visited.add(n2);
                }
            }
        });

        while (queue.length > 0) {
            const { nodeId, path } = queue.shift()!;
            if (nodeId === targetNodeId) return path;

            // Get neighbors
            Object.keys(edges.value).forEach((eid) => {
                if (eid.includes(nodeId)) {
                    const neighborId = eid
                        .split("--")
                        .find((oid) => oid !== nodeId);
                    if (neighborId && !visited.has(neighborId)) {
                        // Check if blocked by opponent settlement
                        const neighborNode = nodes.value[neighborId];
                        if (
                            neighborNode &&
                            neighborNode.building &&
                            neighborNode.building.playerId !== playerId
                        ) {
                            // Cannot pass through opponent buildings
                            return;
                        }
                        visited.add(neighborId);
                        queue.push({
                            nodeId: neighborId,
                            path: [...path, eid],
                        });
                    }
                }
            });
        }

        return []; // No path found
    };

    return {
        hexes,
        nodes,
        edges,
        players,
        currentPlayerId,
        dice,
        gameStarted,
        turnPhase,
        setupPhase,
        setupStep,
        winnerId,
        devCardDeck,
        turnCount,
        initGame,
        generateBoard,
        rollDice,
        nextTurn,
        aiPlayTurn,
        buildRoad,
        buildSettlement,
        buildCity,
        canAfford,
        buyDevelopmentCard,
        playDevelopmentCard,
        lastSettlementNodeId,
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
        getIntersectionScore,
    };
}
