import type { Card } from "../types";
import { getAICardValueInHand } from "../aiHelpers";

export const BASE2_CARDS: Record<string, Card> = {
    remodel: {
        id: "remodel",
        name: "Remodel",
        jpName: "改築",
        type: ["Action"],
        cost: 4,
        description:
            "手札からカード1枚を廃棄する。そのカードよりコストが最大2多いまでのカード1枚を獲得する。",
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
                cardId: "remodel",
                min: 1,
                max: 1,
                message: "改築：廃棄するカードを選択してください",
                onConfirm: (indices: number[]) => {
                    const card = player.hand[indices[0]!];
                    if (card) {
                        const trashedCost = helpers.getCardCost(
                            card.id,
                            playerIndex,
                        );
                        const trashedPotion = card.costPotion || 0;
                        const costLimit = trashedCost + 2;
                        helpers.trashCard(playerIndex, indices[0]!);

                        helpers.setPrompt({
                            type: "gain",
                            targetPlayerIndex: playerIndex,
                            cardId: "remodel",
                            min: 1,
                            max: 1,
                            allowedCost: costLimit,
                            allowedPotion: trashedPotion,
                            message: `改築：コスト${costLimit}${trashedPotion > 0 ? "+🧪" : ""}までのカードを選択してください`,
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
    chapel: {
        id: "chapel",
        name: "Chapel",
        jpName: "礼拝堂",
        type: ["Action"],
        cost: 2,
        description: "手札からカードを4枚まで廃棄する。",
        ai: {
            getDiscardTrashIndices: (state, playerIndex) => {
                const player = state.players[playerIndex]!;

                // 通常の手札価値を取得
                const indices = player.hand
                    .map((c, i) => {
                        return {
                            c,
                            value: getAICardValueInHand(
                                c,
                                state,
                                playerIndex,
                                "trash",
                            ),
                            index: i,
                        };
                    })
                    .filter((v) => v.value < 0)
                    .sort((a, b) => a.value - b.value)
                    .slice(0, 4);

                // TODO: 最低3コインは残す
                return indices.map((v) => v.index);
            },
        },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            if (player.hand.length === 0) return;
            helpers.setPrompt({
                type: "trash",
                targetPlayerIndex: playerIndex,
                cardId: "chapel",
                min: 0,
                max: 4,
                message: "礼拝堂：廃棄するカードを4枚まで選択してください",
                onConfirm: (indices: number[]) => {
                    // Fixed: Properly trash cards without putting them in discard first
                    const sortedIndices = [...indices].sort((a, b) => b - a);
                    sortedIndices.forEach((idx) => {
                        helpers.trashCard(playerIndex, idx);
                    });
                    helpers.clearPrompt();
                },
            });
        },
    },
    mine: {
        id: "mine",
        name: "Mine",
        jpName: "鉱山",
        type: ["Action"],
        cost: 5,
        description:
            "手札から財宝カード1枚を廃棄する。そのカードよりコストが最大3多いまでの財宝カード1枚を獲得し、手札に加える。",
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const treasureIndices = player.hand
                .map((c, i) => (c.type.includes("Treasure") ? i : -1))
                .filter((i) => i !== -1);
            if (treasureIndices.length === 0) return;

            helpers.setPrompt({
                type: "trash",
                targetPlayerIndex: playerIndex,
                cardId: "mine",
                min: 0,
                max: 1,
                message: "鉱山：廃棄する財宝カードを選択してください",
                onConfirm: (indices: number[]) => {
                    if (indices.length > 0) {
                        const card = player.hand[indices[0]!];
                        if (card && card.type.includes("Treasure")) {
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
                                cardId: "mine",
                                min: 1,
                                max: 1,
                                allowedCost: costLimit,
                                allowedPotion: trashedPotion,
                                allowedTypes: ["Treasure"],
                                message: `鉱山：コスト${costLimit}${trashedPotion > 0 ? "+🧪" : ""}までの財宝カードを選択してください`,
                                onConfirm: (gainCardId: string) => {
                                    const currentGainCost = helpers.getCardCost(
                                        gainCardId,
                                        playerIndex,
                                    );
                                    const targetCard =
                                        helpers.getCard(gainCardId);
                                    if (
                                        currentGainCost <= costLimit &&
                                        (targetCard?.costPotion || 0) <=
                                            trashedPotion
                                    ) {
                                        helpers.gainCard(
                                            playerIndex,
                                            gainCardId,
                                            "hand",
                                        );
                                        helpers.clearPrompt();
                                    }
                                },
                            });
                        }
                    } else {
                        helpers.clearPrompt();
                    }
                },
            });
        },
    },
    gardens: {
        id: "gardens",
        name: "Gardens",
        jpName: "庭園",
        type: ["Victory"],
        cost: 4,
        description:
            "あなたのデッキのカード10枚（端数切り捨て）につき、1 勝利点。",
        points: (state, playerIndex) => {
            const player = state.players[playerIndex]!;
            const totalCards =
                player.hand.length +
                player.deck.length +
                player.discard.length +
                player.inPlay.length;
            return Math.floor(totalCards / 10);
        },
    },
    artisan: {
        id: "artisan",
        name: "Artisan",
        jpName: "職人",
        type: ["Action"],
        cost: 6,
        description:
            "コスト5までのカード1枚を獲得し、手札に加える。手札からカード1枚を山札の一番上に置く。",
        action: (state, playerIndex, helpers) => {
            helpers.setPrompt({
                type: "gain",
                targetPlayerIndex: playerIndex,
                cardId: "artisan",
                min: 1,
                max: 1,
                allowedCost: 5,
                message: "職人：コスト5までのカードを選択してください",
                onConfirm: (gainCardId: string) => {
                    const currentGainCost = helpers.getCardCost(
                        gainCardId,
                        playerIndex,
                    );
                    const targetCard = helpers.getCard(gainCardId);
                    const allowedPotion = 0; // 職人はポーション0固定
                    if (
                        currentGainCost <= 5 &&
                        (targetCard?.costPotion || 0) <= allowedPotion
                    ) {
                        helpers.gainCard(playerIndex, gainCardId, "hand");

                        helpers.setPrompt({
                            type: "reorder",
                            targetPlayerIndex: playerIndex,
                            cardId: "artisan",
                            min: 1,
                            max: 1,
                            message:
                                "職人：山札の上に戻すカードを選択してください",
                            onConfirm: (indices: number[]) => {
                                const player = state.players[playerIndex]!;
                                const card = player.hand[indices[0]!];
                                if (card) {
                                    player.hand.splice(indices[0]!, 1);
                                    player.deck.push(card);
                                    helpers.addLog(
                                        `${player.name} は手札から1枚山札の上に戻しました。`,
                                    );
                                }
                                helpers.clearPrompt();
                            },
                        });
                    }
                },
            });
        },
    },
    bandit: {
        id: "bandit",
        name: "Bandit",
        jpName: "山賊",
        type: ["Action", "Attack"],
        cost: 5,
        description:
            "金貨1枚を獲得する。他のプレイヤーは山札の上から2枚を公開し、銅貨以外の財宝カードを1枚廃棄し、残りを捨て札にする。",
        effects: { isAttack: true },
        action: (state, playerIndex, helpers) => {
            helpers.gainCard(playerIndex, "gold");
            if (!helpers.processAttack) return;

            helpers.processAttack("bandit", (victimIdx) => {
                const victim = state.players[victimIdx]!;
                const revealed = helpers.revealCards(victimIdx, 2);
                const trashableIndices = revealed
                    .map((c, idx) =>
                        c.type.includes("Treasure") && c.id !== "copper"
                            ? idx
                            : -1,
                    )
                    .filter((idx) => idx !== -1);

                if (trashableIndices.length > 0) {
                    trashableIndices.sort(
                        (a, b) =>
                            (revealed[b]?.cost || 0) - (revealed[a]?.cost || 0),
                    );
                    const trashIdx = trashableIndices[0]!;
                    const trashedCard = revealed[trashIdx]!;
                    state.trash.push(trashedCard);
                    helpers.addLog(
                        `${victim.name} は ${trashedCard.jpName} を廃棄しました。`,
                    );
                    revealed.splice(trashIdx, 1);
                }
                victim.discard.push(...revealed);
            });
        },
    },
    bureaucrat: {
        id: "bureaucrat",
        name: "Bureaucrat",
        jpName: "役人",
        type: ["Action", "Attack"],
        cost: 4,
        description:
            "銀貨1枚を獲得し、山札の上に置く。他のプレイヤーは手札から勝利点カード1枚を山札の上に置く（持っていなければ手札を公開する）。",
        action: (state, playerIndex, helpers) => {
            helpers.gainCard(playerIndex, "silver", "deck");

            const targets = state.players
                .map((_, i) => i)
                .filter((i) => i !== playerIndex);

            const processTarget = (idx: number) => {
                if (idx >= targets.length) {
                    helpers.clearPrompt();
                    return;
                }

                const i = targets[idx]!;
                const player = state.players[i]!;
                const next = () => processTarget(idx + 1);

                if (player.hand.some((c) => c.effects?.isDefense)) {
                    helpers.addLog(`${player.name} は防御カードで防いだ！`);
                    next();
                    return;
                }

                const victoryIndices = player.hand
                    .map((c, idx) => (c.type.includes("Victory") ? idx : -1))
                    .filter((idx) => idx !== -1);
                if (victoryIndices.length > 0) {
                    helpers.setPrompt({
                        type: "reorder",
                        targetPlayerIndex: i,
                        cardId: "bureaucrat",
                        min: 1,
                        max: 1,
                        message:
                            "役人：山札の上に戻す勝利点カードを選択してください",
                        onConfirm: (indices: number[]) => {
                            const targetIdx = indices[0]!;
                            const card = player.hand.splice(targetIdx, 1)[0]!;
                            player.deck.push(card);
                            helpers.addLog(
                                `${player.name} は ${card.jpName} を山札の上に戻しました。`,
                            );
                            next();
                        },
                    });
                } else {
                    helpers.addLog(
                        `${player.name} は勝利点カードを持っていないため、手札を公開しました: ${player.hand.map((c) => c.jpName).join(", ")}`,
                    );
                    next();
                }
            };

            processTarget(0);
        },
    },
    harbinger: {
        id: "harbinger",
        name: "Harbinger",
        jpName: "先駆者",
        type: ["Action"],
        cost: 3,
        description:
            "+1 カード, +1 アクション / 捨て札からカードを1枚見て、山札の一番上に置いてもよい。",
        effects: { draw: 1, action: 1 },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            if (player.discard.length === 0) return;

            helpers.setPrompt({
                type: "reorder",
                targetPlayerIndex: playerIndex,
                source: "discard", // 指定を追加
                min: 0,
                max: 1,
                message: "先駆者：捨て札から山札に戻すカードを選択してください",
                onConfirm: (selectedIndices: number[]) => {
                    if (selectedIndices.length > 0) {
                        // This assumes selectedIndices refers to indices in DISCARD
                        const idx = selectedIndices[0]!;
                        const card = player.discard[idx];
                        if (card) {
                            player.discard.splice(idx, 1);
                            player.deck.push(card);
                            helpers.addLog(
                                `${player.name} は捨て札から ${card.jpName} を山札の上に戻しました。`,
                            );
                        }
                    }
                    helpers.clearPrompt();
                },
            });
        },
    },
    library: {
        id: "library",
        name: "Library",
        jpName: "図書室",
        type: ["Action"],
        cost: 5,
        description:
            "手札が7枚になるまで引く。アクションカードを引いた場合、それを脇に置いてもよい。脇に置かなかったカードは手札に加え、脇に置いたカードは最後に捨て札にする。",
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                // Decision: YES (aside) / NO (into hand)
                if (player.hand.length < 5)
                    return ["NO (手札に入れる)", "YES (脇に置く)"];
                return ["YES (脇に置く)", "NO (手札に入れる)"];
            },
        },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const asideCards: Card[] = [];

            const drawStep = () => {
                if (player.hand.length >= 7) {
                    if (asideCards.length > 0) {
                        player.discard.push(...asideCards);
                        helpers.addLog(
                            `${player.name} は脇に置いた ${asideCards.length} 枚のカードを捨て札にしました。`,
                        );
                    }
                    return;
                }

                const revealed = helpers.revealCards(playerIndex, 1);
                if (revealed.length === 0) {
                    if (asideCards.length > 0)
                        player.discard.push(...asideCards);
                    return;
                }

                const card = revealed[0]!;
                if (card.type.includes("Action")) {
                    helpers.setPrompt({
                        type: "choice",
                        targetPlayerIndex: playerIndex,
                        cardId: "library",
                        min: 1,
                        max: 1,
                        message: `図書室：引いた ${card.jpName} を脇に置きますか？ (現在の枚数: ${player.hand.length})`,
                        options: ["YES (脇に置く)", "NO (手札に入れる)"],
                        onConfirm: (choice: string) => {
                            if (choice.startsWith("YES")) {
                                asideCards.push(card);
                                helpers.addLog(
                                    `${player.name} は ${card.jpName} を脇に置きました。`,
                                );
                            } else {
                                player.hand.push(card);
                            }
                            helpers.clearPrompt();
                            drawStep();
                        },
                    });
                } else {
                    player.hand.push(card);
                    drawStep();
                }
            };

            drawStep();
        },
    },
    merchant: {
        id: "merchant",
        name: "Merchant",
        jpName: "商人",
        type: ["Action"],
        cost: 3,
        description:
            "+1 カード, +1 アクション / このターン最初に銀貨をプレイしたとき、+1 コイン。",
        effects: { draw: 1, action: 1 },
        action: (state, playerIndex, _) => {
            state.players[playerIndex]!.turnFlags = {
                ...state.players[playerIndex]!.turnFlags,
                merchantActive: true,
            };
        },
    },
    moneylender: {
        id: "moneylender",
        name: "Moneylender",
        jpName: "金貸し",
        type: ["Action"],
        cost: 4,
        description:
            "手札から銅貨1枚を廃棄してもよい。そうした場合、+3 コイン。",
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const copperIdx = player.hand.findIndex((c) => c.id === "copper");
            if (copperIdx !== -1) {
                // Automatic trash for better UX as per user request
                helpers.trashCard(playerIndex, copperIdx);
                player.coins += 3;
                helpers.addLog(
                    `${player.name} は銅貨を自動廃棄し、3コインを得ました。`,
                );
            }
        },
    },
    throne_room: {
        id: "throne_room",
        name: "Throne Room",
        jpName: "玉座の間",
        type: ["Action"],
        cost: 4,
        description:
            "手札からアクションカード1枚を選択する。そのカードを2回プレイする。",
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const actionIndices = player.hand
                .map((c, i) => (c.type.includes("Action") ? i : -1))
                .filter((i) => i !== -1);
            if (actionIndices.length === 0) return;

            helpers.setPrompt({
                type: "discard", // generic choice
                targetPlayerIndex: playerIndex,
                cardId: "throne_room",
                min: 1,
                max: 1,
                message:
                    "玉座の間：2回プレイするアクションカードを選択してください",
                onConfirm: (indices: number[]) => {
                    const cardIdx = indices[0]!;
                    const card = player.hand[cardIdx];
                    if (card && card.type.includes("Action")) {
                        player.hand.splice(cardIdx, 1);
                        player.inPlay.push(card);
                        helpers.addLog(
                            `${player.name} は玉座の間で ${card.jpName} を2回プレイします。`,
                        );

                        // Increment executing count to prevent phase advance before both plays finish
                        player.turnFlags = {
                            ...player.turnFlags,
                            executingCount:
                                (player.turnFlags?.executingCount || 0) + 1,
                        };
                        helpers.clearPrompt();

                        const hookPrompt = (
                            prompt: any,
                            onComplete: () => void,
                        ) => {
                            const originalConfirm = prompt.onConfirm;
                            prompt.onConfirm = (result: any) => {
                                originalConfirm(result);
                                const nextPrompt = helpers.getPrompt();
                                if (nextPrompt && nextPrompt !== prompt) {
                                    hookPrompt(nextPrompt, onComplete);
                                } else {
                                    onComplete();
                                }
                            };
                        };

                        const executeSequentially = (remaining: number) => {
                            if (remaining <= 0) {
                                // All plays finished, decrement executing count and check phase
                                player.turnFlags = {
                                    ...player.turnFlags,
                                    executingCount: Math.max(
                                        0,
                                        (player.turnFlags?.executingCount ||
                                            0) - 1,
                                    ),
                                };
                                helpers.checkActionPhase();
                                return;
                            }

                            // Apply effects
                            if (card.effects) {
                                if (card.effects.draw)
                                    helpers.drawCards(
                                        playerIndex,
                                        card.effects.draw,
                                    );
                                if (card.effects.action)
                                    player.actions += card.effects.action;
                                if (card.effects.buy)
                                    player.buys += card.effects.buy;
                                if (card.effects.coin)
                                    player.coins += card.effects.coin;
                            }

                            // Trigger action
                            if (card.action) {
                                card.action(state, playerIndex, helpers);
                            }

                            // Check if the card just set a prompt
                            const activePrompt = helpers.getPrompt();
                            if (activePrompt) {
                                hookPrompt(activePrompt, () =>
                                    executeSequentially(remaining - 1),
                                );
                            } else {
                                // No prompt set, immediately go to next
                                executeSequentially(remaining - 1);
                            }
                        };

                        // Start the sequence of 2 plays
                        executeSequentially(2);
                    } else {
                        helpers.clearPrompt();
                    }
                },
            });
        },
    },
    vassal: {
        id: "vassal",
        name: "Vassal",
        jpName: "家臣",
        type: ["Action"],
        cost: 3,
        description:
            "+2 コイン / 山札の一番上のカードを捨て札にする。それがアクションカードの場合、それをプレイしてもよい。",
        ai: {
            getChoicePriorities: (_state, _playerIndex) => {
                return ["YES", "NO"];
            },
        },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const revealed = helpers.revealCards(playerIndex, 1);
            if (revealed.length > 0) {
                const card = revealed[0]!;
                if (card.type.includes("Action")) {
                    helpers.setPrompt({
                        type: "choice",
                        targetPlayerIndex: playerIndex,
                        cardId: "vassal",
                        min: 1,
                        max: 1,
                        message: `家臣：公開された ${card.jpName} をプレイしますか？`,
                        options: ["YES", "NO"],
                        onConfirm: (choice: string) => {
                            if (choice === "YES") {
                                // Increment executing count for playing this action
                                player.turnFlags = {
                                    ...player.turnFlags,
                                    executingCount:
                                        (player.turnFlags?.executingCount ||
                                            0) + 1,
                                };
                                helpers.clearPrompt();

                                // Play logic
                                player.inPlay.push(card);
                                helpers.addLog(
                                    `${player.name} は家臣の効果で ${card.jpName} をプレイしました。`,
                                );

                                // Trigger action
                                if (card.effects) {
                                    if (card.effects.draw)
                                        helpers.drawCards(
                                            playerIndex,
                                            card.effects.draw,
                                        );
                                    if (card.effects.action)
                                        player.actions += card.effects.action;
                                    if (card.effects.buy)
                                        player.buys += card.effects.buy;
                                    if (card.effects.coin)
                                        player.coins += card.effects.coin;
                                }

                                const onComplete = () => {
                                    player.turnFlags = {
                                        ...player.turnFlags,
                                        executingCount: Math.max(
                                            0,
                                            (player.turnFlags?.executingCount ||
                                                0) - 1,
                                        ),
                                    };
                                    helpers.checkActionPhase();
                                };

                                const hookPromptVassal = (prompt: any) => {
                                    const originalConfirm = prompt.onConfirm;
                                    prompt.onConfirm = (result: any) => {
                                        originalConfirm(result);
                                        const nextPrompt = helpers.getPrompt();
                                        if (
                                            nextPrompt &&
                                            nextPrompt !== prompt
                                        ) {
                                            hookPromptVassal(nextPrompt);
                                        } else {
                                            onComplete();
                                        }
                                    };
                                };

                                if (card.action) {
                                    card.action(state, playerIndex, helpers);
                                }

                                const activePrompt = helpers.getPrompt();
                                if (activePrompt) {
                                    hookPromptVassal(activePrompt);
                                } else {
                                    onComplete();
                                }
                            } else {
                                helpers.clearPrompt();
                                player.discard.push(card);
                                helpers.addLog(
                                    `${player.name} は ${card.jpName} をプレイせずに捨て札にしました。`,
                                );
                            }
                        },
                    });
                } else {
                    player.discard.push(card);
                    helpers.addLog(
                        `${player.name} は ${card.jpName} を捨て札にしました。`,
                    );
                }
            }
        },
    },
    workshop: {
        id: "workshop",
        name: "Workshop",
        jpName: "工房",
        type: ["Action"],
        cost: 3,
        description: "コスト4までのカード1枚を獲得する。",
        action: (_state, playerIndex, helpers) => {
            helpers.setPrompt({
                type: "gain",
                targetPlayerIndex: playerIndex,
                cardId: "workshop",
                min: 1,
                max: 1,
                allowedCost: 4,
                message: "工房：コスト4までのカードを選択してください",
                onConfirm: (cardId: string) => {
                    const currentCost = helpers.getCardCost(
                        cardId,
                        playerIndex,
                    );
                    const targetCard = helpers.getCard(cardId);
                    const allowedPotion = 0; // 工房はポーション0固定
                    if (
                        currentCost <= 4 &&
                        (targetCard?.costPotion || 0) <= allowedPotion
                    ) {
                        helpers.gainCard(playerIndex, cardId);
                        helpers.clearPrompt();
                    }
                },
            });
        },
    },
};
