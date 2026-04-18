<script setup lang="ts">
import { ref, watch, computed, onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
import { useDominion } from '../composables/useDominion'
import { ALL_CARDS, deletedCards } from '../dominion/cards/00_index'
import CardSelectionModal from '../components/dominion/CardSelectionModal.vue'
import { COMMON_CARDS } from '../dominion/cards/01_common'

const router = useRouter()
const {
  players,
  currentPlayer,
  currentPlayerIndex,
  phase,
  supply,
  trash,
  log,
  turnCount,
  currentPrompt,
  isGameOver,
  winners,
  initGame,
  playCard,
  playAllTreasures,
  buyCard,
  endActionPhase,
  endTurn,
  getCardCost
} = useDominion()

// Component State for selection
const selectedCardIndices = ref<number[]>([])

type SentryAction = 'trash' | 'discard' | 'putBack'
const sentryActions = ref<{index: number, card: any, action: SentryAction}[]>([])
const selectedOptions = ref<string[]>([])

watch(currentPrompt, (newVal) => {
  if (newVal?.type === 'sentry') {
    sentryActions.value = []
  } else if (newVal?.type === 'choice') {
    selectedOptions.value = []
    selectedCardIndices.value = []
  } else {
    selectedCardIndices.value = []
    selectedOptions.value = []
  }
})

const isMyTurn = computed(() => currentPlayer.value.name === 'You')
const isMyPrompt = computed(() => currentPrompt.value && players.value[currentPrompt.value.targetPlayerIndex]?.name === 'You')
const canInteract = computed(() => isMyPrompt.value || (isMyTurn.value && !currentPrompt.value))
const canProgressPhase = computed(() => isMyTurn.value && !currentPrompt.value)

const handleSentryAction = (index: number, card: any, action: SentryAction) => {
  sentryActions.value = sentryActions.value.filter(d => d.index !== index)
  sentryActions.value.push({index, card, action})
}

const getSentryAction = (index: number) => {
  const found = sentryActions.value.find(d => d.index === index)
  return found ? found.action : null
}

const getPutBackOrder = (index: number) => {
  const putBacks = sentryActions.value.filter(d => d.action === 'putBack')
  const order = putBacks.findIndex(d => d.index === index)
  return order !== -1 ? order + 1 : null
}

// Handle Card Click (Play vs Select)
const handleCardClick = (index: number) => {
  if (currentPrompt.value) {
    const isSelected = selectedCardIndices.value.includes(index)
    if (isSelected) {
      selectedCardIndices.value = selectedCardIndices.value.filter(i => i !== index)
    } else {
      // Check max limit
      if (selectedCardIndices.value.length < currentPrompt.value.max) {
        selectedCardIndices.value.push(index)
      }
    }
  } else {
    playCard(index)
  }
}

const handleChoiceClick = (opt: string) => {
  if (!currentPrompt.value || !canInteract.value) return
  
  const max = currentPrompt.value.maxChoices
  if (max === undefined) {
    currentPrompt.value.onConfirm(opt)
    selectedOptions.value = []
    return
  }
  
  const isSelected = selectedOptions.value.includes(opt)
  if (isSelected) {
    selectedOptions.value = selectedOptions.value.filter(o => o !== opt)
  } else {
    if (selectedOptions.value.length < max) {
      selectedOptions.value.push(opt)
    }
  }
}

const confirmPrompt = () => {
  if (!currentPrompt.value) return
  
  if (currentPrompt.value.type === 'sentry') {
    if (sentryActions.value.length === (currentPrompt.value.revealedCards?.length || 0)) {
      const results = sentryActions.value.map(d => ({card: d.card, action: d.action}))
      currentPrompt.value.onConfirm(results)
      sentryActions.value = []
    }
    return
  }

  if (currentPrompt.value.type === 'choice' && currentPrompt.value.maxChoices !== undefined) {
    if (selectedOptions.value.length === currentPrompt.value.maxChoices) {
      currentPrompt.value.onConfirm([...selectedOptions.value])
      selectedOptions.value = []
    }
    return
  }

  if (selectedCardIndices.value.length >= currentPrompt.value.min) {
    currentPrompt.value.onConfirm([...selectedCardIndices.value])
    selectedCardIndices.value = [] // Reset selection after confirm
  }
}

const showSetup = ref(true)
const showCardModal = ref(false)
const cardSelectionState = ref<Record<string, 'use' | 'candidate' | 'exclude'>>({})
const aiCount = ref(1)

onBeforeMount(() => {
  setDefaultCardSelectionState();
})

const startGame = () => {
  // 決定された設定から10枚を選ぶロジック
  const useCards = Object.entries(cardSelectionState.value).filter(e => e[1] === 'use').map(e => e[0])
  const candidateCards = Object.entries(cardSelectionState.value).filter(e => e[1] === 'candidate').map(e => e[0])
  
  if (Object.keys(cardSelectionState.value).length > 0) {
    if (useCards.length + candidateCards.length < 10) {
      alert('「使用」と「候補」のカードを合わせて10枚以上選んでください。')
      return
    }
  }

  const selectedCards: string[] = []
  
  // 未設定の場合はデフォルトの全ランダムを使用するので null を渡すため何もしない
  if (Object.keys(cardSelectionState.value).length > 0) {
    // 使用カードを限界まで入れる（最大10）
    let pickUse = [...useCards]
    // ランダム抽出用
    const pickCandidates = [...candidateCards]
    // Fisher-Yates array shuffle for picking
    for (let i = pickCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pickCandidates[i], pickCandidates[j]] = [pickCandidates[j]!, pickCandidates[i]!];
    }

    selectedCards.push(...pickUse)
    
    // 足りない分を候補から補充
    while(selectedCards.length < 10 && pickCandidates.length > 0) {
      selectedCards.push(pickCandidates.pop()!)
    }
    
    initGame(aiCount.value, selectedCards)
  } else {
    initGame(aiCount.value)
  }
  
  showSetup.value = false
}

