# ドミニオン 実装計画書

## 1. 目的
「ドミニオン」の基本セットをブラウザ上でプレイ可能にする。
クリーンなアーキテクチャを採用し、将来的な拡張セット（陰謀、海辺等）の追加を容易にする。

## 2. 技術スタック
- **Frontend**: Vue.js (Existing project stack)
- **Language**: TypeScript
- **Styling**: Vanilla CSS

## 3. 基本ロジックの設計

### カードクラス (`Card`)
全てのカードの基底クラス。
- `id`: 一意の識別子
- `name`: 表示名
- `cost`: コスト
- `type`: `TREASURE`, `VICTORY`, `ACTION`, `REACTION`, `CURSE`
- `onPlay()`: 使用時の効果
- `onBuy()`: 購入時の効果

### プレイヤークラス (`Player`)
- `hand`: 手札
- `deck`: 山札
- `discard`: 捨て札
- `actions`: 残りアクション数
- `buys`: 残り購入数
- `coins`: 現在のコイン数
- モッドール（捨て札をシャッフルして山札に戻す処理など）

### ゲーム管理 (`DominionEngine`)
- フェーズ管理（Action Phase, Buy Phase, Clean-up Phase）
- サプライの初期化
- 勝利条件の判定

## 4. UI設計
- リポジトリの `AGENT.md` に基づき、モバイルや小さいウィンドウでも操作しやすいUI。
- カードはグリッド表示。
- ログは画面端にコンパクトに。

## 5. 開発フェーズ

### Step 1: Data Model & Basic Mechanics
- 基本カード 7種とシンプルな王国カード 2〜3種の実装。
- ターンの進行ロジック。

### Step 2: UI Implementation
- サプライと手札の表示。
- クリックによるカード使用・購入。

### Step 3: Full Basic Set
- 残りの王国カード 7〜8種の実装。
- 勝利判定。
