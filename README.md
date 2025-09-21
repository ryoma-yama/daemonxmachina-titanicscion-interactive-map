# daemonxmachina-titanicscion-interactive-map

## 概要
Daemon X Machina: Titanic Scion に登場する複数のマップを対象とし、マップ上に散らばる収集要素（例: dungeon, log, card）の場所をブラウザ上で管理する。  
ユーザーはマーカーをクリックして収集済みフラグを切り替えられ、その状態はブラウザの `localStorage` に保存される。

## 技術スタック
- JavaScriptライブラリ: [Leaflet](https://leafletjs.com/reference.html)
  - ReactやVueのようなフレームワークではなく、地図表示専用の軽量ライブラリ
  - 単体で利用可能
  - 実装にあたっては公式ドキュメントを必ず参照し、正確なAPI利用を行うこと
- 保存先: localStorage
- 表示形式: HTML

## ベースマップ
- ゲーム内マップのスクリーンショットをトリミング・結合して1枚の完成画像にする
- 画像サイズ（縦横ピクセル数）をLeafletに渡し、`L.CRS.Simple` 座標系で利用する
- 複数マップがある場合は1ページ内で切替式とする
  - セレクトボックスなどで選択
  - imageOverlayとマーカー群を切替
  - localStorageは `map:{mapId}` 形式で分離保存

## 座標系
- 現実世界の緯度経度は不要
- 画像のピクセル座標をそのまま利用（`L.CRS.Simple`）
- `bounds = [[0,0], [画像高さ, 画像幅]]` として設定

## マーカー仕様
- JSONで定義
  - id: 一意なID
  - name: 表示名
  - x, y: ピクセル座標
  - category: 種別（dungeon, log, cardなど）
- LeafletのマーカーまたはcircleMarkerとして表示
- ポップアップ内にチェックボックスを設置し、収集済みフラグを切替可能

## 進捗保存
- localStorageを使用
- マーカーごとの収集状態を `{ id: true/false }` 形式で保存
- マップIDごとにキーを分けて保存（例: `collect-map:v1:{mapId}`）

## 規模と性能
- マーカー数は少量を想定
- クラスタリングや仮想化は不要
- 1枚画像または数枚の切替で対応可能

## 必須機能一覧
1. 地図画像を表示（Leaflet imageOverlay）
2. マーカーを配置し、名前や説明をポップアップに表示
3. ポップアップ内で「収集済み」チェックボックスを切替
4. localStorageに収集状態を保存・復元
5. 複数マップがある場合、プルダウンで切替

## 今後の拡張（任意）
- マーカーのカテゴリ別フィルタ
- 未収集のみ表示モード
- 収集状況のJSONエクスポート／インポート
- 個別マーカーへの直リンク
- モバイルUI最適化
