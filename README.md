# 習慣トラッカー
自分のペースで続けたい習慣を管理する、日本語・モバイルファーストのWebアプリです。

公開URL： https://kenjiitoh-max.github.io/habit-tracker/

## デモモード

https://kenjiitoh-max.github.io/habit-tracker/?demo=1

URLに `?demo=1` を付けると、今日（日本時間）までの60日間の架空データを体験できます。4つの習慣と、期間途中から始めた習慣を含みます。同じ日なら毎回同じサンプルで、日付が変わると期間が移動します。
デモ中は実際のlocalStorageデータを読み書きしません。追加・編集・削除・チェックはメモリ内だけで動作し、再読み込みでリセットされます。「デモを終了して通常モードへ」から元のデータに戻れます。
記録／グラフの切り替えやオフライン利用でもデモを維持します。ホーム画面からの起動URLは通常モードのままです。

## ホーム画面に追加・オフライン利用

- iPhone：Safariで公開URLを開き、共有 →「ホーム画面に追加」を選びます。
- Android：Chromeで公開URLを開き、メニュー →「ホーム画面に追加」または「アプリをインストール」を選びます。
- 初回はオンラインで開いてください。読み込み完了後は、オフラインでも習慣の記録・閲覧ができます。
- アプリ本体はオンライン時に自動更新されます。データは引き続き端末内だけに保存されます。iPhoneではSafariとホーム画面アプリで保存領域が異なる場合があります。

## GitHub Pagesへの公開

リポジトリの **Settings → Pages → Build and deployment → Source** を、初回のみ **GitHub Actions** に設定してください。
`main` へのpush、またはActionsの「Deploy to GitHub Pages」→「Run workflow」で、Node.js 24によるビルドと公開を実行します。
ワークフローを手動実行する場合も、公開対象のブランチは `main` を選んでください。
このPRをpushしただけでは公開されません。

ローカルでPWAの本番動作を確認する場合：

```sh
npm run build
npx vite preview
# http://localhost:4173/habit-tracker/ を開く
```

開発サーバーではService Workerは登録されません。PWAにはHTTPS（ローカル検証ではlocalhost）が必要です。

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
- 「今日やった」をタップして今日の記録を切り替え。もう一度タップすると今日の記録（数値を含む）を削除します。
- 今日の数値は任意（0以上・小数可）。入力欄から移動、またはEnterで自動保存し、達成済みになります。数値だけ消しても達成は維持します。
- 連続日数は日本時間の今日までの達成日数。今日が未達成なら昨日までを表示し、朝にリセットされません。
- 「グラフ」で週間（直近7日）・月間（直近30日）の達成率を確認できます。どちらも今日を含む日本時間で集計します。日別は達成した習慣数÷その日に存在した習慣数、習慣別は期間内の作成日以降の達成日数÷対象日数です。対象がない場合は「—」表示。削除した習慣は集計対象外です。
- 「体の記録」タブで体重（kg）・体脂肪率（%）を日付ごとに記録・修正・削除できます。測った日だけ、片方だけでも保存できます。習慣とは別に保存し（`habit-tracker:body:v1`）、連続日数・達成率・通常の記録画面には含めません。デモでは架空の測定値だけを表示します。

ログインやサーバーへの送信はありません。データは使用中のブラウザのlocalStorageに保存されます。別端末とは同期されず、ブラウザのデータを消すと失われます。

## テスト実行方法

```sh
npm ci
npm test -- --run       # Vitest（ユニット・コンポーネント）
npx playwright install --with-deps chromium # 初回のブラウザ・OS依存関係準備
npm run build
npm run test:e2e        # 本番ビルドをvite previewで起動して検証
npx playwright show-report # HTMLレポートを確認
```

E2EはChromiumのPixel 7プロファイル・日本時間で実行します。習慣の追加／編集／削除確認、数値・チェックの再読み込み、ストリーク、週間／月間グラフ、デモの実データ分離を検証します。
米国ロサンゼルス時間の専用テストでは、JST午前0時の日付・記録の切り替わりも確認します。テストごとにブラウザの保存領域を分離するため、普段のChromeのデータには触れません。
E2E実行前にポート4173を空けてください。既存サーバーの流用はせず、`http://localhost:4173/habit-tracker/` で本番previewを自動起動・終了します。アプリを変更したら再度buildしてください。

### CI

全ブランチ向けの `pull_request`（積み上げPRを含む）と `main` へのpushで、Node.js 24上でlint・型チェック・Vitest・build・Playwrightを実行します。同じrefの古い実行はキャンセルします。
失敗時はActionsのArtifactsから `playwright-report` を取得できます（HTMLレポート・スクリーンショット・トレース、7日間保持）。Pagesへの公開は別のDeployワークフローです。

### QA用data-testid

- ナビゲーション：`nav-record`, `nav-stats`, `today-date`
- 習慣：`habit-list`, `habit-item`, `add-habit-button`, `habit-name-input`, `habit-unit-input`, `save-habit-button`, `edit-habit-button`, `delete-habit-button`, `confirm-delete-button`
- 記録：`checkin-toggle`, `checkin-value-input`, `streak-count`
- グラフ：`stats-view`, `stats-period-week`, `stats-period-month`, `stats-chart`, `habit-rate`
- デモ：`demo-banner`

`habit-item` 内のtestidは各カードに繰り返し存在します。カードを選んでからその中の要素を操作してください。

## 構成

- `src/App.tsx`：習慣一覧と追加・編集・削除画面
- `src/lib/date.ts`：日本時間の日付キーと日付加算
- `src/lib/types.ts`：習慣・記録の型
- `src/lib/storage.ts`：唯一の永続化窓口。非同期 `HabitRepository` と `getRepository()` により将来の実装差し替えに対応

Vite + React + TypeScript、Vitest、ESLintを使用。公開パスは `/habit-tracker/` です。
