<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2 class="modal-title">サプライ（王国カード）設定</h2>
      <p class="modal-desc">
        使用するカードを指定できます。<br>
        「使用」の枚数は最大10枚まで設定可能です。不足分は「候補」の中からランダムで選ばれます。
      </p>

      <div class="summary-bar">
        <div class="summary-item" :class="{ 'is-full': useCount === 10 }">
          <span class="label">使用 (確定):</span>
          <span class="value">{{ useCount }} / 10 枚</span>
        </div>
        <div class="summary-item">
          <span class="label">候補 (ランダム抽出):</span>
          <span class="value">{{ candidateCount }} 枚</span>
        </div>
      </div>

      <div class="set-list">
        <div v-for="group in cardGroups" :key="group.name" class="set-group">
          <div class="group-header">
            <h3>{{ group.name }}</h3>
            <div class="group-actions">
               <button class="btn-small" @click="setGroupState(group, 'candidate')">全候補</button>
               <button class="btn-small exclude" @click="setGroupState(group, 'exclude')">全不使用</button>
               <!-- 全使用は10枚制限に引っかかる可能性があるため一括ボタンから除外、または制限内で利用可能にする -->
            </div>
          </div>
          <div class="cards-grid">
            <div v-for="cardId in sortCards(group.cards)" :key="cardId" class="card-item" :class="[cardStatus[cardId]]">
               <div class="card-info" :title="getCardDesc(cardId)">
                 <span class="card-cost">{{ getCardCost(cardId) }}</span>
                 <span v-if="getPotionCost(cardId) > 0" class="card-name">🧪</span>
                 <span class="card-name">{{ getCardName(cardId) }}</span>
               </div>
               <div class="card-toggles">
                 <button 
                  class="toggle-btn use"
                  :class="{ active: cardStatus[cardId] === 'use' }" 
                  @click="setCardState(cardId, 'use')"
                  :disabled="cardStatus[cardId] !== 'use' && useCount >= 10"
                 >使用</button>
                 <button 
                  class="toggle-btn candidate"
                  :class="{ active: cardStatus[cardId] === 'candidate' }" 
                  @click="setCardState(cardId, 'candidate')"
                 >候補</button>
                 <button 
                  class="toggle-btn exclude"
                  :class="{ active: cardStatus[cardId] === 'exclude' }" 
                  @click="setCardState(cardId, 'exclude')"
                 >不可</button>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('close')">キャンセル</button>
        <button class="btn-default" @click="setDefaultCardSelectionState">初期設定</button>
        <button class="btn-save" @click="save" :disabled="!isSaveable">
          <span v-if="!isSaveable">「使用＋候補」で必ず10枚以上指定してください</span>
          <span v-else>設定して戻る</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ALL_CARDS, cardGroups } from '../../dominion/cards/00_index'

const props = defineProps<{
  initialState: Record<string, 'use' | 'candidate' | 'exclude'>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', state: Record<string, 'use' | 'candidate' | 'exclude'>): void
}>()

// 存在するカードIDだけフィルタリングする（安全のため）
cardGroups.forEach(g => {
  g.cards = g.cards.filter(id => ALL_CARDS[id])
})

// 初期状態のコピーを作成
const cardStatus = ref<Record<string, 'use' | 'candidate' | 'exclude'>>({ ...props.initialState })

const setDefaultCardSelectionState = () => {
  Object.keys(cardStatus.value).forEach(cardId => {
    cardStatus.value[cardId] = props.initialState[cardId] ?? 'candidate'
  })
}

// 足りないカードを補完
cardGroups.forEach(g => {
  g.cards.forEach(id => {
    if (!cardStatus.value[id]) {
      cardStatus.value[id] = 'candidate' // デフォルトは候補
    }
  })
})

const getCardName = (id: string) => ALL_CARDS[id]?.jpName || id
const getCardCost = (id: string) => ALL_CARDS[id]?.cost ?? 0
const getPotionCost = (id: string) => ALL_CARDS[id]?.costPotion ?? 0
const getCardDesc = (id: string) => ALL_CARDS[id]?.description || ''

