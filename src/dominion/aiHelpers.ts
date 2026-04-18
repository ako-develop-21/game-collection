import { ALL_CARDS } from "./cards/00_index";
import type { GameState, Card, PromptType, ActionHelpers } from "./types";

// --------------------------------------------------------------------------------
// ゲーム進行度
// --------------------------------------------------------------------------------
export const isEarlyGame = (state: GameState) =>
    (state.supply["province"] || 0) > 6;
export const isMidGame = (state: GameState) => {
    const prov = state.supply["province"] || 0;
    return prov > 2 && prov <= 6;
};
export const isLateGame = (state: GameState) =>
    (state.supply["province"] || 0) <= 2;

// --------------------------------------------------------------------------------
// 共通思考
// --------------------------------------------------------------------------------
/**
 * アクションが足りているか
 * @param state
 * @param playerIndex
 * @returns
 */
export const needsActions = (state: GameState, playerIndex: number) => {
    const player = state.players[playerIndex]!;
    const terminalActions = player.hand.filter(
        (c) => c.type.includes("Action") && !c.effects?.action,
    ).length;
    const actionGivers = player.hand.filter(
        (c) => (c.effects?.action || 0) >= 1,
    ).length;
    return terminalActions > actionGivers;
};

/**
 * コインが足りているか
 * 破棄を繰り返す思考ルーチンの場合、過剰にコインを破棄し、デッキが回らなくなることがある
 * デッキの総コインを取得し、5未満であればこれ以上破棄しないようにする
 * @param state
 * @param playerIndex
 * @returns
 */
export const needsCoins = (state: GameState, playerIndex: number) => {
    const player = state.players[playerIndex]!;
    const allCards = [
        ...player.hand,
        ...player.deck,
        ...player.discard,
        ...player.inPlay,
    ];
    const totalCoins = allCards.reduce((sum, c) => {
        if (typeof c.treasure === "number") return sum + c.treasure;
        else if (typeof c.treasure === "function")
            return sum + c.treasure(state, playerIndex);
        return sum;
    }, 0);
    return totalCoins < 5;
};

/**
 * シンプルな勝利点カードの評価
 * @param card
 * @param state
 * @param playerIndex
 * @param promptType
 * @returns
 */
const getAIVictoryCardValue = (
    card: Card,
    state: GameState,
    playerIndex: number,
    promptType: PromptType,
) => {
    let point = 0;
    if (typeof card.points === "number") point = card.points;
    else if (typeof card.points === "function")
        point = card.points(state, playerIndex);

    switch (promptType) {
        case "discard":
            // 捨て札
            return -20;
        case "trash":
            // 廃棄
            if (point >= 3) return 100;
            if (isLateGame(state)) return 100; // MUST KEEP in late game
            if (isMidGame(state)) return 10;
            if (isEarlyGame(state)) return -20; // Extra penalty early
            break;
        case "gain":
            if (point >= 6) return 200 + point;
            if (isLateGame(state)) return 100 + point;
            else return point;
        case "reorder":
            // 山札に戻す
            return -20;
        case "sentry":
            // 衛兵は0未満で破棄、20未満で捨て札、20以上で残す
            if (point <= 2 && !isLateGame(state)) return -20;
            return 10;
        default:
            return 0;
    }

    // 通過しないが念のため
    return 0;
};

// --------------------------------------------------------------------------------
// 手札のカード評価
// --------------------------------------------------------------------------------
/**
 * 手札のカード評価
 * 200: 植民地
 * 120: 白金貨
 * 100: 属州
 * 80: 金貨
 * 40: 銀貨
 * 0未満: 廃棄、捨て札対象
 * -30: 呪い
 * @param card
 * @param state
 * @param playerIndex
 * @param promptType
 * @returns
 */
export const getAICardValueInHand = (
    card: Card,
    state: GameState,
    playerIndex: number,
    promptType: PromptType,
) => {
    if (card.ai?.getValue) {
        const val = card.ai.getValue(state, playerIndex);
        if (val !== null) return val;
    }

    // 1. 勝利点
    if (card.type.length === 1 && card.type[0] === "Victory") {
        return getAIVictoryCardValue(card, state, playerIndex, promptType);
    }

    // 2. 呪い
    if (card.type.includes("Curse")) return -30;

    // 3. 基本の財宝
    if (card.id === "copper") return needsCoins(state, playerIndex) ? 15 : -5;
    if (card.id === "silver") return 40;
    if (card.id === "gold") return 80;
    if (card.id === "platinum") return 120;

    // 4. アクション
    if (card.type.includes("Action")) {
        const effects = card.effects || {};
        let val = 50;
        if (effects.action) val += 10;
        if (effects.draw) val += 10;
        if (needsActions(state, playerIndex) && !effects.action) val -= 20;
        // 廃棄カードはデッキに2枚まで
        const player = state.players[playerIndex]!;
        const trashCount = player.deck.filter((c) => c.id === card.id).length;
        if (trashCount >= 2) val -= 20;
        // サプライにアタックカードがある場合
        const supplyCards = Object.keys(state.supply).map(
            (cardId) => ALL_CARDS[cardId]!,
        );
        const attackCards = supplyCards.filter((c) => c.effects?.isAttack);
        if (attackCards.length > 0 && card.type.includes("Reaction")) val += 5;
        return val;
    }

    return 30;
};

