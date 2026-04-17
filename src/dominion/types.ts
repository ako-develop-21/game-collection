export type CardType = 'Treasure' | 'Victory' | 'Action' | 'Reaction' | 'Attack' | 'Curse'

export type PromptType = 'discard' | 'trash' | 'gain' | 'reorder' | 'sentry' | 'choice' | null

export interface ActionPrompt {
  type: PromptType
  targetPlayerIndex: number // 誰が応答すべきか
  min: number
  max: number
  message: string
  revealedCards?: Card[]
  source?: 'hand' | 'discard' | 'deck' | 'revealed'
  options?: string[]
  allowedCost?: number
  allowedPotion?: number
  allowedTypes?: CardType[]
  exactCost?: boolean
  maxChoices?: number
  cardId?: string // From which card this prompt originated
  onConfirm: (result: any) => void
  onCancel?: () => void
  supplySelection?: boolean // Whether this prompt should highlight the supply for selection
}

export interface ActionHelpers {
  drawCards: (playerIndex: number, count: number) => void
  addLog: (message: string) => void
  shuffle: (array: any[]) => void
  trashCard: (playerIndex: number, cardIndex: number) => void
  setPrompt: (prompt: ActionPrompt) => void
  clearPrompt: () => void
  discardSelected: (playerIndex: number, cardIndices: number[]) => void
  revealCards: (playerIndex: number, count: number) => Card[]
  gainCard: (playerIndex: number, cardId: string, destination?: 'discard' | 'hand' | 'deck') => void
  getCard: (cardId: string) => Card | undefined
  getCardTreasure: (cardId: string, playerIndex: number) => number
  getPrompt: () => ActionPrompt | null
  checkActionPhase: () => void
  processAttack?: (attackCardId: string, victimAction: (victimIdx: number) => void) => void
  processAllPlayers: (action: (idx: number, next: () => void) => void, onComplete?: () => void) => void
  getCardCost: (cardId: string, playerIndex: number) => number
  endTurn: () => void
  calculateTotalPoints: (playerIndex: number) => number
}

export interface CardEffects {
  draw?: number;       // +カード
  action?: number;     // +アクション
  buy?: number;        // +購入
  coin?: number;       // +コイン
  vpTokens?: number;   // +勝利点トークン
  isAttack?: boolean;  // アタック効果
  isDefense?: boolean; // 防御効果
  isTrash?: boolean;   // 廃棄効果
}

export interface Card {
  id: string
  name: string
  jpName: string
  type: CardType[]
  cost: number
  costPotion?: number
  treasure?: number | ((state: GameState, playerIndex: number) => number)
  potionValue?: number
  points?: number | ((state: GameState, playerIndex: number) => number)
  action?: (state: GameState, playerIndex: number, helpers: ActionHelpers) => void
  effects?: CardEffects
  description: string
  ai?: {
    getValue?: (state: GameState, playerIndex: number) => number | null;
    getChoicePriorities?: (state: GameState, playerIndex: number) => string[];
    getDiscardTrashIndices?: (state: GameState, playerIndex: number, prompt: any) => number[];
    shouldReact?: (state: GameState, playerIndex: number, attackCardId: string) => boolean;
  }
  onAttackReaction?: (state: GameState, victimIndex: number, helpers: ActionHelpers) => void;
  onPlay?: (state: GameState, playerIndex: number, helpers: ActionHelpers) => void
  onBuy?: (state: GameState, playerIndex: number, helpers: ActionHelpers, cardItem: Card, cardIndex: number) => boolean | void;
  onCleanup?: (state: GameState, playerIndex: number, helpers: ActionHelpers, cardItem: Card, cardIndex: number) => boolean | void;
}

/** AI思考パターン */
export type AIPersona = 'Attack' | 'Combo' | 'BigMoney' | 'Compression' | 'Balance'

export interface PlayerState {
  id: number
  name: string
  hand: Card[]
  deck: Card[]
  discard: Card[]
  boughtCards: Card[]
  actions: number
  buys: number
  coins: number
  potions: number
  vpTokens: number
  totalPoints: number
  inPlay: Card[]
  turnFlags?: Record<string, any>
  persona: AIPersona
}

export interface GameState {
  players: PlayerState[]
  currentPlayerIndex: number
  phase: 'Action' | 'Buy' | 'Cleanup'
  supply: Record<string, number>
  trash: Card[]
  log: string[]
  turnCount: number
}
