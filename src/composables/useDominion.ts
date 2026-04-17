import { ref, computed, watch } from 'vue'
import { cardGroups, ALL_CARDS } from '../dominion/cards/00_index'
import { getAICardValueInHand, getAIPurchaseWeight } from '../dominion/aiHelpers'
import type { GameState, Card, PlayerState, ActionPrompt, ActionHelpers, AIPersona } from '../dominion/types'
import { PROSPERITY_CARDS } from '../dominion/cards/06_prosperity'

// ======== DEBUG: Set initial deck for testing (Human only) ========
// 通常プレイ用
// const DEBUG_DECK_USER: string[] = []
const DEBUG_DECK_AI: string[] = []
// デバッグ用
const DEBUG_DECK_USER: string[] = ['silver', 'copper', 'copper', 'village', 'anvil']
// const DEBUG_DECK_AI: string[] = ['militia', 'silver', 'copper', 'gold', 'estate']
// ==================================================================

// -------------------------------------------------
// メインロジック
// -------------------------------------------------
export function useDominion() {
  const players = ref<PlayerState[]>([])
  const currentPlayerIndex = ref(0)
  const phase = ref<'Action' | 'Buy' | 'Cleanup'>('Action')
  const supply = ref<Record<string, number>>({})
  const trash = ref<Card[]>([])
  const log = ref<string[]>([])
  const turnCount = ref(1)
  const currentPrompt = ref<ActionPrompt | null>(null)
  const isGameOver = ref(false)
  const winners = ref<PlayerState[]>([])

  const currentPlayer = computed(() => players.value[currentPlayerIndex.value]!)

  const addLog = (message: string) => {
    log.value.unshift(`${message}`)
    if (log.value.length > 50) log.value.pop()
  }

  const shuffle = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  }

  const drawCards = (playerIndex: number, count: number) => {
    const player = players.value[playerIndex]!
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        if (player.discard.length === 0) break
        player.deck = [...player.discard]
        player.discard = []
        shuffle(player.deck)
        addLog(`${player.name} は捨て札をシャッフルして山札に戻しました。`)
      }
      const card = player.deck.pop()
      if (card) player.hand.push(card)
    }
  }

  const getCardCost = (cardId: string, playerIndex: number): number => {
    const card = ALL_CARDS[cardId];
    if (!card) return 0;
    const reduction = players.value[playerIndex]?.turnFlags?.costReduction || 0;
    const actionReduction = players.value[playerIndex]?.turnFlags?.costActionReduction || 0;
    if (card.type.includes('Action')) {
      return Math.max(0, card.cost - reduction - actionReduction);
    }
    return Math.max(0, card.cost - reduction);
  };

  const processAttack = (attackCardId: string, victimAction: (victimIdx: number) => void) => {
    const attackerIdx = currentPlayerIndex.value;
    const victims = players.value
      .map((_, i) => i)
      .filter(i => i !== attackerIdx);

    const processVictim = (idx: number) => {
      if (idx >= victims.length) return;

      const victimIdx = victims[idx]!;
      const victim = players.value[victimIdx]!;

      // 1. 自動防御（堀など）のチェック
      const defenseCard = victim.hand.find(c => c.effects?.isDefense);
      if (defenseCard) {
        addLog(`${victim.name} は ${defenseCard.jpName} を公開し、アタックを防いだ！`);
        processVictim(idx + 1);
        return;
      }

      // 2. 選択式リアクション（秘密の部屋など）のチェック
      const reactionCards = victim.hand.filter(c => c.onAttackReaction);
      
      if (reactionCards.length > 0) {
        const handleReaction = (reactionIdx: number) => {
          if (reactionIdx >= reactionCards.length) {
            victimAction(victimIdx);
            const checkVictimFinished = () => {
              if (currentPrompt.value) {
                setTimeout(checkVictimFinished, 100);
              } else {
                processVictim(idx + 1);
              }
            };
            checkVictimFinished();
            return;
          }

          const card = reactionCards[reactionIdx]!;
          
          const askReaction = () => {
            const state: GameState = { 
              players: players.value, 
              currentPlayerIndex: currentPlayerIndex.value, 
              phase: phase.value, 
              supply: supply.value, 
              trash: trash.value,  
              log: log.value, 
              turnCount: turnCount.value 
            };
            
            if (victim.name.startsWith('AI')) {
              const shouldReact = card.ai?.shouldReact ? card.ai.shouldReact(state, victimIdx, attackCardId) : true;
              if (shouldReact) {
                addLog(`${victim.name} は ${card.jpName} でリアクションした！`);
                card.onAttackReaction?.(state, victimIdx, helpers);
                
                let checkCount = 0;
                const checkFinished = () => {
                   // Wait for prompt to appear (up to 500ms) or finish
                   if (!currentPrompt.value) {
                     if (checkCount < 5) {
                       checkCount++;
                       setTimeout(checkFinished, 100);
                     } else {
                       handleReaction(reactionIdx + 1);
                     }
                   } else {
                     const originalConfirm = currentPrompt.value.onConfirm;
                     currentPrompt.value.onConfirm = (res) => {
                        originalConfirm(res);
                        setTimeout(checkFinished, 100);
                     };
                   }
                };
                setTimeout(checkFinished, 100);
              } else {
                handleReaction(reactionIdx + 1);
              }
              return;
            }

            setPrompt({
              type: 'choice',
              targetPlayerIndex: victimIdx,
              cardId: card.id,
              min: 1,
              max: 1,
              message: `${card.jpName} でリアクションしますか？`,
              options: ['YES (公開する)', 'NO (公開しない)'],
              onConfirm: (choice: string) => {
                if (choice.includes('YES')) {
                  addLog(`${victim.name} は ${card.jpName} を公開した！`);
                  card.onAttackReaction?.(state, victimIdx, helpers);
                  
                  const checkReactionFinished = () => {
                    if (!currentPrompt.value || currentPrompt.value.cardId !== card.id) {
                      handleReaction(reactionIdx + 1);
                    } else {
                      const originalConfirm = currentPrompt.value.onConfirm;
                      currentPrompt.value.onConfirm = (res) => {
                        originalConfirm(res);
                        setTimeout(checkReactionFinished, 100);
                      };
                    }
                  };
                  setTimeout(checkReactionFinished, 100);
                } else {
                  clearPrompt();
                  handleReaction(reactionIdx + 1);
                }
              }
            });
          };

          askReaction();
        };

        handleReaction(0);
      } else {
        victimAction(victimIdx);
        const checkVictimFinished = () => {
          if (currentPrompt.value) {
            setTimeout(checkVictimFinished, 100);
          } else {
            processVictim(idx + 1);
          }
        };
        checkVictimFinished();
      }
    };

    processVictim(0);
  }

  const endActionPhase = () => {
    if (phase.value === 'Action') {
      phase.value = 'Buy'
      addLog('購入フェーズに移行しました。')
    }
  }

  const processAllPlayers = (action: (idx: number, next: () => void) => void, onComplete?: () => void) => {
    const indices = players.value.map((_, i) => i);
    const processNext = (idx: number) => {
      if (idx >= indices.length) {
        onComplete?.();
        return;
      }
      action(indices[idx]!, () => processNext(idx + 1));
    };
    processNext(0);
  };

  const checkActionPhase = () => {
    if (phase.value !== 'Action') return
    const player = currentPlayer.value
    // If we're in the middle of executing a card effect (like Throne Room), don't end the phase
    if (player.turnFlags?.executingCount > 0) return

    const hasActionCard = player.hand.some(c => c.type.includes('Action'))
    if (!hasActionCard || player.actions === 0) {
      if (!currentPrompt.value) { // Don't end phase if a prompt is active
        endActionPhase()
      }
    }
  }

  // AI Strategy Helpers
  const getAIActionWeight = (card: Card, actions: number) => {
    let weight = 0;
    const effects = card.effects || {};
    
    // 1. +Actions are high priority
    if ((effects.action || 0) >= 2) weight += 100;
    else if ((effects.action || 0) === 1) weight += 50;
    
    // 2. Draws are good if we have actions
    const draw = effects.draw || 0;
    if (draw >= 3) weight += actions > 1 ? 40 : 20;
    else if (draw === 2) weight += 15;
    else if (draw === 1) weight += 10;
    
    // 3. Attacks/Coins
    if (effects.isAttack) weight += 30;
    if ((effects.coin || 0) >= 2) weight += 25;
    else if ((effects.coin || 0) === 1) weight += 15;

    // 4. Trash
    if (effects.isTrash) weight += 20;
    
    return weight;
  }

  const runAITurn = async () => {
    if (isGameOver.value || !currentPlayer.value.name.startsWith('AI')) return
    
    // 1. Action Phase
    while (phase.value === 'Action' && !isGameOver.value && currentPlayer.value.name.startsWith('AI')) {
      // Guard: Always wait if ANY prompt is active (could be a reaction from opponent or own card effect)
      if (currentPrompt.value) {
        await new Promise(resolve => setTimeout(resolve, 500))
        continue
      }

      await new Promise(resolve => setTimeout(resolve, 800))
      if (!currentPlayer.value.name.startsWith('AI') || phase.value !== 'Action') break

      const actionCards = currentPlayer.value.hand
        .map((c, i) => ({ c, i, weight: getAIActionWeight(c, currentPlayer.value.actions) }))
        .filter(item => item.c.type.includes('Action'))
        .sort((a, b) => b.weight - a.weight)
      
      if (actionCards.length > 0 && currentPlayer.value.actions > 0) {
        const topAction = actionCards[0]!.c;
        addLog(`AI は ${topAction.jpName} をプレイすることを選択しました。`);
        playCard(actionCards[0]!.i)
        
        // Wait a bit for the card effect to potentially open a prompt
        await new Promise(resolve => setTimeout(resolve, 500))
      } else {
        // Double check no prompts were opened by the last action
        if (currentPrompt.value) continue
        
        endActionPhase()
        break
      }
    }

    // 2. Buy Phase
    if (phase.value === 'Buy' && !isGameOver.value && currentPlayer.value.name.startsWith('AI')) {
      // Ensure any trailing action prompts are finished
      while (currentPrompt.value && currentPlayer.value.name.startsWith('AI')) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      await new Promise(resolve => setTimeout(resolve, 800))
      if (!currentPlayer.value.name.startsWith('AI')) return
      
      playAllTreasures()
      
      while (phase.value === 'Buy' && currentPlayer.value.buys > 0 && !isGameOver.value && currentPlayer.value.name.startsWith('AI')) {
        if (currentPrompt.value) {
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }

        await new Promise(resolve => setTimeout(resolve, 800))
        if (!currentPlayer.value.name.startsWith('AI') || phase.value !== 'Buy') break
        
        const state: GameState = {
          players: players.value,
          currentPlayerIndex: currentPlayerIndex.value,
          phase: phase.value,
          supply: supply.value,
          trash: trash.value,
          log: log.value,
          turnCount: turnCount.value
        };
        
        const candidates = Object.keys(supply.value)
          .map(id => ({ id, weight: getAIPurchaseWeight(id, currentPlayer.value.coins, state, currentPlayerIndex.value, helpers) }))
          .filter(item => {
            const cost = getCardCost(item.id, currentPlayerIndex.value);
            const potionCost = ALL_CARDS[item.id]?.costPotion || 0;
            return supply.value[item.id]! > 0 && item.weight > 0 && 
                   currentPlayer.value.coins >= cost && currentPlayer.value.potions >= potionCost;
          })
          .sort((a, b) => b.weight - a.weight)
        
        if (candidates.length > 0) {
          buyCard(candidates[0]!.id)
          await new Promise(resolve => setTimeout(resolve, 500))
        } else {
          break
        }
      }
      
      // Final guard: Wait for all buy/gain prompts to finish before ending turn
      while (currentPrompt.value && currentPlayer.value.name.startsWith('AI')) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (phase.value === 'Buy' && !isGameOver.value && currentPlayer.value.name.startsWith('AI')) {
        endTurn()
      }
    }
  }

  // Reactive Prompt Handler for AI
  watch(currentPrompt, async (newPrompt: ActionPrompt | null) => {
    if (newPrompt && players.value[newPrompt.targetPlayerIndex]?.name.startsWith('AI')) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const state: GameState = {
        players: players.value,
        currentPlayerIndex: newPrompt.targetPlayerIndex,
        phase: phase.value,
        supply: supply.value,
        trash: trash.value,
        log: log.value,
        turnCount: turnCount.value
      };
      
      // Double check if this SPECIFIC prompt is still the active one
      if (currentPrompt.value !== newPrompt) return

      const player = players.value[newPrompt.targetPlayerIndex]!

      if (newPrompt.type === 'sentry') {
        // --------------------------------------------------------------------------------
        // 衛兵
        // --------------------------------------------------------------------------------
        const decisions = newPrompt.revealedCards?.map(card => {
          const val = getAICardValueInHand(card, state, newPrompt.targetPlayerIndex, newPrompt.type);
          if (val < 0) return { card, action: 'trash' as const };
          if (val < 20) return { card, action: 'discard' as const };
          return { card, action: 'putBack' as const };
        }) || [];
        
        newPrompt.onConfirm(decisions);
      } else if (newPrompt.type === 'discard' || newPrompt.type === 'trash') {
        // --------------------------------------------------------------------------------
        // 捨て札、廃棄
        // --------------------------------------------------------------------------------
        const card = newPrompt.cardId ? ALL_CARDS[newPrompt.cardId] : null;

        if (card?.ai?.getDiscardTrashIndices) {
          const indices = card.ai.getDiscardTrashIndices(state, newPrompt.targetPlayerIndex, newPrompt as any);
          newPrompt.onConfirm(indices);
          return;
        }

        const handWithIndices = player.hand.map((card, index) => ({ card, index, value: getAICardValueInHand(card, state, newPrompt.targetPlayerIndex, 'trash') }));
        handWithIndices.sort((a, b) => a.value - b.value);
        
        // Strategy: Discard/Trash lowest value cards up to max, respecting min
        let selectedIndices: number[] = [];
        if (newPrompt.min === 0) {
          // If optional, only discard/trash "bad" cards (value < threshold)
          const threshold = 20;
          selectedIndices = handWithIndices
            .filter(item => item.value < threshold)
            .map(item => item.index)
            .slice(0, newPrompt.max);
        } else {
          // If mandatory, take the absolute worst cards
          selectedIndices = handWithIndices.slice(0, newPrompt.min).map(item => item.index);
        }
        newPrompt.onConfirm(selectedIndices);
      } else if (newPrompt.type === 'reorder') {
        // --------------------------------------------------------------------------------
        // 並べ替え
        // --------------------------------------------------------------------------------
        const cards = newPrompt.revealedCards && newPrompt.revealedCards.length > 0 ? newPrompt.revealedCards : players.value[newPrompt.targetPlayerIndex]!.hand;
        const items = cards.map((c, i) => ({ c, i, v: getAICardValueInHand(c, state, newPrompt.targetPlayerIndex, 'reorder') }));
        
        // If it's for Secret Chamber (hand-based), prioritize putting low value cards back
        // If it's for Patrol (revealed cards), prioritize putting high value cards back? 
        // Actually items[0] is top of deck. For Patrol, we want higher cost on top.
        // For Secret Chamber, we want lower cost on top (it doesn't matter for the effect, but AI should dump bad cards).
        items.sort((a,b) => b.v - a.v); // Best cards first
        
        const resultIndices = items.map(it => it.i);
        if (!newPrompt.revealedCards || newPrompt.revealedCards.length === 0) {
          // If choosing from hand, only pick specified number
          newPrompt.onConfirm(resultIndices.slice(0, newPrompt.max || 1));
        } else {
          newPrompt.onConfirm(resultIndices);
        }
      } else if (newPrompt.type === 'gain') {
        // --------------------------------------------------------------------------------
        // 獲得
        // --------------------------------------------------------------------------------
        const allowedCost = newPrompt.allowedCost !== undefined ? newPrompt.allowedCost : 99;
        
        const choices = Object.keys(supply.value).filter(cardId => {
          const c = ALL_CARDS[cardId];
          if (!c || supply.value[cardId] === 0) return false;
          const currentCost = getCardCost(cardId, newPrompt.targetPlayerIndex);
          if (currentCost > allowedCost) return false;
          if (newPrompt.exactCost && currentCost !== allowedCost) return false;
          if (newPrompt.allowedTypes && !newPrompt.allowedTypes.some(t => c.type.includes(t))) return false;
          return true;
        });

        if (choices.length > 0) {
          // Use a high coin value (99) to get the intrinsic value of the card regardless of current purse
          choices.sort((a, b) => getAIPurchaseWeight(b, 99, state, newPrompt.targetPlayerIndex, helpers) - getAIPurchaseWeight(a, 99, state, newPrompt.targetPlayerIndex, helpers));
          const bestCardId = choices[0]!;
          const bestWeight = getAIPurchaseWeight(bestCardId, 99, state, newPrompt.targetPlayerIndex, helpers);

          // If optional (min=0) and the top card is worthless (e.g. weight <= 5 like Curses or unwanted Coppers), skip
          if (newPrompt.min === 0 && bestWeight <= 5) {
            newPrompt.onConfirm('');
          } else {
            newPrompt.onConfirm(bestCardId);
          }
        } else {
          newPrompt.onConfirm('');
        }
      } else if (newPrompt.type === 'choice') {
        const options = newPrompt.options || [];
        const card = newPrompt.cardId ? ALL_CARDS[newPrompt.cardId] : null;

        if (newPrompt.maxChoices !== undefined) {
          // Multi-choice (Pawn, Courtier, Nobles, etc.)
          let selected: string[] = [];
          
          if (card?.ai?.getChoicePriorities) {
            const priorities = card.ai.getChoicePriorities(state, newPrompt.targetPlayerIndex);
            selected = priorities.filter(opt => options.includes(opt)).slice(0, newPrompt.maxChoices);
          }

          // Legacy fallbacks if no cardId or no ai block (until Phase 3 is complete)
          if (selected.length === 0) {
            if (newPrompt.message.includes('手先')) {
              selected = ['+1 カード', '+1 アクション'].filter(opt => options.includes(opt));
            } else if (newPrompt.message.includes('廷臣')) {
              selected = ['金貨を獲得', '+3 コイン'].filter(opt => options.includes(opt));
            }
          }

          // Final safety fill
          while (selected.length < (newPrompt.maxChoices || 0) && selected.length < options.length) {
            const nextMatch = options.find(opt => !selected.includes(opt));
            if (nextMatch) selected.push(nextMatch);
            else break;
          }
          newPrompt.onConfirm(selected);
        } else {
          // Single-choice delegate
          if (card?.ai?.getChoicePriorities) {
             const priorities = card.ai.getChoicePriorities(state, newPrompt.targetPlayerIndex);
             const match = priorities.find(opt => options.includes(opt));
            if (match) {
              newPrompt.onConfirm(match);
              return;
            }
          }

          // Generic toggle (YES/NO, Keep/Discard)
          const choice = (player.hand.length >= 6) ? options[1] : options[0]; 
          (newPrompt.onConfirm as any)(choice || options[0]);
        }
      } else {
        // Default: Select first valid options
        const indices: number[] = []
        for (let i = 0; i < newPrompt.min; i++) indices.push(i)
        newPrompt.onConfirm(indices)
      }
    }
  })

  const initGame = (aiCount: number = 1, explicitlySelectedCards?: string[]) => {

    const playerNames = ['You']
    for (let i = 1; i <= aiCount; i++) {
      playerNames.push(`AI ${i}`)
    }

    const personas: AIPersona[] = ['Attack', 'Combo', 'BigMoney', 'Compression', 'Balance'];
    shuffle(personas);

    players.value = playerNames.map((name, index) => {
      let deck: Card[] = []
      
      if (name === 'You' && DEBUG_DECK_USER.length > 0) {
        // Map string IDs to actual Card objects. Unrecognized IDs become copper.
        deck = DEBUG_DECK_USER.map(id => ALL_CARDS[id]! || ALL_CARDS['copper']!)
        // Do not shuffle debug deck so it's predictable (draws from end)
      } else if (name !== 'You' && DEBUG_DECK_AI.length > 0) {
        // Map string IDs to actual Card objects. Unrecognized IDs become copper.
        deck = DEBUG_DECK_AI.map(id => ALL_CARDS[id]! || ALL_CARDS['copper']!)
        // Do not shuffle debug deck so it's predictable (draws from end)
      } else {
        deck = [
          ...Array(7).fill(ALL_CARDS['copper']),
          ...Array(3).fill(ALL_CARDS['estate'])
        ]
        shuffle(deck)
      }
      
      const player: PlayerState = {
        id: index,
        name: name === 'You' ? name : `${name}(${personas[index]})`,
        hand: [],
        deck,
        discard: [],
        boughtCards: [],
        actions: 1,
        buys: 1,
        coins: 0,
        potions: 0,
        vpTokens: 0,
        totalPoints: 3,
        inPlay: [],
        turnFlags: {},
        persona: personas[index]!
      }
      return player
    })

    // Init trash
    trash.value = []

    // Init hand
    players.value.forEach((_, i) => drawCards(i, 5))

    const allKingdomCards = cardGroups.flatMap(g => g.cards)
    
    let selectedKingdomCards: string[] = []
    
    if (explicitlySelectedCards && explicitlySelectedCards.length === 10) {
      selectedKingdomCards = [...explicitlySelectedCards]
    } else {
      // Shuffle and pick 10
      const shuffledCards = [...allKingdomCards]
      shuffle(shuffledCards)
      selectedKingdomCards = shuffledCards.slice(0, 10)
    }
    
    // Sort by cost for better UX
    selectedKingdomCards.sort((a, b) => ALL_CARDS[a]!.cost - ALL_CARDS[b]!.cost)

    const playerCount = playerNames.length
    supply.value = {
      copper: 60,
      silver: 40,
      gold: 30,
      estate: playerCount <= 2 ? 8 : 12,
      duchy: playerCount <= 2 ? 8 : 12,
      province: playerCount <= 2 ? 8 : 12,
      curse: 10 * (playerCount - 1)
    }
    
    selectedKingdomCards.forEach(id => {
      supply.value[id] = 10
    })

    const needsPotion = selectedKingdomCards.some(id => ALL_CARDS[id]?.costPotion);
    if (needsPotion) {
      supply.value['potion'] = 16;
    }

    const needsColony = selectedKingdomCards.some(id => PROSPERITY_CARDS[id]);
    if (needsColony) {
      supply.value['platinum'] = 12;
      supply.value['colony'] = playerCount <= 2 ? 8 : 12;
    }

    currentPlayerIndex.value = 0
    phase.value = 'Action'
    turnCount.value = 1
    log.value = []
    isGameOver.value = false
    winners.value = []
    
    // 初期の勝利点を計算
    players.value.forEach((_, i) => calculateTotalPoints(i))
    
    addLog('ゲームが開始されました。')

    // 前ゲームのリセット
    clearPrompt()
    // checkActionPhase()

    if (players.value[currentPlayerIndex.value]!.name.startsWith('AI')) {
      runAITurn()
    }
  }

  const trashCard = (playerIndex: number, cardIndex: number) => {
    const player = players.value[playerIndex]!
    const card = player.hand[cardIndex]
    if (card) {
      player.hand.splice(cardIndex, 1)
      trash.value.push(card)
      addLog(`${player.name} は ${card.jpName} を廃棄しました。`)
    }
  }

  const setPrompt = (prompt: ActionPrompt) => {
    currentPrompt.value = prompt
  }

  const clearPrompt = () => {
    currentPrompt.value = null
    checkActionPhase() // Check after prompt resolves
  }

  const discardSelected = (playerIndex: number, cardIndices: number[]) => {
    const player = players.value[playerIndex]!
    // Sort indices descending to splice safely
    const sorted = [...cardIndices].sort((a, b) => b - a)
    sorted.forEach(idx => {
      const card = player.hand[idx]
      if (card) {
        player.hand.splice(idx, 1)
        player.discard.push(card)
      }
    })
  }

  const revealCards = (playerIndex: number, count: number): Card[] => {
    const player = players.value[playerIndex]!
    const revealed: Card[] = []
    
    // Using existing draw logic but putting them in revealed array instead of hand
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        if (player.discard.length === 0) break
        player.deck = [...player.discard]
        player.discard = []
        shuffle(player.deck)
        addLog(`${player.name} は捨て札をシャッフルして山札に戻しました。`)
      }
      const card = player.deck.pop()
      if (card) revealed.push(card)
    }
    
    if (revealed.length > 0) {
      const cardNames = revealed.map(c => c.jpName).join('、')
      addLog(`${player.name} は ${cardNames} を公開しました。`)
    }
    return revealed
  }

  const gainCard = (playerIndex: number, cardId: string, destination: 'discard' | 'hand' | 'deck' = 'discard') => {
    const player = players.value[playerIndex]!
    const card = ALL_CARDS[cardId]
    if (!card) return
    if (supply.value[cardId]! <= 0) return

    supply.value[cardId]!--
    if (destination === 'hand') {
      player.hand.push(card)
    } else if (destination === 'deck') {
      player.deck.push(card)
    } else {
      player.discard.push(card)
    }
    
    addLog(`${player.name} は ${card.jpName} を獲得しました。`)
    calculateTotalPoints(playerIndex)
    checkGameOver()
  }

  const getCard = (cardId: string) => {
    return ALL_CARDS[cardId] ?? undefined
  }

  const getCardTreasure = (cardId: string, playerIndex: number) => {
    const card = ALL_CARDS[cardId]
    if (!card) return 0
    if (typeof card.treasure === 'number') {
      return card.treasure
    } else if (typeof card.treasure === 'function') {
      const state: GameState = { 
        players: players.value, 
        currentPlayerIndex: currentPlayerIndex.value, 
        phase: phase.value, 
        supply: supply.value, 
        trash: trash.value, 
        log: log.value, 
        turnCount: turnCount.value 
      }
      return card.treasure(state, playerIndex)
    }
    return 0
  }

  const playCard = (cardIndex: number) => {
    if (currentPrompt.value) return // Block normal play if prompt is active
    const player = currentPlayer.value
    const card = player.hand[cardIndex]!
    const state: GameState = { 
      players: players.value, 
      currentPlayerIndex: currentPlayerIndex.value, 
      phase: phase.value, 
      supply: supply.value, 
      trash: trash.value, 
      log: log.value, 
      turnCount: turnCount.value 
    }

    if (phase.value === 'Action' && card.type.includes('Action')) {
      if (player.actions > 0) {
        player.actions--
        player.hand.splice(cardIndex, 1)
        player.inPlay.push(card) 
        addLog(`${player.name} は ${card.jpName} を使用しました。`)
        
        // Apply basic effects from metadata
        if (card.effects) {
          if (card.effects.draw) drawCards(currentPlayerIndex.value, card.effects.draw)
          if (card.effects.action) player.actions += card.effects.action
          if (card.effects.buy) player.buys += card.effects.buy
          if (card.effects.coin) player.coins += card.effects.coin
          if (card.effects.vpTokens) player.vpTokens += card.effects.vpTokens
        }

        if (card.action) {
          card.action(state, currentPlayerIndex.value, helpers)
        }
        if (!currentPrompt.value) checkActionPhase() // Only check if no prompt was pushed
      }
    } else if (phase.value === 'Buy' && card.type.includes('Treasure')) {
      player.hand.splice(cardIndex, 1)
      player.inPlay.push(card)
      let earnedCoins = 0
      let earnedPotions = card.potionValue || 0

      if (typeof card.treasure === 'number') {
        earnedCoins = card.treasure;  
      } else if (typeof card.treasure === 'function') {
        earnedCoins = card.treasure(state, currentPlayerIndex.value);
      }
      
      player.coins += earnedCoins
      player.potions += earnedPotions
      
      // Merchant check
      if (card.id === 'silver') {
        const merchantCount = player.inPlay.filter(c => c.id === 'merchant').length;
        if (merchantCount > 0 && !player.turnFlags?.silverPlayed) {
          player.coins += merchantCount;
          addLog(`${player.name} は商人の効果で +${merchantCount} コインを得ました。`);
          player.turnFlags = { ...player.turnFlags, silverPlayed: true };
        }
      }

      // 財宝プレイ時効果
      if (card.onPlay) {
        card.onPlay(state, currentPlayerIndex.value, helpers);
      }

      const msgParts = [];
      if (earnedCoins > 0) msgParts.push(`+${earnedCoins} コイン`);
      if (earnedPotions > 0) msgParts.push(`+${earnedPotions} ポーション`);
      const msg = msgParts.length > 0 ? ` (${msgParts.join(', ')})` : '';

      addLog(`${player.name} は ${card.jpName} をプレイしました${msg}。`)
    }
  }

  const playAllTreasures = () => {
    if (phase.value !== 'Buy') return
    const player = currentPlayer.value
    const treasures = player.hand.filter(c => c.type.includes('Treasure'))
    treasures.forEach(card => {
      const idx = player.hand.indexOf(card)
      player.hand.splice(idx, 1)
      player.inPlay.push(card)
      
      let earnedPotions = card.potionValue || 0
      player.coins += getCardTreasure(card.id, player.id)
      player.potions += earnedPotions
    })
    if (treasures.length > 0) {
      addLog(`${player.name} は手札の財宝カードをすべてプレイしました。`)
    }
  }

  const buyCard = (cardId: string) => {
    if (phase.value !== 'Buy') return
    const player = currentPlayer.value
    const card = ALL_CARDS[cardId]
    if (!card) return

    const currentCost = getCardCost(cardId, currentPlayerIndex.value);
    const potionCost = card.costPotion || 0;
    if (player.buys > 0 && player.coins >= currentCost && player.potions >= potionCost && supply.value[cardId]! > 0) {
      player.buys--
      player.coins -= currentCost
      player.potions -= potionCost
      player.boughtCards.push(card)
      gainCard(currentPlayerIndex.value, cardId, 'discard')

      // 購入時インターセプター
      for (let i = 0; i < player.inPlay.length; i++) {
        const card = player.inPlay[i]!;
        if (card.onBuy) {
          const state: GameState = { 
            players: players.value, 
            currentPlayerIndex: currentPlayerIndex.value, 
            phase: phase.value, 
            supply: supply.value, 
            trash: trash.value, 
            log: log.value, 
            turnCount: turnCount.value 
          };
          const handled = card.onBuy(state, currentPlayerIndex.value, helpers, card, i);
          if (handled) return; // Wait for prompt
        }
      }

      // 各種フラグ解除
      if (player.turnFlags?.gainCardToDeck) player.turnFlags.gainCardToDeck = false;
      
      // Auto end turn if buys are 0
      if (player.buys === 0) {
        endTurn()
      }
    }
  }

  const endTurn = () => {
    if (currentPrompt.value) return // Block end turn if prompt active
    const player = currentPlayer.value

    // --- Cleanup interceptors (Cards with onCleanup) ---
    for (let i = 0; i < player.inPlay.length; i++) {
      const card = player.inPlay[i]!;
      if (card.onCleanup) {
        const state: GameState = { 
          players: players.value, 
          currentPlayerIndex: currentPlayerIndex.value, 
          phase: phase.value, 
          supply: supply.value, 
          trash: trash.value, 
          log: log.value, 
          turnCount: turnCount.value 
        };
        const handled = card.onCleanup(state, currentPlayerIndex.value, helpers, card, i);
        if (handled) return; // Wait for prompt resolution which will call endTurn again
      }
    }

    // Cleanup Phase
    player.discard.push(...player.hand, ...player.inPlay)
    player.hand = []
    player.inPlay = []
    player.boughtCards = []
    player.actions = 1
    player.buys = 1
    player.coins = 0
    player.potions = 0
    player.turnFlags = {}
    
    drawCards(currentPlayerIndex.value, 5)
    
    // Switch player
    currentPlayerIndex.value = (currentPlayerIndex.value + 1) % players.value.length
    if (currentPlayerIndex.value === 0) turnCount.value++
    
    phase.value = 'Action'
    addLog(`${players.value[currentPlayerIndex.value]!.name} のターンです。`)
    
    checkActionPhase()

    if (players.value[currentPlayerIndex.value]!.name.startsWith('AI')) {
      runAITurn()
    }
  }

  const calculateTotalPoints = (playerIndex: number) => {
    const player = players.value[playerIndex]!
    const allCards = [...player.hand, ...player.deck, ...player.discard, ...player.inPlay]
    let total = 0
    allCards.forEach(c => {
      if (typeof c.points === 'number') {
        total += c.points
      } else if (typeof c.points === 'function') {
        const state: GameState = { 
          players: players.value, 
          currentPlayerIndex: currentPlayerIndex.value, 
          phase: phase.value, 
          supply: supply.value, 
          trash: trash.value, 
          log: log.value, 
          turnCount: turnCount.value 
        }
        total += c.points(state, playerIndex)
      }
    })
    total += player.vpTokens
    player.totalPoints = total
    return total
  }
  
  const helpers: ActionHelpers = { 
    drawCards, addLog, shuffle, trashCard, setPrompt, clearPrompt, discardSelected, 
    revealCards, gainCard, getCard, getCardTreasure, getPrompt: () => currentPrompt.value, 
    checkActionPhase, processAttack, processAllPlayers, getCardCost, endTurn, calculateTotalPoints
  };

  const checkGameOver = () => {
    const emptyPiles = Object.values(supply.value).filter(count => count === 0).length
    const lostProvince = supply.value['province'] === 0
    const lostColony = typeof supply.value['colony'] === 'number' && supply.value['colony'] === 0
    if (lostProvince || lostColony || emptyPiles >= 3) {
      isGameOver.value = true
      addLog('!!! ゲーム終了 !!!')
      
      // Calculate final points for everyone
      players.value.forEach((_, i) => calculateTotalPoints(i))
      
      // Determine winner(s)
      const maxPoints = Math.max(...players.value.map(p => p.totalPoints))
      winners.value = players.value.filter(p => p.totalPoints === maxPoints)
      
      if (winners.value.length === 1 && winners.value[0]) {
        addLog(`勝者: ${winners.value[0].name} (${winners.value[0].totalPoints}点)`)
      } else if (winners.value.length > 1) {
        addLog(`引き分け: ${winners.value.map(p => p.name).join(', ')} (${maxPoints}点)`)
      }
      return true;
    }
    return false;
  }

  return {
    players,
    currentPlayerIndex,
    currentPlayer,
    currentPrompt,
    phase,
    supply,
    trash,
    log,
    turnCount,
    isGameOver,
    winners,
    processAttack,
    initGame,
    playCard,
    playAllTreasures,
    buyCard,
    gainCard,
    endActionPhase,
    endTurn,
    getCardCost
  }
}
