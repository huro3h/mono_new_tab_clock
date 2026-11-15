function pad(n) {
  return String(n).padStart(2, "0");
}

const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday"
];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function render() {
  const now = new Date();

  // 24時間表記（時:分）。コロンはCSSで描くので時・分だけ更新
  document.getElementById("hours").textContent = pad(now.getHours());
  document.getElementById("minutes").textContent = pad(now.getMinutes());

  // 例: Tuesday, July 14
  const weekday = WEEKDAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const day = now.getDate();
  document.getElementById("date").textContent = `${weekday}, ${month} ${day}`;
}

render();                  // 初回即描画（1秒待たせない）
setInterval(render, 1000); // 毎秒更新

// ================= 設定（背景・透明度） =================
const KEYS = { bg: "bgLevel", opacity: "opacity" };
const DEFAULTS = { bg: 23, opacity: 10 };

const clock = document.getElementById("clock");
const bgSlider = document.getElementById("bg-slider");
const opacitySlider = document.getElementById("opacity-slider");
const resetBtn = document.getElementById("reset-btn");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");
const exportDir = document.getElementById("export-dir");
const exportName = document.getElementById("export-name");
const exportStatus = document.getElementById("export-status");
const exportChange = document.getElementById("export-change");
const gearBtn = document.getElementById("gear-btn");
const controls = document.getElementById("controls");

// ---- 設定パネルの開閉 ----
function toggleSettings() {
  const open = controls.hasAttribute("hidden");
  if (open) {
    controls.removeAttribute("hidden");
  } else {
    controls.setAttribute("hidden", "");
  }
  document.body.classList.toggle("settings-open", open);
  gearBtn.setAttribute("aria-expanded", String(open));
}

// 歯車アイコンのクリックで開閉
gearBtn.addEventListener("click", toggleSettings);

// キーボードショートカット（chrome://extensions/shortcuts で設定）で開閉。
// background.js からのメッセージを受け取り、フォーカス中のタブだけ反応する。
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "toggle-settings" && document.hasFocus()) {
      toggleSettings();
    }
  });
}

// ---- 背景の明るさ ----
function applyBackground(level) {
  // 0 = 暗いグレー(#1a1a1a) 〜 100 = 明るいグレー(#8c8c8c)
  const gray = Math.round(26 + (level / 100) * (140 - 26));
  document.body.style.background = `rgb(${gray}, ${gray}, ${gray})`;
}

const savedBg = localStorage.getItem(KEYS.bg);
const bgLevel = savedBg !== null ? Number(savedBg) : DEFAULTS.bg;
bgSlider.value = bgLevel;
applyBackground(bgLevel);

bgSlider.addEventListener("input", () => {
  applyBackground(Number(bgSlider.value));
  localStorage.setItem(KEYS.bg, bgSlider.value);
});

// ---- 文字の透明度（濃さ）----
function applyOpacity(level) {
  clock.style.opacity = level / 100; // 20〜100 → 0.2〜1.0
}

const savedOpacity = localStorage.getItem(KEYS.opacity);
const opacityLevel = savedOpacity !== null ? Number(savedOpacity) : DEFAULTS.opacity;
opacitySlider.value = opacityLevel;
applyOpacity(opacityLevel);

opacitySlider.addEventListener("input", () => {
  applyOpacity(Number(opacitySlider.value));
  localStorage.setItem(KEYS.opacity, opacitySlider.value);
});

// ---- デフォルトに戻す ----
resetBtn.addEventListener("click", () => {
  // 保存値を消去
  localStorage.removeItem(KEYS.bg);
  localStorage.removeItem(KEYS.opacity);

  // 表示・スライダーをデフォルトへ
  bgSlider.value = DEFAULTS.bg;
  applyBackground(DEFAULTS.bg);

  opacitySlider.value = DEFAULTS.opacity;
  applyOpacity(DEFAULTS.opacity);
});

// ================= 設定の Export / Import =================
// 現在の設定をまとめて取得
function getCurrentSettings() {
  return {
    bg: Number(bgSlider.value),
    opacity: Number(opacitySlider.value)
  };
}

// 設定オブジェクトを画面へ反映＆保存（未指定の項目はデフォルトで補完）
function applySettings(s) {
  const bg = Number.isFinite(Number(s.bg)) ? Number(s.bg) : DEFAULTS.bg;
  const opacity = Number.isFinite(Number(s.opacity)) ? Number(s.opacity) : DEFAULTS.opacity;

  bgSlider.value = bg;
  applyBackground(bg);
  localStorage.setItem(KEYS.bg, bg);

  opacitySlider.value = opacity;
  applyOpacity(opacity);
  localStorage.setItem(KEYS.opacity, opacity);
}

// ---- Export：選んだフォルダの、欄で決めたファイル名のファイルに上書き（export-file.js） ----
// 拡張機能から見えるのはフォルダ名だけ（フルパスは分からない）
async function showExportTarget() {
  exportName.value = await ExportFile.loadFileName();
  if (!ExportFile.canPickFolder) {
    exportDir.textContent = "Downloads";
    exportChange.hidden = true;
    return;
  }
  const dir = await ExportFile.loadExportDir();
  exportDir.textContent = dir ? dir.name : "(folder)";
}

async function exportSettings(chooseDir) {
  // 欄を書き換えたままボタンを押したときも、その名前で書き出す
  try {
    exportName.value = await ExportFile.saveFileName(exportName.value);
  } catch (e) {
    exportStatus.textContent = e.message;
    return;
  }
  // git の差分にならないよう、書き出した時刻は入れず末尾に改行を付ける
  const text = `${JSON.stringify(getCurrentSettings(), null, 2)}\n`;
  let result;
  try {
    result = await ExportFile.exportToFile(text, { chooseDir });
  } catch (e) {
    exportStatus.textContent = "Could not export. Use Change folder to pick it again.";
    return;
  }
  if (!result) return; // ダイアログを閉じた
  await showExportTarget();
  exportStatus.textContent = `Exported to ${result.path}`;
}

// ファイル名は欄から離れたとき・Enter で覚える。使えない名前なら覚えている名前に戻す
exportName.addEventListener("change", async () => {
  try {
    exportName.value = await ExportFile.saveFileName(exportName.value);
    exportStatus.textContent = "";
  } catch (e) {
    exportStatus.textContent = e.message;
    exportName.value = await ExportFile.loadFileName();
  }
});
exportName.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) exportName.blur();
});

exportBtn.addEventListener("click", () => exportSettings(false));
exportChange.addEventListener("click", () => exportSettings(true));
showExportTarget();

// ---- Import：JSONファイルを読み込んで反映 ----
importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      applySettings(parsed);
    } catch (e) {
      alert("設定ファイルを読み込めませんでした（JSONの形式を確認してください）。");
    }
    importFile.value = ""; // 同じファイルを続けて選べるようにリセット
  };
  reader.readAsText(file);
});