const sortCards = (cards: string[]) => {
  return cards.sort((a, b) => {
    const potionA = getPotionCost(a)
    const potionB = getPotionCost(b)
    if (potionA !== potionB) {
      return potionA - potionB
    }
    const costA = getCardCost(a)
    const costB = getCardCost(b)
    if (costA !== costB) {
      return costA - costB
    }
    return getCardName(a).localeCompare(getCardName(b))
  })
}

const useCount = computed(() => Object.values(cardStatus.value).filter(v => v === 'use').length)
const candidateCount = computed(() => Object.values(cardStatus.value).filter(v => v === 'candidate').length)

const isSaveable = computed(() => (useCount.value + candidateCount.value) >= 10)

const setCardState = (id: string, state: 'use' | 'candidate' | 'exclude') => {
  if (state === 'use' && cardStatus.value[id] !== 'use' && useCount.value >= 10) {
    return // 上限チェック
  }
  cardStatus.value[id] = state
}

const setGroupState = (group: { name: string, cards: string[] }, state: 'candidate' | 'exclude') => {
  group.cards.forEach(id => {
    // 既に使用で、candidate/excludeにする場合は変更可能
    cardStatus.value[id] = state
  })
}

const save = () => {
  emit('save', cardStatus.value)
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  padding: 1rem;
}

.modal-content {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  width: 100%;
  max-width: 800px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  color: #f8fafc;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-title {
  padding: 1.5rem 1.5rem 0.5rem;
  margin: 0;
  font-size: 1.5rem;
  color: #f1c40f;
  font-weight: bold;
}

.modal-desc {
  padding: 0 1.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #94a3b8;
  line-height: 1.5;
}

.summary-bar {
  display: flex;
  gap: 2rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .summary-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .label {
      color: #94a3b8;
      font-size: 0.9rem;
    }
    .value {
      font-weight: bold;
      font-size: 1.1rem;
    }

    &.is-full .value {
      color: #4ade80; /* green for max cards using */
    }
  }
}

.set-list {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
}

.set-group {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);

    h3 {
      margin: 0;
      color: #e2e8f0;
      font-size: 1.2rem;
    }

    .group-actions {
      display: flex;
      gap: 0.5rem;

      .btn-small {
        background: #334155;
        border: none;
        color: white;
        padding: 0.4rem 0.8rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        cursor: pointer;
        transition: background 0.2s;

        &:hover { background: #475569; }
        &.exclude:hover { background: #991b1b; }
      }
    }
  }
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.card-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #0f172a;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;

  &.use { border-color: #4ade80; background: rgba(74, 222, 128, 0.1); }
  &.exclude { opacity: 0.5; border-color: #ef4444; }

  .card-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .card-cost {
      background: #f1c40f;
      color: #000;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9rem;
    }
    
    .card-name {
      font-weight: 600;
      font-size: 1rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .card-toggles {
    display: flex;
    background: #1e293b;
    border-radius: 0.4rem;
    overflow: hidden;

    .toggle-btn {
      flex: 1;
      padding: 0.4rem 0;
      border: none;
      background: transparent;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      &:last-child { border-right: none; }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
      }

      &.active {
        color: white;
        &.use { background: #166534; }
        &.candidate { background: #3b82f6; }
        &.exclude { background: #991b1b; }
      }
    }
  }
}

.modal-actions {
  padding: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  button {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: bold;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .btn-cancel {
    background: transparent;
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &:hover { background: rgba(255, 255, 255, 0.1); color: white; }
  }

  .btn-default {
    background: #94a3b8;
    color: #1a1a2e;
    border: none;
    
    &:hover:not(:disabled) {
      background: #64748b;
      transform: translateY(-2px);
    }
  }

  .btn-save {
    background: #f1c40f;
    color: #1a1a2e;
    border: none;
    
    &:hover:not(:disabled) {
      background: #f39c12;
      transform: translateY(-2px);
    }

    &:disabled {
      background: #475569;
      color: #94a3b8;
      cursor: not-allowed;
    }
  }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-bar {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .modal-content {
    height: 95vh;
  }
}
</style>