const setDefaultCardSelectionState = () => {
  cardSelectionState.value = {}
  const commonIds = Object.keys(COMMON_CARDS)
  Object.keys(ALL_CARDS).forEach(cardId => {
    // Basic cards should not be candidates for kingdom cards
    if (commonIds.includes(cardId)) {
      cardSelectionState.value[cardId] = 'exclude'
      return
    }
    cardSelectionState.value[cardId] = deletedCards.includes(cardId) ? 'exclude' : 'candidate'
  })
}

const handleSaveCardSelection = (state: Record<string, 'use' | 'candidate' | 'exclude'>) => {
  cardSelectionState.value = state
  showCardModal.value = false
}

const getCardById = (id: string) => {
  return ALL_CARDS[id] || { id, name: id, jpName: id, type: [], cost: 0, description: '' }
}

const getCardClass = (card: any) => {
  const classes = []
  const commonTreasure = Object.values(COMMON_CARDS).filter(c => c.type.includes('Treasure')).map(c => c.id)
  const isSupplyTreasure = card.type.includes('Treasure') && !commonTreasure.includes(card.id);
  if (card.type.includes('Reaction')) classes.push('type-reaction')
  else if (card.type.includes('Attack')) classes.push('type-attack')
  else if (card.type.includes('Victory')) classes.push('type-victory')
  else if (isSupplyTreasure) classes.push('type-treasure')
  else if (card.type.includes('Action')) classes.push('type-action')
  
  if (card.costPotion > 0 || card.id === 'potion') {
    classes.push('costs-potion')
  }
  return classes.join(' ')
}

const isCardGainable = (id: string) => {
  if (!currentPrompt.value) return false
  
  // Generic supply selection (e.g. Wishing Well guessing)
  if (currentPrompt.value.supplySelection) return true

  if (currentPrompt.value.type !== 'gain') return false
  if (supply.value[id] === 0) return false
  
  const card = getCardById(id)
  const prompt = currentPrompt.value
  const currentCost = getCardCost(id, prompt.targetPlayerIndex)
  
  // Alchemy Rule: A card with Potion in its cost can only be gained if the effect 
  // specifically allows it (defined by allowedPotion, default 0).
  const allowedPotion = prompt.allowedPotion || 0
  if ((card.costPotion || 0) > allowedPotion) return false

  if (prompt.allowedCost !== undefined) {
    if (prompt.exactCost) {
      if (currentCost !== prompt.allowedCost) return false
    } else {
      if (currentCost > prompt.allowedCost) return false
    }
  }
  if (prompt.allowedTypes && !prompt.allowedTypes.some(t => card.type.includes(t as any))) return false
  
  return true
}

const isCardUnpurchasable = (id: string) => {
  if (currentPrompt.value?.supplySelection) return false
  if (supply.value[id] === 0) return true
  
  if (currentPrompt.value?.type === 'gain') {
    return !isCardGainable(id)
  }
  
  const currentCost = getCardCost(id, currentPlayerIndex.value)
  const cardPotionCost = getCardById(id).costPotion || 0
  return !canInteract.value || phase.value !== 'Buy' || currentPlayer.value.coins < currentCost || currentPlayer.value.potions < cardPotionCost
}

const handleSupplyClick = (id: string) => {
  if (!canInteract.value) return
  
  if (currentPrompt.value?.supplySelection || currentPrompt.value?.type === 'gain') {
    // 獲得またはサプライ選択プロンプトの場合
    if (isCardGainable(id)) {
      currentPrompt.value.onConfirm(id)
    }
    return
  }
  
  if (phase.value === 'Buy' && !currentPrompt.value) {
    buyCard(id)
  }
}
</script>

