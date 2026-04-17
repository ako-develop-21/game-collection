import type { Card } from '../types'
import { getAICardValueInHand } from '../aiHelpers'
import { COMMON_CARDS } from './01_common'

export const ALCHEMY_CARDS: Record<string, Card> = {
  vineyard: {
    id: 'vineyard',
    name: 'Vineyard',
    jpName: 'ブドウ園',
    type: ['Victory'],
    cost: 0,
    costPotion: 1,
    points: (state, playerIndex) => {
      const player = state.players[playerIndex]!;
      const allCards = [...player.hand, ...player.deck, ...player.discard, ...player.inPlay];
      const actionCount = allCards.filter(c => c.type.includes('Action')).length;
      return Math.floor(actionCount / 3);
    },
    description: 'あなたのデッキにあるアクションカード3枚につき、1 勝利点。'
  },
  philosophers_stone: {
    id: 'philosophers_stone',
    name: "Philosopher's Stone",
    jpName: '賢者の石',
    type: ['Treasure'],
    cost: 3,
    costPotion: 1,
    treasure: (state, playerIndex) => {
      const player = state.players[playerIndex]!;
      const deckAndDiscard = player.deck.length + player.discard.length;
      return Math.floor(deckAndDiscard / 5);
    },
    description: '手札以外のデッキと捨て札にあるカード5枚につき、+1 コイン'
  },
  apothecary: {
    id: 'apothecary',
    name: 'Apothecary',
    jpName: '薬師',
    type: ['Action'],
    cost: 2,
    costPotion: 1,
    description: '+1 カード, +1 アクション / あなたの山札の上から4枚のカードを公開する。銅貨とポーションを公開した場合、それをあなたの手札へ加える。残りのカードは好きな順番であなたの山札の上に置く。',
    effects: { draw: 1, action: 1 },
    action: (state, playerIndex, helpers) => {
      const player = state.players[playerIndex]!;
      const revealed = helpers.revealCards(playerIndex, 4);
      if (revealed.length === 0) return;
      const toHand: Card[] = [];
      const backToDeck: Card[] = [];
      revealed.forEach(c => {
        if (c.id === 'copper' || c.id === 'potion') toHand.push(c);
        else backToDeck.push(c);
      });
      player.hand.push(...toHand);
      if (toHand.length > 0) helpers.addLog(`${player.name} は公開された中から ${toHand.map(c => c.jpName).join(', ')} を手札に加えました。`);
      if (backToDeck.length > 0) {
        if (backToDeck.length === 1) {
          player.deck.push(backToDeck[0]!);
        } else {
          helpers.setPrompt({
            type: 'reorder',
            targetPlayerIndex: playerIndex,
            cardId: 'apothecary',
            revealedCards: backToDeck,
            min: backToDeck.length,
            max: backToDeck.length,
            message: '薬師：山札に戻す順番を（上から順に）選択してください',
            onConfirm: (indices: number[]) => {
              const reordered = indices.map(idx => backToDeck[idx]!);
              for (let i = reordered.length - 1; i >= 0; i--) player.deck.push(reordered[i]!);
              helpers.clearPrompt();
            }
          });
        }
      }
    }
  },
  familiar: {
    id: 'familiar',
    name: 'Familiar',
    jpName: '使い魔',
    type: ['Action', 'Attack'],
    cost: 3,
    costPotion: 1,
    description: '+1 カード, +1 アクション / 他のプレイヤーは呪いカードを1枚獲得する。',
    effects: { draw: 1, action: 1, isAttack: true },
    action: (state, playerIndex, helpers) => {
      // Use common attack helper
      helpers.processAttack?.('familiar', (victimIdx) => {
        const victim = state.players[victimIdx]!;
        if (state.supply['curse']! > 0) {
          state.supply['curse']!--
          victim.discard.push(COMMON_CARDS['curse']!)
          state.log.unshift(`${victim.name} は呪いを獲得した！`)
        }
      });
    }
  },
  transmute: {
    id: 'transmute',
    name: 'Transmute',
    jpName: '変成',
    type: ['Action'],
    cost: 0,
    costPotion: 1,
    description: 'あなたの手札のカード1枚を廃棄する。そのカードが…\n' +
      'アクションカードの場合、公領1枚を獲得する。\n' +
      '財宝カードの場合、変成1枚を獲得する。\n' +
      '勝利点カードの場合、金貨1枚を獲得する。',
    action: (state, playerIndex, helpers) => {
      const player = state.players[playerIndex]!;
      if (player.hand.length === 0) return;
      helpers.setPrompt({
        type: 'trash',
        targetPlayerIndex: playerIndex,
        cardId: 'transmute',
        min: 1,
        max: 1,
        message: '変成：廃棄するカードを1枚選択してください',
        onConfirm: (indices: number[]) => {
          const card = player.hand[indices[0]!];
          if (card) {
            helpers.trashCard(playerIndex, indices[0]!);
            if (card.type.includes('Action')) helpers.gainCard(playerIndex, 'duchy');
            if (card.type.includes('Treasure')) helpers.gainCard(playerIndex, 'transmute');
            if (card.type.includes('Victory')) helpers.gainCard(playerIndex, 'gold');
          }
          helpers.clearPrompt();
        }
      });
    }
  },
  alchemist: {
    id: 'alchemist',
    name: 'Alchemist',
    jpName: '錬金術師',
    type: ['Action'],
    cost: 3,
    costPotion: 1,
    description: '+2 カードを引く\n+1 アクション\nクリーンアップフェイズにこのカードを場から捨て札に置くとき、ポーション1枚をプレイしている場合、このカードをあなたの山札の一番上に置くことができる。',
    effects: { draw: 2, action: 1 },
    ai: {
      getChoicePriorities: () => ['はい']
    },
    onCleanup: (state, playerIndex, helpers, cardItem, cardIndex) => {
      const player = state.players[playerIndex]!;
      const hasPotion = player.inPlay.some(c => c.id === 'potion');
      if (hasPotion) {
        const alchemist = player.inPlay.splice(cardIndex, 1)[0]!;
        helpers.setPrompt({
          type: 'choice',
          targetPlayerIndex: playerIndex,
          cardId: 'alchemist',
          min: 1,
          max: 1,
          message: '錬金術師を山札の一番上に置きますか？',
          options: ['はい', 'いいえ'],
          onConfirm: (choice: string) => {
            if (choice === 'はい' || choice === 'YES') {
              player.deck.push(alchemist);
              helpers.addLog(`${player.name} はポーションをプレイしているため、錬金術師を山札の一番上に置きました。`);
            } else {
              player.discard.push(alchemist);
            }
            helpers.clearPrompt();
            helpers.endTurn();
          }
        });
        return true;
      }
      return false;
    }
  },
  herbalist: {
    id: 'herbalist',
    name: 'Herbalist',
    jpName: '薬草商',
    type: ['Action'],
    cost: 2,
    description: '+1 購入\n+1 コイン\nクリーンアップフェイズにこのカードを場から捨て札に置くとき、あなたの場にある財宝カード1枚をあなたの山札の一番上に置くことができる。',
    effects: { buy: 1, coin: 1 },
    ai: {
      getChoicePriorities: () => ['白金貨', 'ポーション', '金貨', '銀貨', '賢者の石', 'スキップ']
    },
    onCleanup: (state, playerIndex, helpers, cardItem, cardIndex) => {
      const player = state.players[playerIndex]!;
      const herbalist = player.inPlay.splice(cardIndex, 1)[0]!;
      const treasuresInPlay = player.inPlay.filter(c => c.type.includes('Treasure'));
      if (treasuresInPlay.length > 0) {
        const options = Array.from(new Set(treasuresInPlay.map(t => t.id)));
        const getJpName = (id: string) => player.inPlay.find(c => c.id === id)?.jpName || id;
        const optionNamesLocalized = options.map(getJpName);
        optionNamesLocalized.push('スキップ');
        
        helpers.setPrompt({
          type: 'choice',
          targetPlayerIndex: playerIndex,
          cardId: 'herbalist',
          min: 1,
          max: 1,
          message: '薬草商の効果：山札の一番上に置く財宝カードを選んでください。',
          options: optionNamesLocalized,
          onConfirm: (choice: string) => {
            player.discard.push(herbalist);
            if (choice !== 'スキップ') {
              const targetId = options[optionNamesLocalized.indexOf(choice)];
              const targetIndex = player.inPlay.findIndex(c => c.id === targetId && c.type.includes('Treasure'));
              if (targetIndex !== -1) {
                const treasure = player.inPlay.splice(targetIndex, 1)[0]!;
                player.deck.push(treasure);
                helpers.addLog(`${player.name} は薬草商の効果で ${treasure.jpName} を山札の一番上に置きました。`);
              }
            }
            helpers.clearPrompt();
            helpers.endTurn();
          }
        });
        return true;
      } else {
        player.discard.push(herbalist);
        return false;
      }
    }
  },
  apprentice: {
    id: 'apprentice',
    name: 'Apprentice',
    jpName: '弟子',
    type: ['Action'],
    cost: 5,
    description: '+1 アクション / 手札のカード1枚を廃棄する。そのカードのコスト1につき+1カード、コストに🧪が含まれていればさらに+2カード。',
    effects: { action: 1, isTrash: true },
    action: (state, playerIndex, helpers) => {
      const player = state.players[playerIndex]!;
      if (player.hand.length === 0) return;

      helpers.setPrompt({
        type: 'trash',
        targetPlayerIndex: playerIndex,
        cardId: 'apprentice',
        min: 1,
        max: 1,
        message: '弟子：廃棄するカードを選択してください',
        onConfirm: (indices: number[]) => {
          const card = player.hand[indices[0]!];
          if (card) {
            const trashedCost = helpers.getCardCost(card.id, playerIndex);
            const trashedPotion = card.costPotion || 0;
            const drawCount = trashedCost + (trashedPotion > 0 ? 2 : 0);
            
            helpers.trashCard(playerIndex, indices[0]!);
            if (drawCount > 0) {
              helpers.drawCards(playerIndex, drawCount);
            }
            helpers.clearPrompt();
          }
        }
      });
    }
  },
  university: {
    id: 'university',
    name: 'University',
    jpName: '大学',
    type: ['Action'],
    cost: 2,
    costPotion: 1,
    description: '+2 アクション / コスト5までのアクションカード1枚を獲得してもよい。',
    effects: { action: 2 },
    action: (_state, playerIndex, helpers) => {
      helpers.setPrompt({
        type: 'gain',
        targetPlayerIndex: playerIndex,
        cardId: 'university',
        min: 0,
        max: 1,
        allowedCost: 5,
        allowedPotion: 0,
        allowedTypes: ['Action'],
        message: '大学：コスト5までのアクションカードを獲得できます（キャンセル可能）',
        onConfirm: (cardId: string) => {
          if (cardId) {
            helpers.gainCard(playerIndex, cardId);
          }
          helpers.clearPrompt();
        },
        onCancel: () => {
          helpers.clearPrompt();
        }
      });
    }
  },
  golem: {
    id: 'golem',
    name: 'Golem',
    jpName: 'ゴーレム',
    type: ['Action'],
    cost: 4,
    costPotion: 1,
    description: '山札からゴーレム以外のアクションカード2枚が出るまで公開する。それ以外を捨て札にし、2枚を好きな順番でプレイする。',
    action: (state, playerIndex, helpers) => {
      const player = state.players[playerIndex]!;
      const foundActions: Card[] = [];
      const revealedCards: Card[] = [];

      const revealUntilTwoActions = () => {
        if (player.deck.length === 0 && player.discard.length === 0) return;

        const revealNext = () => {
          if (player.deck.length === 0) {
            if (player.discard.length === 0) return;
            player.deck = [...player.discard];
            player.discard = [];
            helpers.shuffle(player.deck);
            helpers.addLog(`${player.name} は捨て札をシャッフルしました。`);
          }

          const card = player.deck.pop();
          if (card) {
            if (card.type.includes('Action') && card.id !== 'golem') {
              foundActions.push(card);
              if (foundActions.length < 2) {
                revealNext();
              }
            } else {
              revealedCards.push(card);
              revealNext();
            }
          }
        };
        revealNext();
      };

      revealUntilTwoActions();

      // Discard non-action revealed cards
      if (revealedCards.length > 0) {
        player.discard.push(...revealedCards);
        helpers.addLog(`${player.name} はゴーレムの効果で見つからなかったカードを捨て札にしました。`);
      }

      if (foundActions.length === 0) {
        helpers.addLog('ゴーレムの効果：アクションカードが見つかりませんでした。');
        return;
      }

      const executeSequentially = (cardsToPlay: Card[]) => {
        if (cardsToPlay.length === 0) {
          player.turnFlags = { ...player.turnFlags, executingCount: Math.max(0, (player.turnFlags?.executingCount || 0) - 1) };
          helpers.checkActionPhase();
          return;
        }

        const currentCard = cardsToPlay[0]!;
        const remainingCards = cardsToPlay.slice(1);
        
        player.inPlay.push(currentCard);
        helpers.addLog(`${player.name} はゴーレムの効果で ${currentCard.jpName} をプレイします。`);

        const hookPrompt = (prompt: any, onComplete: () => void) => {
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

        // Apply effects
        if (currentCard.effects) {
          if (currentCard.effects.draw) helpers.drawCards(playerIndex, currentCard.effects.draw)
          if (currentCard.effects.action) player.actions += currentCard.effects.action
          if (currentCard.effects.buy) player.buys += currentCard.effects.buy
          if (currentCard.effects.coin) player.coins += currentCard.effects.coin
        }
        
        // Trigger action
        if (currentCard.action) {
          currentCard.action(state, playerIndex, helpers);
        }

        const activePrompt = helpers.getPrompt();
        if (activePrompt) {
          hookPrompt(activePrompt, () => executeSequentially(remainingCards));
        } else {
          executeSequentially(remainingCards);
        }
      };

      // Handle sequence order
      player.turnFlags = { ...player.turnFlags, executingCount: (player.turnFlags?.executingCount || 0) + 1 };

      if (foundActions.length === 1) {
        executeSequentially(foundActions);
      } else if (foundActions.length === 2) {
        if (player.name === 'You') {
          helpers.setPrompt({
            type: 'choice',
            targetPlayerIndex: playerIndex,
            cardId: 'golem',
            min: 1,
            max: 1,
            message: 'ゴーレム：どちらを先に使用しますか？',
            options: foundActions.map(c => c.jpName),
            onConfirm: (choice: string) => {
              const firstIdx = foundActions.findIndex(c => c.jpName === choice);
              const ordered = [foundActions[firstIdx]!, foundActions[1 - firstIdx]!];
              helpers.clearPrompt();
              executeSequentially(ordered);
            }
          });
        } else {
          // AI plays in drawn order
          executeSequentially(foundActions);
        }
      }
    }
  },
  scrying_pool: {
    id: 'scrying_pool',
    name: 'Scrying Pool',
    jpName: '念視の泉',
    type: ['Action', 'Attack'],
    cost: 2,
    costPotion: 1,
    description: '+1 アクション / 各プレイヤーは山札の一番上を公開し、あなたがそれを捨て札にするか戻すか選ぶ。その後、アクション以外が出るまで公開しすべて手札に加える。',
    effects: { action: 1, isAttack: true },
    ai: {
      getChoicePriorities: (state, playerIndex) => {
        // TODO: playerIndex, 対象カードをもとに、捨てるか戻すか判断する
        const prompt = state.players[playerIndex]!.hand.length;
        return ['捨てる'];
      }
    },
    action: (state, playerIndex, helpers) => {
      const currentPlayer = state.players[playerIndex]!;
      
      helpers.processAllPlayers((targetIdx, next) => {
        const victim = state.players[targetIdx]!;
        
        // Attack reaction check (Moat etc)
        if (targetIdx !== playerIndex && helpers.processAttack) {
          // This is a bit tricky because helpers.processAttack is usually for ALL victims at once.
          // But Scrying Pool is one by one. I'll check if Moat is revealed?
          // No, processAttack handles the prompt.
          // Let's assume processAttack handles it. 
          // If the user has Moat, processAttack will set a prompt and wait.
          // But we are ALREADY in processAllPlayers.
        }

        const revealed = helpers.revealCards(targetIdx, 1);
        if (revealed.length === 0) {
          next();
          return;
        }
        const card = revealed[0]!;
        
        const options = ['捨てる', '戻す'];
        const message = `${victim.name} の公開されたカード: ${card.jpName}。どうしますか？`;

        if (playerIndex === targetIdx) {
          // Myself: Discard if bad
          const val = getAICardValueInHand(card, state, playerIndex, 'discard');
          if (currentPlayer.name.startsWith('AI')) {
            if (val < 20) {
              victim.discard.push(card);
              helpers.addLog(`${victim.name} は自分の ${card.jpName} を捨て札にしました。`);
            } else {
              victim.deck.push(card);
              helpers.addLog(`${victim.name} は自分の ${card.jpName} を山札に戻しました。`);
            }
            next();
          } else {
            helpers.setPrompt({
              type: 'choice',
              targetPlayerIndex: playerIndex,
              cardId: 'scrying_pool',
              min: 1,
              max: 1,
              message,
              options,
              onConfirm: (choice: string) => {
                if (choice === '捨てる') {
                  victim.discard.push(card);
                  helpers.addLog(`${victim.name} は自分の ${card.jpName} を捨て札にしました。`);
                } else {
                  victim.deck.push(card);
                  helpers.addLog(`${victim.name} は自分の ${card.jpName} を山札に戻しました。`);
                }
                helpers.clearPrompt();
                next();
              }
            });
          }
        } else {
          // Others: Discard if good
          if (currentPlayer.name.startsWith('AI')) {
            const val = getAICardValueInHand(card, state, targetIdx, 'discard');
            if (val >= 20) { // Good card
              victim.discard.push(card);
              helpers.addLog(`${currentPlayer.name} は ${victim.name} の ${card.jpName} を捨て札にさせました。`);
            } else {
              victim.deck.push(card);
              helpers.addLog(`${currentPlayer.name} は ${victim.name} の ${card.jpName} を山札に戻させました。`);
            }
            next();
          } else {
            helpers.setPrompt({
              type: 'choice',
              targetPlayerIndex: playerIndex,
              cardId: 'scrying_pool',
              min: 1,
              max: 1,
              message,
              options,
              onConfirm: (choice: string) => {
                if (choice === '捨てる') {
                  victim.discard.push(card);
                  helpers.addLog(`${currentPlayer.name} は ${victim.name} の ${card.jpName} を捨て札にさせました。`);
                } else {
                  victim.deck.push(card);
                  helpers.addLog(`${currentPlayer.name} は ${victim.name} の ${card.jpName} を山札に戻させました。`);
                }
                helpers.clearPrompt();
                next();
              }
            });
          }
        }
      }, () => {
        // Final draw part
        const drawActionCards = () => {
          if (currentPlayer.deck.length === 0 && currentPlayer.discard.length === 0) return;
          
          const revealedCards: Card[] = [];
          
          const revealNext = () => {
            if (currentPlayer.deck.length === 0) {
              if (currentPlayer.discard.length === 0) {
                // Done
                if (revealedCards.length > 0) {
                  currentPlayer.hand.push(...revealedCards);
                  helpers.addLog(`${currentPlayer.name} は ${revealedCards.map(c => c.jpName).join('、')} を手札に加えました。`);
                }
                return;
              }
              currentPlayer.deck = [...currentPlayer.discard];
              currentPlayer.discard = [];
              helpers.shuffle(currentPlayer.deck);
              helpers.addLog(`${currentPlayer.name} は捨て札をシャッフルしました。`);
            }
            
            const card = currentPlayer.deck.pop();
            if (card) {
              if (card.type.includes('Action')) {
                revealedCards.push(card);
                revealNext();
              } else {
                // Not Action, put back
                currentPlayer.deck.push(card);
                helpers.addLog(`${currentPlayer.name} は ${card.jpName} が出るまで公開しました。`);
                if (revealedCards.length > 0) {
                  currentPlayer.hand.push(...revealedCards);
                  helpers.addLog(`${currentPlayer.name} は ${revealedCards.map(c => c.jpName).join('、')} を手札に加えました。`);
                }
              }
            }
          };
          
          revealNext();
        };
        
        drawActionCards();
      });
    }
  },
}
