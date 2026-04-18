import type { Card } from "../types";
import { COMMON_CARDS } from "./01_common";
import { BASE1_CARDS } from "./02_base1";
import { BASE2_CARDS } from "./03_base2";
import { INTRIGUE_CARDS } from "./04_intrigue";
import { ALCHEMY_CARDS } from "./05_alchemy";
import { PROSPERITY_CARDS } from "./06_prosperity";

export const ALL_CARDS: Record<string, Card> = {
    ...COMMON_CARDS,
    ...BASE1_CARDS,
    ...BASE2_CARDS,
    ...INTRIGUE_CARDS,
    ...ALCHEMY_CARDS,
    ...PROSPERITY_CARDS,
};

export const cardGroups = [
    {
        name: "基本（第1版）",
        cards: Object.keys(BASE1_CARDS),
    },
    {
        name: "基本（第2版等）",
        cards: Object.keys(BASE2_CARDS),
    },
    {
        name: "陰謀",
        cards: Object.keys(INTRIGUE_CARDS),
    },
    {
        name: "錬金術",
        cards: Object.keys(ALCHEMY_CARDS),
    },
    {
        name: "繁栄",
        cards: Object.keys(PROSPERITY_CARDS),
    },
];

export const deletedCards = [
    // 基本
    "woodcutter",
    // 陰謀
    "secret_chamber",
    "great_hall",
    "scout",
    "coppersmith",
    "tribute",
    "saboteur",
    // 繁栄
    "royal_seal",
    "anvil",
];
