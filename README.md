# Mono New Tab Clock

新しいタブを、ミニマルでモノクロ（グレースケール）の時計に置き換える Chrome 拡張機能です。
既存の新規タブ時計系拡張からインスピレーションを得つつゼロから自作したもので、`Mono` の名は
色を持たないグレースケールデザインに由来します。**ビルド不要・フレームワーク不使用・依存ゼロ**
の素の HTML / CSS / JS でできています。

<img height="300" alt="image-1784152233649" src="https://github.com/user-attachments/assets/37d9f643-75bf-4b42-9cce-e1bf200b9397" />


## 特徴

- **時刻**: 24 時間表記の `HH:MM`（秒なし）。毎秒更新するので分の切り替わりが即座に反映されます。
- **日付**: `Tuesday, July 14` のような英語表記。
- **コロン**: フォントの文字ではなく CSS の真円 2 つで描画。どのフォントでも丸く表示され、
  サイズ・透明度に自動追従します。
- **設定パネル**: 既定では非表示。左下の歯車アイコン、またはキーボードショートカットで開閉します。
- **カスタマイズ**（すべて `localStorage` に保存）:
  - **Background**: 背景の明るさ（グレースケール）
  - **Size**: 文字サイズ
  - **Opacity**: 時計の透明度
  - **Font**: System / Montserrat / Josefin Sans / Roboto
  - **位置**: 時計をドラッグして移動（ビューポート比率で保存され、リサイズしてもずれにくい）
  - **Reset / Export / Import**: 既定値へのリセット、設定の JSON 書き出し・読み込み
- **オフライン動作**: フォントは `.ttf` を同梱し `@font-face` で読み込むため、外部 CDN への
  通信は一切ありません（プライバシー配慮）。
- **権限リクエストなし**: すべてローカルで完結します。

## ディレクトリ構成

```
mono_new_tab_clock/
├── manifest.json      # MV3。chrome_url_overrides.newtab -> newtab.html、commands + background
├── newtab.html        # マークアップ（時計 + 歯車ボタン + 設定パネル）
├── newtab.css         # スタイル一式
├── newtab.js          # 時計描画 + 設定ロジック（localStorage）
├── background.js      # service worker（ショートカット命令を newtab へメッセージ送信）
└── fonts/             # 同梱フォント（オフライン、通信なし）
    ├── Montserrat.ttf
    ├── JosefinSans.ttf
    └── Roboto.ttf
```

## 仕組み（アーキテクチャ）

- `manifest.json` の `chrome_url_overrides.newtab` を `newtab.html` に設定し、新しいタブで
  本ページを表示します。
- `newtab.js` はページ読み込み時に動作し、`setInterval` で毎秒 `render()` を呼んで時刻を更新。
  設定は `localStorage` から読み込み・適用し、変更時に再保存します。
- MV3 の CSP はインラインスクリプト/ハンドラを禁止するため、JS はすべて外部ファイル
  (`newtab.js`) に置いています。
- **キーボードショートカット**: `manifest.json` の `commands` で `toggle-settings` を定義
  （競合回避のため既定キーは未割り当て。ユーザーが `chrome://extensions/shortcuts` で設定）。
  命令は `background.js`（service worker）で発火し、`chrome.runtime.sendMessage` で
  `newtab.js` に届き、フォーカス中のタブだけが設定パネルを開閉します。

## インストール / 動作確認

1. Chrome で `chrome://extensions` を開く
2. 右上の **デベロッパーモード** を有効化
3. **「パッケージ化されていない拡張機能を読み込む」** をクリックし、本フォルダを選択
4. 新しいタブを開いて動作を確認

編集後は `chrome://extensions` の **リロード** ボタンを押してから新しいタブを開き直してください。
ビルド / lint / テストのツールはありません（静的ファイルのみ）。

## 設定の移行

設定は `localStorage` に保存されるため、ブラウザのプロファイル単位で保持されます。
別のマシンへ移す場合は、設定パネルの **Export** で JSON を書き出し、移行先で **Import** します。

## 開発メモ

- インライン `<script>` / `onclick` は使わない（MV3 CSP がブロックします）。
- フォントを追加する場合は、可変 `.ttf` を `fonts/` に置き、`newtab.css` に `@font-face` を
  追加し、`<select>` に `<option>` を足します。
- 設定項目（スライダー等）を追加する場合は、newtab.js の `KEYS` / `DEFAULTS` / `applyX()` /
  reset ハンドラ / `getCurrentSettings()` / `applySettings()` をすべて更新して、保存・リセット・
  Export/Import の整合を保ってください。