// --------------------------------------------------------------------------------
// 購入時のカード評価
// --------------------------------------------------------------------------------
export const getAIPurchaseWeight = (
    cardId: string,
    coins: number,
    state: GameState,
    playerIndex: number,
    helpers: ActionHelpers,
) => {
    const card = ALL_CARDS[cardId];
    const player = state.players[playerIndex]!;
    const turnCount = state.turnCount;
    const supply = state.supply;
    const players = state.players;

    if (!card) return 0;
    const currentCost = helpers.getCardCost(cardId, player.id);
    if (currentCost > coins) return 0;
    if ((card.costPotion || 0) > player.potions) return 0;

    // Check total economy for emergency copper and early silver
    const allCards = [
        ...player.hand,
        ...player.deck,
        ...player.discard,
        ...player.inPlay,
    ];
    const totalTreasureCoins = allCards.reduce(
        (sum, c) => sum + helpers.getCardTreasure(c.id, player.id),
        0,
    );

    // Emergency copper buy to prevent softlock
    // If the deck is too thin on treasures, but we can't afford silver/gold, buy copper.
    if (totalTreasureCoins < 3 && coins < 3 && cardId === "copper") {
        return 150; // ほどほどの優先度で銅貨を購入（手持ちコインが3以上の場合は自然と銀貨などを優先する）
    }

    // Turn 1-2 Silver priority
    if (turnCount <= 2 && coins === 3 && cardId === "silver") {
        return 1500;
    }

    // Province is top priority
    if (cardId === "province") return 1000;

    let weight = 0;
    const effects = card.effects || {};
    const provinceRemaining = supply["province"] || 0;
    const deckSize =
        player.deck.length + player.hand.length + player.discard.length;

    // 1. Three-pile ending monitoring
    const emptyPiles = Object.entries(supply).filter(
        ([id, count]) => count === 0 && id !== "curse",
    ).length;
    const nearEmptyPiles = Object.entries(supply).filter(
        ([id, count]) => count > 0 && count <= 2 && id !== "curse",
    ).length;

    // AI's current simplified score estimation
    const playerPoints = players.map((_, i) => helpers.calculateTotalPoints(i));
    const aiIndex = players.findIndex((p) => p.name === "AI");
    const myPoints = playerPoints[aiIndex] || 0;
    const opponentPoints = Math.max(
        ...playerPoints.filter((_, i) => i !== aiIndex),
        0,
    );
    const isWinning = myPoints > opponentPoints;

    // If game is about to end by piles
    if (emptyPiles >= 2 || (emptyPiles === 1 && nearEmptyPiles >= 2)) {
        if (isWinning) {
            // Boost cards that end the game
            // weight += 800;
            if (
                cardId !== "estate" &&
                cardId !== "duchy" &&
                cardId !== "province"
            ) {
                // addLog(`AI は三山終了による逃げ切りを狙っています... (${card.jpName} を優先)`);
            }
            weight += 800; // Move increase here to avoid confusion
        } else {
            // Avoid ending the game if losing
            if (supply[cardId] === 1) weight -= 500;
        }
    }

    // 2. Late game victory points (standard)
    if (provinceRemaining <= 4) {
        if (cardId === "province") weight += 2000;
        if (cardId === "duchy") weight += 800;
        if (cardId === "estate" && provinceRemaining <= 2) weight += 200;
    }

    // 3. Money
    if (cardId === "gold") weight += 250;
    if (cardId === "silver") weight += 120;

    // 4. Kingdom cards
    if (card.type.includes("Action")) {
        const allCards = [...player.hand, ...player.deck, ...player.discard];
        const terminalActions = allCards.filter(
            (c) => c.type.includes("Action") && !c.effects?.action,
        ).length;
        const actionGivers = allCards.filter(
            (c) => (c.effects?.action || 0) >= 1,
        ).length;

        if (!effects.action) {
            // Limit terminal actions (1 per 10 cards + action givers)
            if (terminalActions > deckSize / 10 + actionGivers) {
                weight -= 150; // Stronger penalty
            } else {
                weight += 80;
            }
        } else {
            weight += 130; // +Action cards are valuable
        }

        // Specific strong cards by effect
        if (effects.isAttack && provinceRemaining > 2) weight += 160;
        if (effects.draw && effects.action && effects.coin) weight += 120; // Market

        // Synergies
        if (effects.draw && actionGivers > terminalActions) weight += 50; // Smithy is better if we have village
    }

    return weight + card.cost * 15; // Bias towards more expensive
};
