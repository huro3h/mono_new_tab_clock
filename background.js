// キーボードショートカット（chrome://extensions/shortcuts で設定）を受け取り、
// 開いている新規タブページへ「設定パネルを開閉して」というメッセージを送る。
chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-settings") return;
  // 拡張内の全ページ（＝新規タブページ）へブロードキャスト。
  // 受信側(newtab.js)がフォーカス中のタブだけ反応する。
  chrome.runtime.sendMessage({ type: "toggle-settings" }).catch(() => {
    // 受信ページが無い（新規タブを開いていない）場合はエラーになるので握りつぶす
  });
});