<template>
  <div class="dominion-game-page">
    <div class="page-container">
      <!-- Setup Overlay -->
      <div v-if="showSetup" class="setup-overlay">
        <div class="setup-card">
          <h1 class="setup-title">DOMINION</h1>
          <p class="setup-subtitle">The classic deck-building game</p>
          <div class="setup-player-selection">
            <p class="selection-label">対戦相手（AI）の人数を選択してください</p>
            <div class="ai-selector">
              <button 
                v-for="n in [1, 2, 3]" 
                :key="n"
                class="ai-count-btn"
                :class="{ active: aiCount === n }"
                @click="aiCount = n"
              >
                {{ n }}名
              </button>
            </div>
          </div>
          <div class="setup-actions">
            <button class="settings-btn" @click="showCardModal = true">サプライ詳細設定</button>
            <button class="start-btn highlight" @click="startGame">
              <span class="btn-main">START GAME</span>
              <span class="btn-sub">vs AI ({{ aiCount }}名)</span>
            </button>
            <button class="back-btn-large" @click="router.push('/game-collection')">BACK TO HOME</button>
          </div>
        </div>
      </div>
      
      <CardSelectionModal 
        v-if="showCardModal" 
        :initial-state="cardSelectionState" 
        @close="showCardModal = false" 
        @save="handleSaveCardSelection" 
      />

      <!-- Game Over Overlay -->
      <div v-if="isGameOver && !showSetup" class="setup-overlay game-over">
        <div class="setup-card">
          <h1 class="setup-title">GAME OVER</h1>
          <div class="winner-announcement">
            <template v-if="winners.length === 1 && winners[0]">
              <div class="winner-name">{{ winners[0].name }} の勝利！</div>
            </template>
            <template v-else-if="winners.length > 1">
              <div class="winner-name">引き分け！</div>
            </template>
          </div>
          <div class="final-scores">
            <div v-for="p in players" :key="p.id" class="score-row">
              <span class="p-name">{{ p.name }}</span>
              <span class="p-score">{{ p.totalPoints }} 点</span>
            </div>
          </div>
          <div class="setup-actions">
            <button class="start-btn highlight" @click="showSetup = true">
              <span class="btn-main">NEW GAME</span>
            </button>
          </div>
        </div>
      </div>

      <div class="game-content" v-else-if="!showSetup">
        <div class="header">
          <div class="header-left">
            <button class="back-link" @click="router.push('/game-collection')">← BACK</button>
            <div class="game-info">
              Turn {{ turnCount }} - {{ currentPlayer.name }}'s Turn ({{ phase }} Phase)
              <span v-if="currentPlayer.name.startsWith('AI')" class="ai-thinking">Thinking...</span>
            </div>
          </div>
          <div class="header-right">
            <button class="reset-btn" @click="showSetup = true">🔄 NEW GAME</button>
          </div>
        </div>

        <div class="main-layout">
          <!-- Left Area: Cards Management -->
          <div class="game-main-area">
            <!-- Supply Area -->
            <div class="supply-area">
              <div class="supply-group">
                <h3 class="group-title">Kingdom</h3>
                <div class="cards-grid">
                  <div 
                    v-for="(count, id) in supply" 
                    :key="id" 
                    v-show="!['copper', 'silver', 'gold', 'platinum', 'potion', 'estate', 'duchy', 'province', 'colony', 'curse'].includes(id)"
                    class="card-wrapper"
                  >
                    <button 
                      class="supply-card" 
                      :class="[
                        getCardClass(getCardById(id)), 
                        { 
                          'unpurchasable': isCardUnpurchasable(id),
                          'is-gainable': isCardGainable(id)
                        }
                      ]"
                      @click="handleSupplyClick(id)"
                    >
                      <div class="card-cost">
                        {{ getCardCost(id, currentPlayerIndex) }}
                        <span v-if="getCardById(id).costPotion" class="potion-icon">💧</span>
                      </div>
                      <div class="card-name">{{ getCardById(id).jpName }}</div>
                      <div class="card-count">{{ count }}</div>
                      <div class="card-tooltip">
                        <div class="tooltip-name">{{ getCardById(id).jpName }}</div>
                        <div class="tooltip-type">{{ getCardById(id).type.join('/') }}</div>
                        <div class="tooltip-desc">{{ getCardById(id).description }}</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div class="supply-group">
                <h3 class="group-title">Treasure & Victory</h3>
                <div class="cards-grid basic">
                  <div 
                    v-for="id in ['copper', 'silver', 'gold', 'platinum', 'potion', 'estate', 'duchy', 'province', 'colony', 'curse'].filter(k => supply[k] !== undefined)" 
                    :key="id" 
                    class="card-wrapper"
                  >
                    <button 
                      class="supply-card"
                      :class="[
                        id, 
                        { 
                          'unpurchasable': isCardUnpurchasable(id),
                          'is-gainable': isCardGainable(id)
                        }
                      ]"
                      @click="handleSupplyClick(id)"
                    >
                      <div class="card-cost">
                        {{ getCardCost(id, currentPlayerIndex) }}
                        <span v-if="getCardById(id).costPotion" class="potion-icon">💧</span>
                      </div>
                      <div class="card-name">{{ getCardById(id).jpName }}</div>
                      <div class="card-count">{{ supply[id] }}</div>
                      <div class="card-tooltip">
                        <div class="tooltip-name">{{ getCardById(id).jpName }}</div>
                        <div class="tooltip-type">{{ getCardById(id).type.join('/') }}</div>
                        <div class="tooltip-desc">{{ getCardById(id).description }}</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- In Play Area -->
            <div class="in-play-area" v-if="currentPlayer.inPlay.length > 0">
              <div class="in-play-title">Cards in Play</div>
              <div class="in-play-cards">
                <div 
                  v-for="(card, i) in currentPlayer.inPlay" 
                  :key="i" 
                  class="in-play-card"
                  :class="[card.id, getCardClass(card)]"
                >
                  <div class="card-name">{{ card.jpName }}</div>
                </div>
              </div>
            </div>

            <!-- Hand Area -->
            <div class="player-hand-area" :class="{ 'is-attacking': currentPrompt && currentPrompt.targetPlayerIndex !== currentPlayer.id }">
              <div class="deck-status">
                <template v-if="currentPrompt && players[currentPrompt.targetPlayerIndex]">
                  <div class="deck-item player-name">対象: {{ players[currentPrompt.targetPlayerIndex]!.name }}</div>
                  <div class="deck-item">手札: {{ players[currentPrompt.targetPlayerIndex]!.hand.length }}</div>
                </template>
                <template v-else>
                  <div class="deck-item">山札: {{ currentPlayer.deck.length }}</div>
                  <div class="deck-item">場: {{ currentPlayer.inPlay.length }}</div>
                  <div class="deck-item">捨て札: {{ currentPlayer.discard.length }}</div>
                  <div class="deck-item">廃棄: {{ trash.length }}</div>
                  <div class="deck-item points">勝利点: {{ currentPlayer.totalPoints }}</div>
                  <div class="deck-item vp-tokens">VP: {{ currentPlayer.vpTokens }}</div>
                </template>
              </div>

              <!-- Interactive Prompt Area -->
              <div v-if="currentPrompt" class="prompt-area">
                <div class="prompt-message">{{ currentPrompt.message }}</div>
                
                <div v-if="currentPrompt.type === 'choice' && !currentPrompt.supplySelection" class="choice-prompt-contents">
                  <div class="choice-buttons">
                    <button 
                      v-for="opt in currentPrompt.options" 
                      :key="opt"
                      class="choice-btn"
                      :class="{ 'is-selected': selectedOptions.includes(opt) }"
                      @click="handleChoiceClick(opt)"
                    >
                      {{ opt }}
                    </button>
                    <button 
                      v-if="currentPrompt.maxChoices !== undefined"
                      class="confirm-btn" 
                      :disabled="!canInteract || selectedOptions.length !== currentPrompt.maxChoices"
                      @click="confirmPrompt"
                    >
                      決定
                    </button>
                  </div>
                </div>

                <div v-if="currentPrompt.type !== 'sentry' && currentPrompt.type !== 'choice'" class="prompt-controls">
                  <div v-if="currentPrompt.revealedCards" class="revealed-selection-area">
                    <div class="revealed-cards">
                      <div 
                        v-for="(card, i) in currentPrompt.revealedCards" 
                        :key="i" 
                        class="supply-card" 
                        :class="[card.id, getCardClass(card), { 'is-selected': selectedCardIndices.includes(i) }]"
                        @click="handleCardClick(i)"
                      >
                        <div class="card-cost">
                          {{ getCardCost(card.id, currentPrompt!.targetPlayerIndex) }}
                          <span v-if="getCardById(card.id).costPotion" class="potion-icon">💧</span>
                        </div>
                        <div class="card-name">{{ card.jpName }}</div>
                        <div v-if="selectedCardIndices.includes(i)" class="selected-card-badge">
                          {{ selectedCardIndices.indexOf(i) + 1 }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span>選択: {{ selectedCardIndices.length }} / {{ currentPrompt.max }} 枚 (最小 {{ currentPrompt.min }}枚)</span>
                  <button 
                    class="confirm-btn" 
                    :disabled="!canInteract || selectedCardIndices.length < currentPrompt.min"
                    @click="confirmPrompt"
                  >
                    決定
                  </button>
                </div>
                
                <div v-if="currentPrompt.type === 'sentry'" class="sentry-prompt-contents">
                  <div class="revealed-cards">
                    <div v-for="(card, i) in currentPrompt.revealedCards" :key="i" class="sentry-card-wrapper">
                      <div class="supply-card" :class="[card.id, getCardClass(card)]">
                        <div class="card-cost">
                          {{ getCardCost(card.id, currentPrompt!.targetPlayerIndex) }}
                          <span v-if="getCardById(card.id).costPotion" class="potion-icon">💧</span>
                        </div>
                        <div class="card-name">{{ card.jpName }}</div>
                      </div>
                      <div class="sentry-actions">
                        <button @click="handleSentryAction(i, card, 'trash')" :class="{active: getSentryAction(i) === 'trash'}">廃棄</button>
                        <button @click="handleSentryAction(i, card, 'discard')" :class="{active: getSentryAction(i) === 'discard'}">捨札</button>
                        <button @click="handleSentryAction(i, card, 'putBack')" :class="{active: getSentryAction(i) === 'putBack'}">
                          戻す <span v-if="getSentryAction(i) === 'putBack'">({{ getPutBackOrder(i) }})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <button 
                    class="confirm-btn" 
                    :disabled="!canInteract || sentryActions.length !== (currentPrompt.revealedCards?.length || 0)"
                    @click="confirmPrompt"
                  >
                    決定
                  </button>
                </div>
              </div>

              <div class="hand-cards">
                <button 
                  v-for="(card, i) in (
                    currentPrompt && players[currentPrompt.targetPlayerIndex] 
                      ? (currentPrompt.source === 'discard' ? players[currentPrompt.targetPlayerIndex]!.discard : players[currentPrompt.targetPlayerIndex]!.hand)
                      : currentPlayer.hand
                  )" 
                  :key="i" 
                  class="hand-card"
                  :class="[
                    card.id,
                    getCardClass(card),
                    { 
                      'can-play': canInteract && ((phase === 'Action' && card.type.includes('Action')) || (phase === 'Buy' && card.type.includes('Treasure'))),
                      'is-selectable': !!currentPrompt && canInteract,
                      'is-selected': !currentPrompt?.revealedCards && selectedCardIndices.includes(i),
                      'tooltip-left': i < 2,
                      'tooltip-right': i > (currentPrompt && players[currentPrompt.targetPlayerIndex] ? players[currentPrompt.targetPlayerIndex]!.hand.length : currentPlayer.hand.length) - 3
                    }
                  ]"
                  @click="canInteract && handleCardClick(i)"
                >
                  <div class="card-cost">
                    {{ getCardCost(card.id, currentPlayerIndex) }}
                    <span v-if="getCardById(card.id).costPotion" class="potion-icon">💧</span>
                  </div>
                  <div class="card-name">{{ card.jpName }}</div>
                  <div class="card-tooltip">
                    <div class="tooltip-name">{{ card.jpName }}</div>
                    <div class="tooltip-type">{{ card.type.join('/') }}</div>
                    <div class="tooltip-desc">{{ card.description }}</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Right sidebar: Status & Logs Area -->
          <div class="sidebar">
            <div class="status-panel">
              <div class="status-item">
                <span class="label">アクション</span>
                <span class="value">{{ currentPlayer.actions }}</span>
              </div>
              <div class="status-item">
                <span class="label">購入</span>
                <span class="value">{{ currentPlayer.buys }}</span>
              </div>
              <div class="status-item coins">
                <span class="label">コイン</span>
                <span class="value">{{ currentPlayer.coins }}</span>
              </div>
              <div class="status-item potions" v-if="currentPlayer.potions > 0 || supply['potion'] !== undefined">
                <span class="label">ポーション</span>
                <span class="value">{{ currentPlayer.potions }}</span>
              </div>
            </div>

            <div class="phase-actions">
              <button 
                v-if="phase === 'Action'" 
                class="action-btn"
                :disabled="!canProgressPhase"
                @click="endActionPhase"
              >
                購入フェーズへ
              </button>
              <button 
                v-if="phase === 'Buy'" 
                class="action-btn treasures"
                :disabled="!canProgressPhase"
                @click="playAllTreasures"
              >
                全財宝プレイ
              </button>
              <button 
                class="action-btn end-turn"
                :disabled="!canProgressPhase"
                @click="endTurn"
              >
                ターン終了
              </button>
            </div>

            <div class="log-panel">
              <div class="log-entries">
                <div v-for="(entry, i) in log" :key="i" class="log-entry">{{ entry }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dominion-game-page {
  min-height: 100vh;
  background: #1a1a2e;
  color: #e6e6e6;
  font-family: 'Outfit', sans-serif;
  display: flex;
  justify-content: center;
  padding: 1rem;
  overflow: hidden;
  height: 100vh;
}

.page-container {
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
}

/* Setup Overlay */
.setup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 20, 0.9);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.setup-card {
  background: #16213e;
  padding: 3rem;
  border-radius: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.setup-title {
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #f1c40f, #e67e22);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
  letter-spacing: 0.5rem;
}

.setup-subtitle {
  color: #94a3b8;
  margin-bottom: 2.5rem;
  font-size: 1.1rem;
}

.setup-actions {
  align-items: center;
}

.setup-player-selection {
  margin-bottom: 2rem;
  .selection-label {
    color: #94a3b8;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
  }
}

.ai-selector {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.ai-count-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 0.8rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: white;
  }

  &.active {
    background: rgba(241, 196, 15, 0.1);
    border-color: #f1c40f;
    color: #f1c40f;
    box-shadow: 0 0 15px rgba(241, 196, 15, 0.2);
  }
}

