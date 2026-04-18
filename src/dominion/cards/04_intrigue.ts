import type { Card } from "../types";
import { getAICardValueInHand } from "../aiHelpers";

export const INTRIGUE_CARDS: Record<string, Card> = {
    duke: {
        id: "duke",
        name: "Duke",
        jpName: "公爵",
        type: ["Victory"],
        cost: 5,
        description: "あなたのデッキの公領1枚につき、1 勝利点。",
        points: (state, playerIndex) => {
            const player = state.players[playerIndex]!;
            const totalDuchies = [
                ...player.hand,
                ...player.deck,
                ...player.discard,
                ...player.inPlay,
            ].filter((c) => c.id === "duchy").length;
            return totalDuchies;
        },
    },
    shanty_town: {
        id: "shanty_town",
        name: "Shanty Town",
        jpName: "貧民街",
        type: ["Action"],
        cost: 3,
        description:
            "+2 アクション / 手札を公開する。手札にアクションカードが1枚もない場合、+2 カード。",
        effects: { action: 2 },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const cardNames = player.hand.map((c) => c.jpName).join("、");
            helpers.addLog(
                `${player.name} は貧民街の効果で手札を公開しました（${cardNames || "手札なし"}）。`,
            );

            const hasAction = player.hand.some((c) =>
                c.type.includes("Action"),
            );
            if (!hasAction) {
                helpers.drawCards(playerIndex, 2);
            }
        },
    },
    conspirator: {
        id: "conspirator",
        name: "Conspirator",
        jpName: "共謀者",
        type: ["Action"],
        cost: 4,
        description:
            "+2 コイン / これがこのターンで使用する3枚目以上のアクションカードである場合（このカードも数える）、+1 カード、+1 アクション。",
        effects: { coin: 2 },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const actionCount = player.inPlay.filter((c) =>
                c.type.includes("Action"),
            ).length;
            if (actionCount >= 3) {
                helpers.drawCards(playerIndex, 1);
                player.actions += 1;
                helpers.addLog(
                    `${player.name} は共謀者の条件を満たし、+1 カード、+1 アクションを得ました。`,
                );
            }
        },
    },
    mill: {
        id: "mill",
        name: "Mill",
        jpName: "製粉所",
        type: ["Action", "Victory"],
        cost: 4,
        description:
            "+1 カード, +1 アクション / 手札を2枚捨ててもよい。そうした場合、+2 コイン。 / 1 勝利点",
        effects: { draw: 1, action: 1 },
        points: () => 1,
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                const junk = player.hand.filter(
                    (c) =>
                        getAICardValueInHand(c, state, playerIndex, "discard") <
                        20,
                );
                if (junk.length >= 2) return ["YES (2枚捨てて+2コイン)", "NO"];
                return ["NO", "YES (2枚捨てて+2コイン)"];
            },
        },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            if (player.hand.length >= 2) {
                helpers.setPrompt({
                    type: "choice",
                    targetPlayerIndex: playerIndex,
                    cardId: "mill",
                    min: 1,
                    max: 1,
                    message:
                        "製粉所：手札を2枚捨てますか？（2枚ちょうど捨てると+2コイン）",
                    options: ["YES (2枚捨てて+2コイン)", "NO"],
                    onConfirm: (choice: string) => {
                        if (choice.startsWith("YES")) {
                            helpers.setPrompt({
                                type: "discard",
                                targetPlayerIndex: playerIndex,
                                cardId: "mill",
                                min: 2,
                                max: 2,
                                message:
                                    "製粉所：捨てる手札を2枚選択してください",
                                onConfirm: (indices: number[]) => {
                                    player.coins += 2;
                                    helpers.addLog(
                                        `${player.name} は製粉所の効果で2枚捨て、2コインを得ました。`,
                                    );
                                    helpers.discardSelected(
                                        playerIndex,
                                        indices,
                                    );
                                    helpers.clearPrompt();
                                },
                            });
                        } else {
                            helpers.clearPrompt();
                        }
                    },
                });
            } else if (player.hand.length === 1) {
                helpers.setPrompt({
                    type: "choice",
                    targetPlayerIndex: playerIndex,
                    cardId: "mill",
                    min: 1,
                    max: 1,
                    message:
                        "製粉所：手札を1枚捨てますか？（追加コインは得られませんが、地下貯蔵庫などのトリガーになります）",
                    options: ["YES (1枚捨てる)", "NO"],
                    onConfirm: (choice: string) => {
                        if (choice.startsWith("YES")) {
                            helpers.setPrompt({
                                type: "discard",
                                targetPlayerIndex: playerIndex,
                                cardId: "mill",
                                min: 1,
                                max: 1,
                                message:
                                    "製粉所：捨てる手札を1枚選択してください",
                                onConfirm: (indices: number[]) => {
                                    helpers.discardSelected(
                                        playerIndex,
                                        indices,
                                    );
                                    helpers.clearPrompt();
                                },
                            });
                        } else {
                            helpers.clearPrompt();
                        }
                    },
                });
            }
        },
    },
    steward: {
        id: "steward",
        name: "Steward",
        jpName: "執事",
        type: ["Action"],
        cost: 3,
        description:
            "+2 カード、または +2 コイン、または 手札から2枚を廃棄する。",
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                const badCards = player.hand.filter(
                    (c) =>
                        getAICardValueInHand(c, state, playerIndex, "trash") <
                        20,
                );
                if (badCards.length >= 2) return ["2枚廃棄"];
                if (player.coins < 6) return ["+2 コイン"];
                return ["+2 カード"];
            },
        },
        action: (state, playerIndex, helpers) => {
            helpers.setPrompt({
                type: "choice",
                targetPlayerIndex: playerIndex,
                cardId: "steward",
                min: 1,
                max: 1,
                message: "執事：効果を選択してください",
                options: ["+2 カード", "+2 コイン", "2枚廃棄"],
                onConfirm: (choice: string) => {
                    if (choice === "+2 カード") {
                        helpers.drawCards(playerIndex, 2);
                    } else if (choice === "+2 コイン") {
                        state.players[playerIndex]!.coins += 2;
                        helpers.addLog(
                            `${state.players[playerIndex]!.name} は+2 コインを得ました。`,
                        );
                    } else if (choice === "2枚廃棄") {
                        helpers.setPrompt({
                            type: "trash",
                            targetPlayerIndex: playerIndex,
                            cardId: "steward",
                            min: 2,
                            max: 2,
                            message:
                                "執事：廃棄するカードを2枚選択してください",
                            onConfirm: (indices: number[]) => {
                                const sorted = [...indices].sort(
                                    (a, b) => b - a,
                                );
                                sorted.forEach((idx) =>
                                    helpers.trashCard(playerIndex, idx),
                                );
                                helpers.clearPrompt();
                            },
                        });
                        return; // Don't clear prompt yet
                    }
                    helpers.clearPrompt();
                },
            });
        },
    },
    nobles: {
        id: "nobles",
        name: "Nobles",
        jpName: "貴族",
        type: ["Action", "Victory"],
        cost: 6,
        points: 2,
        description:
            "2 勝利点 / 次のうちいずれか1つを選択する：(＋3 カード); (＋2 アクション)。",
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                if (player.actions === 0) return ["+2 アクション"];
                return ["+3 カード"];
            },
        },
        action: (state, playerIndex, helpers) => {
            helpers.setPrompt({
                type: "choice",
                targetPlayerIndex: playerIndex,
                cardId: "nobles",
                min: 1,
                max: 1,
                message: "貴族：効果を選択してください",
                options: ["+3 カード", "+2 アクション"],
                onConfirm: (choice: string) => {
                    if (choice === "+3 カード") {
                        helpers.drawCards(playerIndex, 3);
                    } else {
                        state.players[playerIndex]!.actions += 2;
                        helpers.addLog(
                            `${state.players[playerIndex]!.name} は+2 アクションを得ました。`,
                        );
                    }
                    helpers.clearPrompt();
                },
            });
        },
    },
    baron: {
        id: "baron",
        name: "Baron",
        jpName: "男爵",
        type: ["Action"],
        cost: 4,
        description:
            "+1 購入 / 手札から屋敷1枚を捨ててもよい。そうした場合、+4 コイン。しなければ、屋敷1枚を獲得する。",
        effects: { buy: 1 },
        ai: {
            getChoicePriorities: () => {
                return ["YES (屋敷を捨てて+4コイン)", "NO (屋敷を獲得する)"];
            },
        },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const estateIdx = player.hand.findIndex((c) => c.id === "estate");

            if (estateIdx !== -1) {
                helpers.setPrompt({
                    type: "choice",
                    targetPlayerIndex: playerIndex,
                    cardId: "baron",
                    min: 1,
                    max: 1,
                    message: "男爵：屋敷を捨てて+4 コインを得ますか？",
                    options: [
                        "YES (屋敷を捨てて+4コイン)",
                        "NO (屋敷を獲得する)",
                    ],
                    onConfirm: (choice: string) => {
                        if (choice.startsWith("YES")) {
                            const idx = player.hand.findIndex(
                                (c) => c.id === "estate",
                            );
                            if (idx !== -1) {
                                const card = player.hand.splice(idx, 1)[0]!;
                                player.discard.push(card);
                                player.coins += 4;
                                helpers.addLog(
                                    `${player.name} は屋敷を捨てて+4 コインを得ました。`,
                                );
                            }
                        } else {
                            helpers.gainCard(playerIndex, "estate");
                        }
                        helpers.clearPrompt();
                    },
                });
            } else {
                helpers.gainCard(playerIndex, "estate");
            }
        },
    },
    trading_post: {
        id: "trading_post",
        name: "Trading Post",
        jpName: "交易場",
        type: ["Action"],
        cost: 5,
        description:
            "手札からカード2枚を廃棄する。そうした場合、銀貨1枚を獲得し、手札に加える。",
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            if (player.hand.length === 0) return;

            helpers.setPrompt({
                type: "trash",
                targetPlayerIndex: playerIndex,
                cardId: "trading_post",
                min: 0,
                max: 2,
                message: "交易場：廃棄するカードを2枚選択してください",
                onConfirm: (indices: number[]) => {
                    const sorted = [...indices].sort((a, b) => b - a);
                    sorted.forEach((idx) =>
                        helpers.trashCard(playerIndex, idx),
                    );
                    if (indices.length === 2) {
                        helpers.gainCard(playerIndex, "silver", "hand");
                    }
                    helpers.clearPrompt();
                },
            });
        },
    },
    upgrade: {
        id: "upgrade",
        name: "Upgrade",
        jpName: "改良",
        type: ["Action"],
        cost: 5,
        description:
            "+1 カード, +1 アクション / 手札からカード1枚を廃棄する。廃棄したカードよりコストがちょうど1高いカード1枚を獲得する。",
        effects: { draw: 1, action: 1 },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            if (player.hand.length === 0) return;

            helpers.setPrompt({
                type: "trash",
                targetPlayerIndex: playerIndex,
                cardId: "upgrade",
                min: 1,
                max: 1,
                message: "改良：廃棄するカードを1枚選択してください",
                options: player.hand.map((c, i) => `${i}: ${c.jpName}`),
                onConfirm: (indices: number[]) => {
                    const card = player.hand[indices[0]!];
                    if (card) {
                        const trashedCost = helpers.getCardCost(
                            card.id,
                            playerIndex,
                        );
                        const trashedPotion = card.costPotion || 0;
                        const targetCost = trashedCost + 1;
                        helpers.trashCard(playerIndex, indices[0]!);

                        // Check if any card with targetCost is available in supply
                        const canGain = Object.entries(state.supply).some(
                            ([id, count]) => {
                                const currentCost = helpers.getCardCost(
                                    id,
                                    playerIndex,
                                );
                                const c = helpers.getCard(id);
                                return (
                                    currentCost === targetCost &&
                                    (c?.costPotion || 0) === trashedPotion &&
                                    count > 0
                                );
                            },
                        );

                        if (!canGain) {
                            helpers.addLog(
                                `サプライに現在のコストが ${targetCost}${trashedPotion > 0 ? "+🧪" : ""} のカードがないため、獲得は行われません。`,
                            );
                            helpers.clearPrompt();
                            return;
                        }

                        helpers.setPrompt({
                            type: "gain",
                            targetPlayerIndex: playerIndex,
                            cardId: "upgrade",
                            min: 1,
                            max: 1,
                            allowedCost: targetCost,
                            allowedPotion: trashedPotion,
                            exactCost: true,
                            message: `改良：コストがちょうど ${targetCost}${trashedPotion > 0 ? "+🧪" : ""} のカードを獲得してください`,
                            onConfirm: (gainId: string) => {
                                const currentGainCost = helpers.getCardCost(
                                    gainId,
                                    playerIndex,
                                );
                                const targetCard = helpers.getCard(gainId);
                                if (
                                    currentGainCost === targetCost &&
                                    (targetCard?.costPotion || 0) ===
                                        trashedPotion
                                ) {
                                    helpers.gainCard(playerIndex, gainId);
                                    helpers.clearPrompt();
                                }
                            },
                        });
                    } else {
                        helpers.clearPrompt();
                    }
                },
            });
        },
    },
    patrol: {
        id: "patrol",
        name: "Patrol",
        jpName: "パトロール",
        type: ["Action"],
        cost: 5,
        description:
            "+3 カード / 山札の上から4枚を公開する。その中の勝利点カードと呪いカードをすべて手札に加え、残りを好きな順で山札の上に戻す。",
        effects: { draw: 3 },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const revealed = helpers.revealCards(playerIndex, 4);
            if (revealed.length === 0) return;

            const toHand: Card[] = [];
            const backToDeck: Card[] = [];

            revealed.forEach((c) => {
                if (c.type.includes("Victory") || c.type.includes("Curse")) {
                    toHand.push(c);
                } else {
                    backToDeck.push(c);
                }
            });

            player.hand.push(...toHand);
            if (toHand.length > 0) {
                helpers.addLog(
                    `${player.name} は公開された中から ${toHand.map((c) => c.jpName).join(", ")} を手札に加えました。`,
                );
            }

            if (backToDeck.length > 0) {
                if (backToDeck.length === 1) {
                    player.deck.push(backToDeck[0]!);
                } else {
                    helpers.setPrompt({
                        type: "reorder",
                        targetPlayerIndex: playerIndex,
                        cardId: "patrol",
                        revealedCards: backToDeck,
                        min: backToDeck.length,
                        max: backToDeck.length,
                        message:
                            "パトロール：山札に戻す順番を（上から順に）選択してください",
                        onConfirm: (indices: number[]) => {
                            const reordered = indices.map(
                                (idx) => backToDeck[idx]!,
                            );
                            for (let i = reordered.length - 1; i >= 0; i--) {
                                player.deck.push(reordered[i]!);
                            }
                            helpers.clearPrompt();
                        },
                    });
                }
            }
        },
    },
    torturer: {
        id: "torturer",
        name: "Torturer",
        jpName: "拷問人",
        type: ["Action", "Attack"],
        cost: 5,
        description:
            "+3 カード / 他のプレイヤーは全員、次のいずれか1つを選択する。「手札からカード2枚を捨てる」「呪いカード1枚を獲得し、手札に加える」。",
        effects: { draw: 3, isAttack: true },
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                if (player.hand.length >= 4) return ["2枚捨てる"];
                return ["呪いを手札に獲得する"];
            },
        },
        action: (state, playerIndex, helpers) => {
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

                helpers.setPrompt({
                    type: "choice",
                    targetPlayerIndex: i,
                    cardId: "torturer",
                    min: 1,
                    max: 1,
                    message: "拷問人：どちらかを選択してください",
                    options: ["2枚捨てる", "呪いを手札に獲得する"],
                    onConfirm: (choice: string) => {
                        if (choice.includes("捨てる")) {
                            const discardAmount = Math.min(
                                2,
                                player.hand.length,
                            );
                            if (discardAmount > 0) {
                                helpers.setPrompt({
                                    type: "discard",
                                    targetPlayerIndex: i,
                                    min: discardAmount,
                                    max: discardAmount,
                                    message: `拷問人：手札を${discardAmount}枚捨ててください`,
                                    onConfirm: (indices: number[]) => {
                                        helpers.discardSelected(i, indices);
                                        next();
                                    },
                                });
                            } else {
                                next();
                            }
                        } else {
                            helpers.gainCard(i, "curse", "hand");
                            next();
                        }
                    },
                });
            };

            processTarget(0);
        },
    },
    minion: {
        id: "minion",
        name: "Minion",
        jpName: "寵臣",
        type: ["Action", "Attack"],
        cost: 5,
        description:
            "+1 アクション / 1つを選択する：(＋2 コイン); または (手札をすべて捨て、＋4 カード。他のプレイヤーは全員、手札が5枚以上ならそれらをすべて捨て、＋4 カード)。",
        effects: { action: 1, isAttack: true },
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                if (player.hand.filter((c) => c.id === "minion").length > 0)
                    return ["+2 コイン", "手札入れ替え (+4 カード)"];
                const handVal = player.hand.reduce(
                    (sum, c) =>
                        sum +
                        getAICardValueInHand(c, state, playerIndex, "discard"),
                    0,
                );
                if (handVal > 150)
                    return ["+2 コイン", "手札入れ替え (+4 カード)"];
                return ["手札入れ替え (+4 カード)", "+2 コイン"];
            },
        },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            helpers.setPrompt({
                type: "choice",
                targetPlayerIndex: playerIndex,
                cardId: "minion",
                min: 1,
                max: 1,
                message: "寵臣：効果を選択してください",
                options: ["+2 コイン", "手札入れ替え (+4 カード)"],
                onConfirm: (choice: string) => {
                    if (choice.includes("コイン")) {
                        player.coins += 2;
                        helpers.addLog(
                            `${player.name} は寵臣の効果で+2 コインを得ました。`,
                        );
                    } else {
                        const handSize = player.hand.length;
                        if (handSize > 0) {
                            player.discard.push(...player.hand);
                            player.hand = [];
                        }
                        helpers.drawCards(playerIndex, 4);
                        helpers.addLog(
                            `${player.name} は手札をすべて捨て、4枚引きました。`,
                        );

                        state.players.forEach((p, i) => {
                            if (i === playerIndex) return;
                            if (p.hand.some((c) => c.effects?.isDefense)) {
                                helpers.addLog(
                                    `${p.name} は防御カードで防いだ！`,
                                );
                                return;
                            }
                            if (p.hand.length >= 5) {
                                p.discard.push(...p.hand);
                                p.hand = [];
                                helpers.drawCards(i, 4);
                                helpers.addLog(
                                    `${p.name} は手札が5枚以上だったので、すべて捨てて4枚引きました。`,
                                );
                            }
                        });
                    }
                    helpers.clearPrompt();
                },
            });
        },
    },
    pawn: {
        id: "pawn",
        name: "Pawn",
        jpName: "手先",
        type: ["Action"],
        cost: 2,
        description:
            "次のうち異なる2つを選択する：(＋1 カード); (＋1 アクション); (＋1 購入); (＋1 コイン)。",
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const priorities = [];
                if (state.players[playerIndex]!.actions === 0)
                    priorities.push("+1 アクション");
                priorities.push("+1 カード");
                if (!priorities.includes("+1 アクション"))
                    priorities.push("+1 アクション");
                priorities.push("+1 コイン");
                priorities.push("+1 購入");
                return priorities;
            },
        },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            helpers.setPrompt({
                type: "choice",
                targetPlayerIndex: playerIndex,
                cardId: "pawn",
                min: 2,
                max: 2,
                maxChoices: 2,
                message: "手先：異なる2つを選択してください",
                options: ["+1 カード", "+1 アクション", "+1 購入", "+1 コイン"],
                onConfirm: (choices: string[]) => {
                    choices.forEach((choice) => {
                        if (choice === "+1 カード")
                            helpers.drawCards(playerIndex, 1);
                        if (choice === "+1 アクション") player.actions += 1;
                        if (choice === "+1 購入") player.buys += 1;
                        if (choice === "+1 コイン") player.coins += 1;
                    });
                    helpers.addLog(
                        `${player.name} は手先の効果で ${choices.join(", ")} を得ました。`,
                    );
                    helpers.clearPrompt();
                },
            });
        },
    },
    courtier: {
        id: "courtier",
        name: "Courtier",
        jpName: "廷臣",
        type: ["Action"],
        cost: 5,
        description:
            "手札からカード1枚を公開する。そのカードの持っている種類（アクション、勝利点など）1つにつき、次の中から異なる1つを選択する。" +
            "(＋1 アクション); (＋1 購入); (＋3 コイン); (金貨1枚を獲得する)。",
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                const sortedHand = [...player.hand].sort(
                    (a, b) => b.type.length - a.type.length,
                );
                const priorities1 = sortedHand.map((c) => {
                    const originalIdx = player.hand.indexOf(c);
                    return `${originalIdx}: ${c.jpName}`;
                });
                const priorities2 = [
                    "金貨を獲得",
                    "+3 コイン",
                    "+1 アクション",
                    "+1 購入",
                ];
                return [...priorities1, ...priorities2];
            },
        },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            if (player.hand.length === 0) return;
            helpers.setPrompt({
                type: "choice",
                targetPlayerIndex: playerIndex,
                cardId: "courtier",
                min: 1,
                max: 1,
                message: "廷臣：公開するカードを選択してください",
                options: player.hand.map((c, i) => `${i}: ${c.jpName}`),
                onConfirm: (choice: string) => {
                    const idx = parseInt(choice.split(":")[0]!);
                    const card = player.hand[idx]!;
                    const types = card.type.length;
                    helpers.addLog(
                        `${player.name} は ${card.jpName} を公開しました（種類数: ${types}）。`,
                    );

                    const options = [
                        "+1 アクション",
                        "+1 購入",
                        "+3 コイン",
                        "金貨を獲得",
                    ];
                    const numToSelect = Math.min(types, options.length);

                    helpers.setPrompt({
                        type: "choice",
                        targetPlayerIndex: playerIndex,
                        cardId: "courtier",
                        min: numToSelect,
                        max: numToSelect,
                        maxChoices: numToSelect,
                        message: `廷臣：効果を${numToSelect}個選択してください`,
                        options: options,
                        onConfirm: (choices: string[]) => {
                            choices.forEach((c) => {
                                const p = state.players[playerIndex]!;
                                if (c === "+1 アクション") p.actions += 1;
                                if (c === "+1 購入") p.buys += 1;
                                if (c === "+3 コイン") p.coins += 3;
                                if (c === "金貨を獲得")
                                    helpers.gainCard(playerIndex, "gold");
                            });
                            helpers.addLog(
                                `${player.name} は廷臣の効果で ${choices.join(", ")} を得ました。`,
                            );
                            helpers.clearPrompt();
                        },
                    });
                },
            });
        },
    },
    great_hall: {
        id: "great_hall",
        name: "Great Hall",
        jpName: "大広間",
        type: ["Action", "Victory"],
        cost: 3,
        description: "+1 カード, +1 アクション / 1 勝利点",
        effects: { draw: 1, action: 1 },
        points: 1,
    },
    harem: {
        id: "harem",
        name: "Harem",
        jpName: "ハーレム",
        type: ["Treasure", "Victory"],
        cost: 6,
        treasure: 2,
        description: "2 コイン / 2 勝利点",
        points: 2,
    },
    courtyard: {
        id: "courtyard",
        name: "Courtyard",
        jpName: "中庭",
        type: ["Action"],
        cost: 2,
        description: "+3 カード / 手札からカード1枚を山札の上に戻す。",
        effects: { draw: 3 },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            if (player.hand.length === 0) return;
            helpers.setPrompt({
                type: "reorder",
                targetPlayerIndex: playerIndex,
                cardId: "courtyard",
                min: 1,
                max: 1,
                message: "中庭：手札から山札に1枚戻してください",
                onConfirm: (indices: number[]) => {
                    if (indices.length > 0) {
                        const idx = indices[0]!;
                        const card = player.hand.splice(idx, 1)[0]!;
                        player.deck.push(card);
                        helpers.addLog(
                            `${player.name} はカードを1枚山札に戻しました。`,
                        );
                    }
                    helpers.clearPrompt();
                },
            });
        },
    },
    ironworks: {
        id: "ironworks",
        name: "Ironworks",
        jpName: "鉄工所",
        type: ["Action"],
        cost: 4,
        description:
            "コスト4までのカード1枚を獲得する。獲得したカードが： アクションなら＋1 アクション; 財宝なら＋1 コイン; 勝利点なら＋1 カード。",
        action: (state, playerIndex, helpers) => {
            helpers.setPrompt({
                type: "gain",
                targetPlayerIndex: playerIndex,
                cardId: "ironworks",
                allowedCost: 4,
                min: 1,
                max: 1,
                message: "鉄工所：コスト4以下のカードを獲得してください",
                onConfirm: (gainId: string) => {
                    const currentCost = helpers.getCardCost(
                        gainId,
                        playerIndex,
                    );
                    const targetCard = helpers.getCard(gainId);
                    const allowedPotion = 0;
                    if (
                        currentCost <= 4 &&
                        (targetCard?.costPotion || 0) <= allowedPotion
                    ) {
                        helpers.gainCard(playerIndex, gainId);
                        const gainedCard = helpers.getCard(gainId);
                        if (gainedCard) {
                            const p = state.players[playerIndex]!;
                            const types = gainedCard.type;
                            const bonuses: string[] = [];
                            if (types.includes("Action")) {
                                p.actions += 1;
                                bonuses.push("+1 アクション");
                            }
                            if (types.includes("Treasure")) {
                                p.coins += 1;
                                bonuses.push("+1 コイン");
                            }
                            if (types.includes("Victory")) {
                                helpers.drawCards(playerIndex, 1);
                                bonuses.push("+1 カード");
                            }
                            if (bonuses.length > 0) {
                                helpers.addLog(
                                    `${p.name} は鉄工所の効果で ${bonuses.join(", ")} を得ました。`,
                                );
                            }
                        }
                        helpers.clearPrompt();
                    }
                },
            });
        },
    },
    coppersmith: {
        id: "coppersmith",
        name: "Coppersmith",
        jpName: "銅細工師",
        type: ["Action"],
        cost: 4,
        description:
            "このターン、銅貨を場に出したとき、それは追加で1コインを生み出す。",
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            player.turnFlags = player.turnFlags || {};
            player.turnFlags.coppersmithActive =
                (player.turnFlags.coppersmithActive || 0) + 1;
            helpers.addLog(`${player.name} は銅細工師を使用しました。`);
        },
    },
    scout: {
        id: "scout",
        name: "Scout",
        jpName: "偵察員",
        type: ["Action"],
        cost: 4,
        description:
            "+1 アクション / 山札の上から4枚を公開する。その中の勝利点カードをすべて手札に加え、残りを好きな順で山札の上に戻す。",
        effects: { action: 1 },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const revealed = helpers.revealCards(playerIndex, 4);
            if (revealed.length === 0) return;
            const toHand: Card[] = [];
            const backToDeck: Card[] = [];
            revealed.forEach((c) => {
                if (c.type.includes("Victory")) toHand.push(c);
                else backToDeck.push(c);
            });
            player.hand.push(...toHand);
            if (toHand.length > 0)
                helpers.addLog(
                    `${player.name} は公開された中から ${toHand.map((c) => c.jpName).join("、")} を手札に加えました。`,
                );
            if (backToDeck.length > 0) {
                if (backToDeck.length === 1) {
                    player.deck.push(backToDeck[0]!);
                } else {
                    helpers.setPrompt({
                        type: "reorder",
                        targetPlayerIndex: playerIndex,
                        cardId: "scout",
                        revealedCards: backToDeck,
                        min: backToDeck.length,
                        max: backToDeck.length,
                        message:
                            "偵察員：山札に戻す順番を（上から順に）選択してください",
                        onConfirm: (indices: number[]) => {
                            const reordered = indices.map(
                                (idx) => backToDeck[idx]!,
                            );
                            for (let i = reordered.length - 1; i >= 0; i--)
                                player.deck.push(reordered[i]!);
                            helpers.clearPrompt();
                        },
                    });
                }
            }
        },
    },
    mining_village: {
        id: "mining_village",
        name: "Mining Village",
        jpName: "鉱山の村",
        type: ["Action"],
        cost: 4,
        description:
            "+1 カード, +2 アクション / あなたはこのカードを直ちに廃棄してもよい。そうした場合、＋2 コイン。",
        effects: { draw: 1, action: 2 },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            helpers.setPrompt({
                type: "choice",
                targetPlayerIndex: playerIndex,
                cardId: "mining_village",
                min: 1,
                max: 1,
                message: "鉱山の村：このカードを廃棄して＋2 コインを得ますか？",
                options: ["YES (廃棄する)", "NO (廃棄しない)"],
                onConfirm: (choice: string) => {
                    if (choice.includes("YES")) {
                        const actualIndex = player.inPlay.findIndex(
                            (c) => c.id === "mining_village",
                        );
                        if (actualIndex !== -1) {
                            const card = player.inPlay.splice(
                                actualIndex,
                                1,
                            )[0]!;
                            state.trash.push(card);
                            player.coins += 2;
                            helpers.addLog(
                                `${player.name} は鉱山の村を廃棄し、+2 コインを得ました。`,
                            );
                        }
                    }
                    helpers.clearPrompt();
                },
            });
        },
    },
    tribute: {
        id: "tribute",
        name: "Tribute",
        jpName: "貢物",
        type: ["Action"],
        cost: 5,
        description:
            "左隣のプレイヤーは自分の山札の上から2枚のカードを公開し、それらを捨て札にする。それらのカードの異なる種類ごとに、あなたは以下の利益を得る... (省略)",
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const leftPlayerIndex = (playerIndex + 1) % state.players.length;
            const leftPlayer = state.players[leftPlayerIndex]!;
            const revealed: Card[] = [];
            for (let i = 0; i < 2; i++) {
                if (leftPlayer.deck.length === 0) {
                    if (leftPlayer.discard.length > 0) {
                        leftPlayer.deck = [...leftPlayer.discard];
                        leftPlayer.discard = [];
                        helpers.shuffle(leftPlayer.deck);
                        helpers.addLog(
                            `${leftPlayer.name} は捨て札をシャッフルして山札に戻しました。`,
                        );
                    }
                }
                const card = leftPlayer.deck.pop();
                if (card) {
                    revealed.push(card);
                    leftPlayer.discard.push(card);
                }
            }
            if (revealed.length > 0) {
                helpers.addLog(
                    `${leftPlayer.name} は ${revealed.map((c) => c.jpName).join("、")} を公開して捨て札にしました。`,
                );
                const typesFound = new Set<string>();
                revealed.forEach((c) =>
                    c.type.forEach((t) => typesFound.add(t)),
                );
                const bonuses: string[] = [];
                if (typesFound.has("Action")) {
                    player.actions += 2;
                    bonuses.push("+2 アクション");
                }
                if (typesFound.has("Treasure")) {
                    player.coins += 2;
                    bonuses.push("+2 コイン");
                }
                if (typesFound.has("Victory")) {
                    helpers.drawCards(playerIndex, 2);
                    bonuses.push("+2 カード");
                }
                if (bonuses.length > 0) {
                    helpers.addLog(
                        `${player.name} は貢物の効果で ${bonuses.join("、")} を得ました。`,
                    );
                }
            }
        },
    },
    secret_chamber: {
        id: "secret_chamber",
        name: "Secret Chamber",
        jpName: "秘密の部屋",
        type: ["Action", "Reaction"],
        cost: 2,
        description:
            "好きな枚数のカードを捨て札にする。捨て札にしたカード1枚につき+1コイン / アタックに対するリアクション...",
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            if (player.hand.length === 0) return;
            helpers.setPrompt({
                type: "discard",
                targetPlayerIndex: playerIndex,
                cardId: "secret_chamber",
                min: 0,
                max: player.hand.length,
                message:
                    "秘密の部屋：捨てるカードを選択してください（1枚につき+1コイン）",
                onConfirm: (indices: number[]) => {
                    if (indices.length > 0) {
                        helpers.discardSelected(playerIndex, indices);
                        player.coins += indices.length;
                        helpers.addLog(
                            `${player.name} は ${indices.length} 枚捨て、+${indices.length} コインを得ました。`,
                        );
                    }
                    helpers.clearPrompt();
                },
            });
        },
        ai: {
            shouldReact: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                const victoryCards = player.hand.filter((c) =>
                    c.type.includes("Victory"),
                ).length;
                return victoryCards > 0 || player.hand.length < 5;
            },
        },
        onAttackReaction: (state, victimIndex, helpers) => {
            const player = state.players[victimIndex]!;
            helpers.drawCards(victimIndex, 2);

            helpers.setPrompt({
                type: "reorder",
                targetPlayerIndex: victimIndex,
                cardId: "secret_chamber",
                min: 2,
                max: 2,
                message:
                    "秘密の部屋：山札の番上に置く手札2枚を選択してください",
                onConfirm: (indices: number[]) => {
                    const sorted = [...indices].sort((a, b) => b - a);
                    sorted.forEach((idx) => {
                        const card = player.hand.splice(idx, 1)[0]!;
                        player.deck.push(card);
                    });
                    helpers.addLog(
                        `${player.name} は手札から2枚を山札の上に戻しました。`,
                    );
                    helpers.clearPrompt();
                },
            });
        },
    },
    bridge: {
        id: "bridge",
        name: "Bridge",
        jpName: "橋",
        type: ["Action"],
        cost: 4,
        description:
            "+1 購入, +1 コイン / このターン、全てのカードのコストは 1 下がる。",
        effects: { buy: 1, coin: 1 },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            player.turnFlags = {
                ...player.turnFlags,
                costReduction: (player.turnFlags?.costReduction || 0) + 1,
            };
            helpers.addLog(
                `${player.name} は橋の効果でカードのコストを 1 下げました。`,
            );
        },
    },
    diplomat: {
        id: "diplomat",
        name: "Diplomat",
        jpName: "外交官",
        type: ["Action", "Reaction"],
        cost: 4,
        description:
            "+2 カード / デッキからカードを引いた後, 手札が5枚以下なら +2 アクション / " +
            "(リアクション) 他のプレイヤーがアタックカードをプレイしたとき、あなたの手札が5枚以上ならば、先にこのカードを公開して以下のことを実行してよい。デッキからカードを2枚引いてその後手札のカードを3枚捨て札にする。",
        action: (state, playerIndex, helpers) => {
            helpers.drawCards(playerIndex, 2);
            const player = state.players[playerIndex]!;
            if (player.hand.length <= 5) {
                state.players[playerIndex]!.actions += 2;
                helpers.addLog(
                    `${player.name} は手札が5枚以下だったので、+2アクションが有効になりました。`,
                );
            }
        },
        onAttackReaction: (state, victimIndex, helpers) => {
            const player = state.players[victimIndex]!;
            if (player.hand.length >= 5) {
                helpers.drawCards(victimIndex, 2);
                helpers.setPrompt({
                    type: "discard",
                    targetPlayerIndex: victimIndex,
                    cardId: "diplomat",
                    min: 3,
                    max: 3,
                    message: "外交官：3枚捨ててください",
                    onConfirm: (indices: number[]) => {
                        helpers.discardSelected(victimIndex, indices);
                        helpers.clearPrompt();
                    },
                });
            }
        },
    },
    wishing_well: {
        id: "wishing_well",
        name: "Wishing Well",
        jpName: "願いの井戸",
        type: ["Action"],
        cost: 3,
        description:
            "+1 カード, +1 アクション / カード名を宣言し、山札の上がそれなら手札に加える。",
        effects: { draw: 1, action: 1 },
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                const allCards = [
                    ...player.hand,
                    ...player.discard,
                    ...player.deck,
                ];
                // 最も多いカードを宣言する
                const cardRecord: Record<string, number> = {};
                allCards.forEach((card) => {
                    cardRecord[card.id] = (cardRecord[card.id] || 0) + 1;
                });
                const sortedCards = Object.entries(cardRecord).sort(
                    (a, b) => b[1] - a[1],
                );
                return sortedCards.map((card) => card[0]);
            },
        },
        action: (state, playerIndex, helpers) => {
            const player = state.players[playerIndex]!;
            const supplyNames = Object.keys(state.supply);

            helpers.setPrompt({
                type: "choice",
                targetPlayerIndex: playerIndex,
                cardId: "wishing_well",
                min: 1,
                max: 1,
                supplySelection: true,
                message:
                    "願いの井戸：山札の一番上にあると思うカードを選択してください",
                options: supplyNames,
                onConfirm: (guessedId: string) => {
                    if (player.deck.length === 0 && player.discard.length > 0) {
                        player.deck = [...player.discard];
                        player.discard = [];
                        helpers.shuffle(player.deck);
                    }
                    if (player.deck.length > 0) {
                        const topCard = player.deck[player.deck.length - 1]!;
                        helpers.addLog(
                            `${player.name} は山札の一番上のカードを公開しました：${topCard.jpName}`,
                        );
                        if (topCard.id === guessedId) {
                            helpers.addLog("予想が的中しました！");
                            player.hand.push(player.deck.pop()!);
                        }
                    }
                    helpers.clearPrompt();
                },
            });
        },
    },
    masquerade: {
        id: "masquerade",
        name: "Masquerade",
        jpName: "仮面舞踏会",
        type: ["Action"],
        cost: 3,
        description: "+2 カード / 全員手札を左に渡す / 1枚廃棄してもよい。",
        effects: { draw: 2 },
        ai: {
            getChoicePriorities: (state, playerIndex) => {
                const player = state.players[playerIndex]!;
                const hand = [...player.hand].map((c, i) => ({
                    c,
                    i,
                    v: getAICardValueInHand(c, state, playerIndex, "trash"),
                }));
                hand.sort((a, b) => a.v - b.v);
                return hand.map((h) => `${h.i}: ${h.c.jpName}`);
            },
        },
        action: (state, playerIndex, helpers) => {
            const passes: Record<number, Card> = {};
            helpers.processAllPlayers?.(
                (idx, next) => {
                    const p = state.players[idx]!;
                    if (p.hand.length === 0) {
                        next();
                        return;
                    }
                    helpers.setPrompt({
                        type: "choice",
                        targetPlayerIndex: idx,
                        cardId: "masquerade",
                        min: 1,
                        max: 1,
                        message: "仮面舞踏会：左隣に渡すカードを選んでください",
                        options: p.hand.map((c, i) => `${i}: ${c.jpName}`),
                        onConfirm: (choice: string) => {
                            const cardIdx = parseInt(choice.split(":")[0]!);
                            passes[idx] = p.hand.splice(cardIdx, 1)[0]!;
                            helpers.clearPrompt();
                            next();
                        },
                    });
                },
                () => {
                    state.players.forEach((_, i) => {
                        if (passes[i]) {
                            const nextIdx = (i + 1) % state.players.length;
                            state.players[nextIdx]!.hand.push(passes[i]!);
                        }
                    });
                    const currentPlayerObj = state.players[playerIndex]!;
                    if (currentPlayerObj.hand.length > 0) {
                        helpers.setPrompt({
                            type: "trash",
                            targetPlayerIndex: playerIndex,
                            cardId: "masquerade",
                            min: 0,
                            max: 1,
                            message:
                                "仮面舞踏会：手札から1枚廃棄してもよい（任意）",
                            onConfirm: (indices: number[]) => {
                                if (indices.length > 0) {
                                    const card = currentPlayerObj.hand.splice(
                                        indices[0]!,
                                        1,
                                    )[0]!;
                                    state.trash.push(card);
                                    helpers.addLog(
                                        `${currentPlayerObj.name} は仮面舞踏会の効果で ${card.jpName} を廃棄しました。`,
                                    );
                                }
                                helpers.clearPrompt();
                            },
                        });
                    }
                },
            );
        },
    },
    saboteur: {
        id: "saboteur",
        name: "Saboteur",
        jpName: "破壊工作員",
        type: ["Action", "Attack"],
        cost: 5,
        description:
            "コスト3以上のカードが公開されるまで公開し廃棄する。2低いカードを獲得してもよい。",
        effects: { isAttack: true },
        action: (state, playerIndex, helpers) => {
            helpers.processAttack?.("saboteur", (victimIdx) => {
                const victim = state.players[victimIdx]!;
                const revealed: Card[] = [];
                const revealNext = () => {
                    if (victim.deck.length === 0 && victim.discard.length > 0) {
                        victim.deck = [...victim.discard];
                        victim.discard = [];
                        helpers.shuffle(victim.deck);
                    }
                    if (victim.deck.length > 0) {
                        const card = victim.deck.pop()!;
                        const currentCost = helpers.getCardCost(
                            card.id,
                            playerIndex,
                        );
                        if (currentCost >= 3) {
                            state.trash.push(card);
                            helpers.addLog(
                                `${victim.name} は ${card.jpName} を廃棄しました。`,
                            );
                            victim.discard.push(...revealed);
                            const maxGainCost = currentCost - 2;
                            if (maxGainCost >= 0) {
                                helpers.setPrompt({
                                    type: "gain",
                                    targetPlayerIndex: victimIdx,
                                    cardId: "saboteur",
                                    allowedCost: maxGainCost,
                                    min: 0,
                                    max: 1,
                                    message: `破壊工作員：コスト ${maxGainCost} 以下のカード獲得可`,
                                    onConfirm: (gainId: string) => {
                                        if (gainId)
                                            helpers.gainCard(victimIdx, gainId);
                                        helpers.clearPrompt();
                                    },
                                });
                            } else helpers.clearPrompt();
                        } else {
                            revealed.push(card);
                            revealNext();
                        }
                    } else victim.discard.push(...revealed);
                };
                revealNext();
            });
        },
    },
    swindler: {
        id: "swindler",
        name: "Swindler",
        jpName: "身代わり",
        type: ["Action", "Attack"],
        cost: 3,
        description: "+2 コイン / 山札の上を廃棄し、同じコストを押し付ける。",
        effects: { coin: 2, isAttack: true },
        ai: {
            // TODO: 最も価値の低いカードを押し付ける
            // getChoicePriorities: (state, playerIndex) => {
            // }
        },
        action: (state, playerIndex, helpers) => {
            helpers.processAttack?.("swindler", (victimIdx) => {
                const victim = state.players[victimIdx]!;
                if (victim.deck.length === 0 && victim.discard.length > 0) {
                    victim.deck = [...victim.discard];
                    victim.discard = [];
                    helpers.shuffle(victim.deck);
                }
                if (victim.deck.length > 0) {
                    const cardToTrash = victim.deck.pop()!;
                    state.trash.push(cardToTrash);
                    const trashedCost = helpers.getCardCost(
                        cardToTrash.id,
                        playerIndex,
                    );
                    helpers.addLog(
                        `${victim.name} の ${cardToTrash.jpName} が廃棄されました。`,
                    );
                    helpers.setPrompt({
                        type: "gain",
                        targetPlayerIndex: playerIndex,
                        cardId: "swindler",
                        min: 1,
                        max: 1,
                        allowedCost: trashedCost,
                        exactCost: true,
                        message: `${victim.name} に獲得させるコスト ${trashedCost} のカードを選んでください`,
                        onConfirm: (gainId: string) => {
                            helpers.gainCard(victimIdx, gainId);
                            helpers.clearPrompt();
                        },
                    });
                }
            });
        },
    },
};
