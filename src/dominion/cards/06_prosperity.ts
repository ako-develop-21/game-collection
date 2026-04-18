import type { Card } from "../types";
import { getAICardValueInHand } from "../aiHelpers";

export const PROSPERITY_CARDS: Record<string, Card> = {
    workers_village: {
        id: "workers_village",
        name: "Worker's Village",
        jpName: "労働者の村",
        type: ["Action"],
        cost: 4,
        description: "+1 カード, +2 アクション, +1 購入",
        effects: { action: 2, buy: 1, draw: 1 },
    },
    monument: {
        id: "monument",
        name: "Monument",
        jpName: "記念碑",
        type: ["Action"],
        cost: 4,
        description: "+2 コイン, +1 勝利点トークン",
        effects: { coin: 2, vpTokens: 1 },
    },
    expand: {
        id: "expand",
        name: "Expand",
        jpName: "拡張",
        type: ["Action"],
        cost: 5,
        description: "カードを1枚廃棄し、コストが最大3多いカードを獲得する。",
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                const trashCount = 1;
                const handScore = player.hand
                    .map((c) => {
                        return {
                            c,
                            score: getAICardValueInHand(
                                c,
                                state,
                                playerIndex,
                                "trash",
                            ),
                        };
                    })
                    .sort((a, b) => a.score - b.score);
                return handScore.slice(0, trashCount).map((s) => s.c.jpName);
            },
        },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            if (player.hand.length === 0) return;

            helpers.setPrompt({
                type: "trash",
                targetPlayerIndex: playerIndex,
                cardId: "expand",
                min: 1,
                max: 1,
                message: "拡張：廃棄するカードを選択してください",
                onConfirm: (indices: number[]) => {
                    const card = player.hand[indices[0]!];
                    if (card) {
                        const trashedCost = helpers.getCardCost(
                            card.id,
                            playerIndex,
                        );
                        const trashedPotion = card.costPotion || 0;
                        const costLimit = trashedCost + 3;
                        helpers.trashCard(playerIndex, indices[0]!);

                        helpers.setPrompt({
                            type: "gain",
                            targetPlayerIndex: playerIndex,
                            cardId: "expand",
                            min: 1,
                            max: 1,
                            allowedCost: costLimit,
                            allowedPotion: trashedPotion,
                            message: `拡張：コスト${costLimit}${trashedPotion > 0 ? "+🧪" : ""}までのカードを選択してください`,
                            onConfirm: (gainCardId: string) => {
                                const currentGainCost = helpers.getCardCost(
                                    gainCardId,
                                    playerIndex,
                                );
                                const targetCard = helpers.getCard(gainCardId);
                                if (
                                    currentGainCost <= costLimit &&
                                    (targetCard?.costPotion || 0) <=
                                        trashedPotion
                                ) {
                                    helpers.gainCard(playerIndex, gainCardId);
                                    helpers.clearPrompt();
                                }
                            },
                        });
                    }
                },
            });
        },
    },
    royal_seal: {
        id: "royal_seal",
        name: "Royal Seal",
        jpName: "玉璽",
        type: ["Treasure"],
        cost: 5,
        description:
            "+2 コイン / このカードが場に出ているかぎり、あなたがカード1枚を獲得するとき、そのカードを自分の山札の一番上に置いてもよい。",
        effects: { coin: 2 },
        onBuy: (state, playerIndex, helpers, cardItem, _) => {
            const player = state.players[playerIndex]!;
            if (!player.turnFlags?.gainCardToDeck) {
                helpers.setPrompt({
                    type: "choice",
                    targetPlayerIndex: playerIndex,
                    cardId: "royal_seal",
                    min: 1,
                    max: 1,
                    message: "購入したカードを山札の一番上に置きますか？",
                    options: ["はい", "いいえ"],
                    onConfirm: (choice: string) => {
                        if (choice === "はい" || choice === "YES") {
                            // 購入済みのカードはdiscardのbottomに存在するはずなので、そこから拾う
                            const bottomCard =
                                player.discard[player.discard.length - 1];
                            if (!bottomCard || bottomCard.id !== cardItem.id) {
                                helpers.addLog(
                                    `${cardItem.id} is not found in discard!!!`,
                                );
                            } else {
                                player.discard.splice(
                                    player.discard.length - 1,
                                    1,
                                );
                                player.deck.push(cardItem);
                                player.turnFlags = {
                                    ...player.turnFlags,
                                    gainCardToDeck: true,
                                };
                            }
                        }
                        helpers.clearPrompt();
                    },
                });
            }
        },
    },
    quarry: {
        id: "quarry",
        name: "Quarry",
        jpName: "石切場",
        type: ["Treasure"],
        cost: 4,
        description:
            "+1 コイン / このターン、アクションカードのコストは2少なくなる。",
        effects: { coin: 1 },
        onPlay: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            player.turnFlags = {
                ...player.turnFlags,
                costActionReduction:
                    (player.turnFlags?.costActionReduction || 0) + 2,
            };
            helpers.addLog(
                `${player.name} は石切場の効果でアクションカードのコストを 2 下げました。`,
            );
        },
    },
    anvil: {
        id: "anvil",
        name: "Anvil",
        jpName: "金床",
        type: ["Treasure"],
        cost: 3,
        description:
            "+1 コイン / あなたは財宝カード1枚を捨て札にしてもよい。そうした場合コスト4以下のカード1枚を獲得する。",
        effects: { coin: 1 },
        onPlay: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const handTreasures = player.hand.filter((c) =>
                c.type.includes("Treasure"),
            );
            if (handTreasures.length === 0) return;
            helpers.setPrompt({
                type: "discard",
                targetPlayerIndex: playerIndex,
                cardId: "anvil",
                min: 1,
                max: 1,
                message: "財宝カードを捨て札にしますか？",
                onConfirm: (indices: number[]) => {
                    if (indices.length > 0) {
                        helpers.discardSelected(playerIndex, indices);
                        helpers.setPrompt({
                            type: "gain",
                            targetPlayerIndex: playerIndex,
                            cardId: "anvil",
                            min: 1,
                            max: 1,
                            allowedCost: 4,
                            message: "コスト4以下のカード1枚を獲得してください",
                            onConfirm: (gainCardId: string) => {
                                const currentGainCost = helpers.getCardCost(
                                    gainCardId,
                                    playerIndex,
                                );
                                const targetCard = helpers.getCard(gainCardId);
                                if (
                                    currentGainCost <= 4 &&
                                    (targetCard?.costPotion || 0) <= 0
                                ) {
                                    helpers.gainCard(playerIndex, gainCardId);
                                    helpers.clearPrompt();
                                }
                            },
                        });
                    }
                    helpers.clearPrompt();
                },
            });
        },
    },
};
