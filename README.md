# 習慣トラッカー
自分のペースで続けたい習慣を管理する、日本語・モバイルファーストのWebアプリです。

## ローカルで動かす

Node.js 22.12以上（推奨：Node.js 24 LTS）とnpmを使用します。

```sh
npm ci
npm run dev
```

表示されたURLの `/habit-tracker/` を開いてください。

```sh
npm test -- --run  # ユニット・UIテスト
npm run lint      # ESLint
npm run typecheck # TypeScript型チェック
npm run build     # dist/ に静的サイトを出力
```

## 現在の機能

- 習慣の追加・編集（名前、任意の単位）・確認付き削除
- 初回は「筋トレ（回）」「英語トレーニング（分）」を作成。すべて削除した後は再作成しません。
- 日本時間（Asia/Tokyo）での日付表示

ログインやサーバーへの送信はありません。データは使用中のブラウザのlocalStorageに保存されます。別端末とは同期されず、ブラウザのデータを消すと失われます。

## 構成

- `src/App.tsx`：習慣一覧と追加・編集・削除画面
- `src/lib/date.ts`：日本時間の日付キーと日付加算
- `src/lib/types.ts`：習慣・記録の型
- `src/lib/storage.ts`：唯一の永続化窓口。非同期 `HabitRepository` と `getRepository()` により将来の実装差し替えに対応

Vite + React + TypeScript、Vitest、ESLintを使用。公開パスは `/habit-tracker/` です。
チェックイン・連続日数・グラフ・PWA・デモモード・デプロイ・E2E/CIは今後追加予定です。