.start-btn {
  background: #f1c40f;
  border: none;
  padding: 1.2rem 3rem;
  border-radius: 1rem;
  color: #1a1a2e;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(241, 196, 15, 0.3);
  }

  .btn-main { font-weight: 800; font-size: 1.4rem; }
  .btn-sub { font-size: 0.9rem; opacity: 0.8; }
}

.settings-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
  padding: 0.8rem 2rem;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 2rem;
  transition: all 0.2s;
  width: 60%;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
  }
}

/* Game Over Styles */
.game-over {
  background: rgba(10, 10, 20, 0.95);
  .setup-title { color: #f1c40f; }
}

.winner-announcement {
  margin: 2rem 0;
  .winner-name {
    font-size: 2rem;
    font-weight: 900;
    color: white;
    text-shadow: 0 0 20px rgba(241, 196, 15, 0.5);
  }
}

.player-hand-area {
  background: rgba(10, 10, 20, 0.7);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  &.is-attacking {
    background: rgba(118, 11, 11, 0.3);
    border-top: 1px solid rgba(231, 76, 60, 0.5);
  }
}

/* In Play Area */
.in-play-area {
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 1rem;
  margin: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.in-play-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.1rem;
  font-weight: 700;
}

.in-play-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.in-play-card {
  height: 60px;
  width: 45px;
  background: #2a2e45;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0.25rem;
  font-size: 0.6rem;
  font-weight: 700;
  
  &.copper { background: #cd7f32; color: #fff; }
  &.silver { background: #bdc3c7; color: #2c3e50; }
  &.gold { background: #f1c40f; color: #1a1a2e; }
  &.platinum { background: #e5e4e2; color: #1a1a2e; }
  &.type-reaction { background: #3498db; color: #fff; }
  &.type-attack { background: #2c3e50; color: #fff; }
  &.type-action { background: #e67e22; color: #fff; }
  &.type-victory { background: #27ae60; color: #fff; }
  &.type-treasure { background: #e9c740; color: #1a1a2e; }
  &.potion, &.costs-potion { background: #38bdf8 !important; color: #0f172a !important; }
}

.final-scores {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.2rem;
  .p-name { color: #94a3b8; }
  .p-score { font-weight: 800; color: #f1c40f; }
}

.back-btn-large {
  background: transparent;
  border: none;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  &:hover { color: white; }
}

/* Header */
.ai-thinking {
  margin-left: 1rem;
  font-size: 0.9rem;
  color: #f1c40f;
  font-weight: bold;
  font-style: italic;
  animation: ai-pulse 2s infinite;
}

@keyframes ai-pulse {
  0% { opacity: 0.4; text-shadow: 0 0 5px rgba(241, 196, 15, 0); }
  50% { opacity: 1; text-shadow: 0 0 10px rgba(241, 196, 15, 0.5); }
  100% { opacity: 0.4; text-shadow: 0 0 5px rgba(241, 196, 15, 0); }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
}

.header-left { display: flex; align-items: center; gap: 2rem; }
.back-link {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-weight: 600;
  cursor: pointer;
  &:hover { color: white; }
}
.game-info { font-weight: 700; color: #f1c40f; }

.reset-btn {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  &:hover { background: rgba(231, 76, 60, 0.2); }
}

/* Main Layout */
.main-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
  overflow: hidden; /* Prevent overall layout scroll */
}

.game-main-area {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto; /* Scrolled if supply/hand are long */
  padding-right: 0.5rem;
}

/* Supply Area */
.supply-area {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 1rem;
}

.group-title {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1rem;
  color: #64748b;
  margin-bottom: 0.75rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 0.5rem;
  width: 100%;
}

.card-wrapper {
  position: relative;
  width: 100%;
}

.supply-card {
  width: 100%;
  aspect-ratio: 2.5 / 3.5;
  background: #2a2e45;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.4rem;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: inherit;

  &:hover {
    transform: scale(1.05);
    border-color: #f1c40f;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    z-index: 10;
    
    .card-tooltip {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }
  }

  .card-tooltip {
    bottom: auto;
    top: 110%;
    transform: translateX(-50%) translateY(-10px);
    
    &::after {
      top: auto;
      bottom: 100%;
      border-color: transparent transparent #3b82f6 transparent;
    }
  }

  &.unpurchasable {
    opacity: 0.6;
    filter: grayscale(0.5);
    cursor: default;
    &:hover { border-color: rgba(255, 255, 255, 0.2); }
  }

  &.copper { background: #cd7f32; color: #fff; }
  &.silver { background: #bdc3c7; color: #2c3e50; }
  &.gold { background: #f1c40f; color: #1a1a2e; }
  &.platinum { background: #e5e4e2; color: #1a1a2e; }
  &.estate { background: #2ecc71; color: #fff; }
  &.duchy { background: #27ae60; color: #fff; }
  &.province { background: #16a085; color: #fff; }
  &.colony { background: #149085; color: #fff; }
  &.curse { background: #8e44ad; color: #fff; }
  
  /* Type-based Action Colors */
  &.type-reaction { background: #3498db; color: #fff; } /* Blue-ish */
  &.type-attack { background: #2c3e50; color: #fff; }   /* Dark/Black-ish */
  &.type-action { background: #e67e22; color: #fff; }   /* Red/Orange-ish */
  &.type-victory { background: #27ae60; color: #fff; }  /* Green */
  &.type-treasure { background: #e9c740; color: #1a1a2e; }
  &.potion, &.costs-potion { background: #38bdf8 !important; color: #0f172a !important; }

  &.is-gainable {
    border: 2px solid #f1c40f;
    box-shadow: 0 0 15px rgba(241, 196, 15, 0.5);
    animation: pulse-gainable 2s infinite;
  }
}

@keyframes pulse-gainable {
  0% { transform: scale(1); box-shadow: 0 0 5px rgba(241, 196, 15, 0.3); }
  50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(241, 196, 15, 0.7); }
  100% { transform: scale(1); box-shadow: 0 0 5px rgba(241, 196, 15, 0.3); }
}

.card-cost {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #f1c40f;
  color: #1a1a2e;
  border-radius: 50%;
  font-size: 0.6rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-name { font-size: 0.7rem; font-weight: 700; }
.card-count {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 0.6rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 3px;
  border-radius: 3px;
}

/* Tooltip */
.card-tooltip {
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  width: 180px;
  background: #1e293b;
  border: 1px solid #3b82f6;
  border-radius: 0.5rem;
  padding: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease-out;
  pointer-events: none;
  z-index: 1000;
  text-align: left;

  .tooltip-name { font-weight: 800; color: #f1c40f; margin-bottom: 0.25rem; font-size: 0.9rem; }
  .tooltip-type { font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.4rem; padding-bottom: 0.4rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
  .tooltip-desc { font-size: 0.75rem; color: #e2e8f0; line-height: 1.4; }
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px;
    border-style: solid;
    border-color: #3b82f6 transparent transparent transparent;
  }

  /* Clip avoidance for hand cards */
  &.tooltip-left {
    left: 0;
    transform: translateX(0) translateY(10px);
    &::after { left: 20px; transform: none; }
  }
  &.tooltip-right {
    left: auto;
    right: 0;
    transform: translateX(0) translateY(10px);
    &::after { left: auto; right: 20px; transform: none; }
  }
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.status-panel {
  background: #16213e;
  padding: 1rem;
  border-radius: 0.75rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  text-align: center;
}

.status-item {
  display: flex;
  flex-direction: column;
  .label { font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; }
  .value { font-size: 1.2rem; font-weight: 800; }
  &.coins .value { color: #f1c40f; }
}

.phase-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-btn {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: none;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: #3b82f6;
  color: white;

  &:hover { background: #2563eb; }
  &.treasures { background: #f1c40f; color: #1a1a2e; }
  &.end-turn { background: #e74c3c; }

  &:disabled, &[disabled] {
    background: #475569 !important;
    color: #94a3b8 !important;
    cursor: not-allowed;
    opacity: 0.5;
    transform: none !important;
    box-shadow: none !important;
  }
}

.log-panel {
  flex: 1;
  background: #101827;
  border-radius: 0.75rem;
  padding: 0.75rem;
  font-size: 0.8rem;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column-reverse; /* Latest logs at top or keep normal but auto scroll? User said "scrolled down" */
}

.log-entry {
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  &:first-child { color: #fff; font-weight: 600; }
}

/* Hand Area */
.player-hand-area {
  margin-top: 1rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.75rem;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
  z-index: 20;
}

.deck-status {
  display: flex;
  gap: 1.5rem;
  font-size: 0.8rem;
  color: #94a3b8;
  .points { color: #f1c40f; font-weight: 700; }
  .vp-tokens { color: #0ff134; font-weight: 700; }
}

.hand-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.hand-card {
  flex: 0 0 80px;
  aspect-ratio: 2.5 / 3.5;
  background: #2a2e45;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.4rem;
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: default;
  transition: all 0.2s;
  position: relative;
  color: inherit;

  &.can-play {
    cursor: pointer;
    border-color: #3b82f6;
    &:hover { 
      transform: translateY(-5px); 
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4); 
    }
  }

  &.is-selectable {
    cursor: pointer;
    &:hover {
      transform: translateY(-5px); 
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4); 
    }
  }

  &.is-selected {
    transform: translateY(-15px) !important;
    border-color: #f1c40f;
    box-shadow: 0 0 15px rgba(241, 196, 15, 0.5);
    z-index: 50;
  }

  &.copper { background: #cd7f32; color: #fff; }
  &.silver { background: #bdc3c7; color: #2c3e50; }
  &.gold { background: #f1c40f; color: #1a1a2e; }
  &.platinum { background: #e5e4e2; color: #1a1a2e; }
  &.estate { background: #2ecc71; color: #fff; }
  &.duchy { background: #27ae60; color: #fff; }
  &.province { background: #16a085; color: #fff; }
  &.curse { background: #8e44ad; color: #fff; }
  
  &.type-reaction { background: #3498db; color: #fff; }
  &.type-attack { background: #2c3e50; color: #fff; }
  &.type-action { background: #e67e22; color: #fff; }
  &.type-victory { background: #27ae60; color: #fff; }
  &.type-treasure { background: #e9c740; color: #1a1a2e; }

  &.potion, &.costs-potion { background: #38bdf8 !important; color: #0f172a !important; }

  &:hover {
    z-index: 100;
    .card-tooltip {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
      
      &.tooltip-left {
        transform: translateX(0) translateY(0);
      }
      &.tooltip-right {
        transform: translateX(0) translateY(0);
      }
    }
  }

  .card-tooltip {
    &.tooltip-left {
      left: 0;
      transform: translateX(0) translateY(10px);
      &::after { left: 20px; transform: none; }
    }
    &.tooltip-right {
      left: auto;
      right: 0;
      transform: translateX(0) translateY(10px);
      &::after { left: auto; right: 20px; transform: none; }
    }
  }
}

.card-type { font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.5rem; }
.card-desc { font-size: 0.65rem; color: #cbd5e1; line-height: 1.2; margin-top: auto; }

/* Prompt Area */
.prompt-area {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid #3b82f6;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.prompt-message {
  font-weight: 700;
  color: #60a5fa;
  font-size: 0.9rem;
}

.prompt-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
  color: #94a3b8;
}

.choice-prompt-contents {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.choice-buttons {
  display: flex;
  gap: 0.5rem;
}

.choice-btn {
  background: #f1c40f;
  color: #1a1a2e;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 0.4rem;
  font-weight: 800;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
  
  &:hover {
    background: #e6b800;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  }

  &.is-selected {
    background: #e67e22;
    color: white;
    box-shadow: 0 0 10px rgba(230, 126, 34, 0.5);
  }
}

.confirm-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 0.4rem;
  font-weight: 700;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background: #2563eb;
  }
  
  &:disabled {
    background: #475569;
    color: #94a3b8;
    cursor: not-allowed;
  }
}

.sentry-prompt-contents {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.revealed-cards {
  display: flex;
  gap: 1rem;
}

.sentry-card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  
  .supply-card {
    width: 60px;
    height: auto;
    aspect-ratio: 2.5 / 3.5;
    cursor: default;
    transform: none !important;
    padding: 0.25rem;
  }
}

.sentry-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  
  button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #cbd5e1;
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 0.7rem;
    cursor: pointer;
    
    &.active {
      background: #f1c40f;
      color: #1a1a2e;
      border-color: #f1c40f;
      font-weight: bold;
    }
  }
}


.revealed-selection-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  margin-bottom: 1rem;
}

.selected-card-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #3b82f6;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 800;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  z-index: 10;
  border: 1.5px solid white;
}

@media (max-width: 900px) {
  .main-layout { grid-template-columns: 1fr; }
  .sidebar { flex-direction: row; height: 200px; }
  .log-panel { display: none; }
}
</style>
