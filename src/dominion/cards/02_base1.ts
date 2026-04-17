import type { Card } from '../types'
import { getAICardValueInHand } from '../aiHelpers'
import { COMMON_CARDS } from './01_common'

export const BASE1_CARDS: Record<string, Card> = {
  village: {
    id: 'village',
    name: 'Village',
    jpName: '村',
    type: ['Action'],
    cost: 3,
    description: '+1 カード, +2 アクション',
    effects: { draw: 1, action: 2 }
  },
  smithy: {
    id: 'smithy',
    name: 'Smithy',
    jpName: '鍛冶屋',
    type: ['Action'],
    cost: 4,
    description: '+3 カード',
    effects: { draw: 3 },
    ai: {
      getValue: (state, playerIndex) => {
        // デッキ15枚あたり1枚, それ以上の割合は低評価
        const player = state.players[playerIndex]!;
        const allCards = [...player.deck, ...player.discard, ...player.inPlay, ...player.hand];
        const smithyCount = allCards.filter(c => c.id === 'smithy').length;
        const deckSize = allCards.length;
        return deckSize / (smithyCount + 1) > 15 ? null : 5;
      }
    }
  },
  market: {
    id: 'market',
    name: 'Market',
    jpName: '市場',
    type: ['Action'],
    cost: 5,
    description: '+1 カード, +1 アクション, +1 購入, +1 コイン',
    effects: { draw: 1, action: 1, buy: 1, coin: 1 }
  },
  moat: {
    id: 'moat',
    name: 'Moat',
    jpName: '堀',
    type: ['Action', 'Reaction'],
    cost: 2,
    description: '+2 カード / 他のプレイヤーがアタックをプレイしたとき、このカードを手札から公開できる。そうした場合、あなたはそのアタックの影響を受けない。',
    effects: { draw: 2, isDefense: true }
  },
  militia: {
    id: 'militia',
    name: 'Militia',
    jpName: '民兵',
    type: ['Action', 'Attack'],
    cost: 4,
    description: '+2 コイン / 他のプレイヤーは手札が3枚になるまで捨て札にする。',
    effects: { coin: 2, isAttack: true },
    ai: {
      getChoicePriorities: (state, playerIndex) => {
        const player = state.players[playerIndex]!;
        const discardCount = player.hand.length - 3;
        const handScore = player.hand.map(c => {
          return { c, score: getAICardValueInHand(c, state, playerIndex, 'discard') }
        }).sort((a, b) => a.score - b.score);
        return handScore.slice(0, discardCount).map(s => s.c.jpName);
      }
    },
    action: (state, _, helpers) => {
      helpers.processAttack?.('militia', (victimIdx) => {
        const victim = state.players[victimIdx]!;
        const discardCount = victim.hand.length - 3;
        if (discardCount <= 0) return;

        helpers.setPrompt({
          type: 'discard',
          targetPlayerIndex: victimIdx,
          min: discardCount,
          max: discardCount,
          message: `${victim.name}：民兵のアタック！手札が3枚になるよう、${discardCount}枚捨ててください。`,
          onConfirm: (indices: number[]) => {
            helpers.discardSelected(victimIdx, indices);
            helpers.clearPrompt();
          }
        });
      });
    }
  },
  woodcutter: {
    id: 'woodcutter',
    name: 'Woodcutter',
    jpName: '木こり',
    type: ['Action'],
    cost: 3,
    description: '+1 購入, +2 コイン',
    effects: { buy: 1, coin: 2 }
  },
  festival: {
    id: 'festival',
    name: 'Festival',
    jpName: '祝祭',
    type: ['Action'],
    cost: 5,
    description: '+2 アクション, +1 購入, +2 コイン',
    effects: { action: 2, buy: 1, coin: 2 }
  },
  laboratory: {
    id: 'laboratory',
    name: 'Laboratory',
    jpName: '研究所',
    type: ['Action'],
    cost: 5,
    description: '+2 カード, +1 アクション',
    effects: { draw: 2, action: 1 }
  },
  council_room: {
    id: 'council_room',
    name: 'Council Room',
    jpName: '議事堂',
    type: ['Action'],
    cost: 5,
    description: '+4 カード, +1 購入 / 他のプレイヤーは全員1枚カードを引く。',
    effects: { draw: 4, buy: 1 },
    action: (state, playerIndex, helpers) => {
      state.players.forEach((_, i) => {
        if (i !== playerIndex) helpers.drawCards(i, 1)
      })
      state.log.unshift(`議事堂の効果：他のプレイヤー視点でもカードを1枚引きます。`)
    }
  },
  witch: {
    id: 'witch',
    name: 'Witch',
    jpName: '魔女',
    type: ['Action', 'Attack'],
    cost: 5,
    description: '+2 カード / 他のプレイヤーは呪いカードを1枚獲得する。',
    effects: { draw: 2, isAttack: true },
    action: (state, _, helpers) => {
      helpers.processAttack?.('witch', (victimIdx) => {
        const victim = state.players[victimIdx]!;
        if (state.supply['curse']! > 0) {
          state.supply['curse']!--
          victim.discard.push(COMMON_CARDS['curse']!)
          state.log.unshift(`${victim.name} は呪いを獲得した！`)
        }
      });
    }
  },
  cellar: {
    id: 'cellar',
    name: 'Cellar',
    jpName: '地下貯蔵庫',
    type: ['Action'],
    cost: 2,
    description: '+1 アクション / 手札から任意の枚数のカードを捨て札にする。そうして捨て札にしたカード1枚につき、カードを1枚引く。',
    effects: { action: 1 },
    ai: {
      getChoicePriorities: (state, playerIndex) => {
        const threshold = 20;
        const player = state.players[playerIndex]!;
        const toDiscard = player.hand.filter(c => {
          return getAICardValueInHand(c, state, playerIndex, 'discard') < threshold;
        });
        return toDiscard.map(c => c.jpName); 
      }
    },
    action: (state, playerIndex, helpers) => {
      helpers.setPrompt({
        type: 'discard',
        targetPlayerIndex: playerIndex,
        cardId: 'cellar',
        min: 0,
        max: state.players[playerIndex]!.hand.length,
        message: '地下貯蔵庫：捨てるカードを選択してください',
        onConfirm: (selectedIndices: number[]) => {
          const discardedCount = selectedIndices.length
          helpers.discardSelected(playerIndex, selectedIndices)
          helpers.drawCards(playerIndex, discardedCount)
          helpers.clearPrompt()
        }
      })
    }
  },
  poacher: {
    id: 'poacher',
    name: 'Poacher',
    jpName: '密猟者',
    type: ['Action'],
    cost: 4,
    description: '+1 カード, +1 アクション, +1 コイン / 空のサプライの山1つにつき、手札を1枚捨てる。',
    effects: { draw: 1, action: 1, coin: 1 },
    action: (state, playerIndex, helpers) => {
      const player = state.players[playerIndex]!
      const emptyPiles = Object.values(state.supply).filter(count => count === 0).length
      if (emptyPiles > 0 && player.hand.length > 0) {
        const discardAmount = Math.min(emptyPiles, player.hand.length)
        helpers.setPrompt({
          type: 'discard',
          targetPlayerIndex: playerIndex,
          cardId: 'poacher',
          min: discardAmount,
          max: discardAmount,
          message: `密猟者：空の山が${emptyPiles}つあるため、${discardAmount}枚捨ててください`,
          onConfirm: (selectedIndices: number[]) => {
            helpers.discardSelected(playerIndex, selectedIndices)
            helpers.clearPrompt()
          }
        })
      }
    }
  },
  sentry: {
    id: 'sentry',
    name: 'Sentry',
    jpName: '衛兵',
    type: ['Action'],
    cost: 5,
    description: '+1 カード, +1 アクション / 山札から2枚見る。好きな枚数を廃棄し、好きな枚数を捨てる。残りを好きな順番で戻す。',
    effects: { draw: 1, action: 1, isTrash: true },
    action: (state, playerIndex, helpers) => {
      const player = state.players[playerIndex]!;
      const revealed = helpers.revealCards(playerIndex, 2);
      if (revealed.length === 0) return;
      
      helpers.setPrompt({
        type: 'sentry',
        targetPlayerIndex: playerIndex,
        cardId: 'sentry',
        min: 0,
        max: 2,
        message: '衛兵：公開されたカードの処理を下から選んでください',
        revealedCards: revealed,
        onConfirm: (decisions: { card: Card, action: 'trash' | 'discard' | 'putBack' }[]) => {
          // decisions are ordered array for putBack
          const putBackCards: Card[] = [];
          
          decisions.forEach(decision => {
            if (decision.action === 'trash') {
              state.trash.push(decision.card);
              helpers.addLog(`${player.name} は ${decision.card.jpName} を廃棄しました。`);
            } else if (decision.action === 'discard') {
              player.discard.push(decision.card);
              helpers.addLog(`${player.name} は ${decision.card.jpName} を捨て札にしました。`);
            } else if (decision.action === 'putBack') {
              putBackCards.push(decision.card);
            }
          });
          
          // Put back in reverse order so the first chosen is on top
          for (let i = putBackCards.length - 1; i >= 0; i--) {
            player.deck.push(putBackCards[i]!);
          }
          if (putBackCards.length > 0) {
            helpers.addLog(`${player.name} は ${putBackCards.length} 枚のカードを山札に戻しました。`);
          }
          
          helpers.clearPrompt();
        }
      });
    }
  }
}
