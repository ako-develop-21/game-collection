# AI思考ルーチン高度化 実装計画書

AIの思考ロジックをスケールさせ、かつメンテナンス性を高めるための実装計画です。

## 1. 基本方針

- **Strategyパターンの採用**: 各カードの定義にAIロジックを逃がし、エンジン側（`useDominion.ts`）の条件分岐肥大化を防ぐ。
- **共通推論ロジックの共通化**: 「現在はどのフェーズか？」「リソースが不足しているか？」といった頻出する判断基準をヘルパー関数化する。
- **メタデータ主導の意思決定**: 特定のカードID（`province`など）に依存せず、カードの属性（`points`, `treasure`など）に基づいて判断し、将来的なカード追加に対応する。

## 2. 共通思考ヘルパー (`AIHelpers`)

`useDominion.ts` に以下の共通判断関数を実装する。

```typescript
const isEarlyGame = (state: GameState) => state.supply['province'] > 6;
const isMidGame = (state: GameState) => state.supply['province'] > 2 && state.supply['province'] <= 6;
const isLateGame = (state: GameState) => state.supply['province'] <= 2;

const needsActions = (state: GameState, playerIndex: number) => {
  const player = state.players[playerIndex];
  const terminalActions = player.hand.filter(c => c.type.includes('Action') && !c.effects?.action).length;
  const actionGivers = player.hand.filter(c => (c.effects?.action || 0) >= 1).length;
  return terminalActions > actionGivers;
};
```

## 3. カードメタデータによる汎用選択

購入や獲得の際、IDではなくプロパティで優先順位を付ける。

- **勝利点獲得**: `targetCards.sort((a, b) => b.points - a.points)` (属州・植民地などに対応)
- **財宝獲得**: `targetCards.sort((a, b) => b.treasure - a.treasure)` (金貨・白金貨などに対応)
- **廃棄判断**: `getAICardValueInHand(card)` において、勝利点カードは序盤は一律低価値(0)、終盤は一律高価値(100+)とする。

## 4. `ActionPrompt` への拡張

プロンプト発行時に `cardId` を付与し、AIが「どのカードに対して応答しているか」を特定可能にする。

```typescript
export interface ActionPrompt {
  type: PromptType;
  cardId?: string; // プロンプトの発生源となったカードID
  // ...
}
```

## 5. カード定義へのAI戦略の統合

各カードの定義内に、AI用の重み付け・優先度関数を記述する。

```typescript
pawn: {
  id: 'pawn',
  // ...
  ai: {
    getChoicePriorities: (state, playerIndex) => {
      // メタデータに基づいた判断
      if (needsActions(state, playerIndex)) return ['+1 アクション', '+1 カード'];
      return ['+1 カード', '+1 コイン'];
    }
  }
}
```

## 6. 実装フェーズ

作業の肥大化とエラーを防ぐため、以下の4フェーズに分けて実装を進めます。

### フェーズ1：共通AIヘルパーの整備（完了）
- [x] 判断用グローバル定数・関数の定義（`isEarlyGame`, `needsActions`, `getAICardValueInHand` 等）
- [x] `useDominion.ts` のトップレベルへの配置（循環参照の回避）

### フェーズ2：プロンプトハンドラの汎用化（完了）
- [x] `ActionPrompt` インタフェースへの `cardId` 追加
- [x] `watch(currentPrompt)` の拡張：`reorder`, `gain`, `choice` タイプの汎用処理実装
- [x] `card.ai.getChoicePriorities` がある場合の委譲ロジック実装

### フェーズ3：各カードへのAI戦略実装（完了）
- [x] **フェーズ3-A（選択系）**: `廷臣`, `寵臣`, `図書室`, `貴族`, `執事`, `手先`, `男爵`, `拷問人`, `玉座の間`
- [x] **フェーズ3-B（廃棄・獲得系）**: `製粉所`, `改築`, `改良`, `鉱山`, `工房`, `職人`, `礼拝堂`, `密猟者`, `交易場`
- [x] **フェーズ3-C（山札操作・その他）**: `パトロール`, `先駆者`, `役人`, `家臣`
- [x] 全プロンプト発行箇所への `cardId` 付与とレガシー `if (AI)` の撤去

### フェーズ4：クリーンアップと最適化（完了）
- [x] カード定義内のハードコードされた `if (AI)` ブロックの削除
- [x] `getAIPurchaseWeight`（購入重み）のメタデータ主導化
- [x] 未使用変数の削除などのリファクタリング

---

> [!IMPORTANT]
> この構成により、エンジン側は「もしカードにAI戦略が定義されていればそれを実行し、なければ汎用メタデータロジック（価値の低い順に捨てる等）を実行する」という極めてシンプルな実装に留めることができる。
