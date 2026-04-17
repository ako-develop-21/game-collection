import type { Card } from '../types'

export const COMMON_CARDS: Record<string, Card> = {
  copper: {
    id: 'copper',
    name: 'Copper',
    jpName: '銅貨',
    type: ['Treasure'],
    cost: 0,
    treasure: (state, playerIndex) => {
      const player = state.players[playerIndex]!;
      return (player.turnFlags?.coppersmithActive || 0) + 1;
    },
    description: '+1 コイン'
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    jpName: '銀貨',
    type: ['Treasure'],
    cost: 3,
    treasure: 2,
    description: '+2 コイン'
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    jpName: '金貨',
    type: ['Treasure'],
    cost: 6,
    treasure: 3,
    description: '+3 コイン'
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    jpName: '白金貨',
    type: ['Treasure'],
    cost: 9,
    treasure: 5,
    description: '+5 コイン'
  },
  estate: {
    id: 'estate',
    name: 'Estate',
    jpName: '屋敷',
    type: ['Victory'],
    cost: 2,
    points: 1,
    description: '1 勝利点'
  },
  duchy: {
    id: 'duchy',
    name: 'Duchy',
    jpName: '公領',
    type: ['Victory'],
    cost: 5,
    points: 3,
    description: '3 勝利点'
  },
  province: {
    id: 'province',
    name: 'Province',
    jpName: '属州',
    type: ['Victory'],
    cost: 8,
    points: 6,
    description: '6 勝利点'
  },
  colony: {
    id: 'colony',
    name: 'Colony',
    jpName: '植民地',
    type: ['Victory'],
    cost: 11,
    points: 10,
    description: '10 勝利点'
  },
  curse: {
    id: 'curse',
    name: 'Curse',
    jpName: '呪い',
    type: ['Curse'],
    cost: 0,
    points: -1,
    description: '-1 勝利点'
  },
  potion: {
    id: 'potion',
    name: 'Potion',
    jpName: 'ポーション',
    type: ['Treasure'],
    cost: 4,
    potionValue: 1,
    description: '1 ポーション'
  }
}
