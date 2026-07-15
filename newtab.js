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

// ================= 設定（背景・文字サイズ・位置） =================
const KEYS = { bg: "bgLevel", size: "sizeLevel", pos: "clockPos", font: "font", opacity: "opacity" };
const DEFAULTS = { bg: 23, size: 150, pos: { x: 50, y: 50 }, font: "system", opacity: 10 };
const SYSTEM_STACK = '-apple-system, "Helvetica Neue", Arial, sans-serif';

const clock = document.getElementById("clock");
const bgSlider = document.getElementById("bg-slider");
const sizeSlider = document.getElementById("size-slider");
const opacitySlider = document.getElementById("opacity-slider");
const fontSelect = document.getElementById("font-select");
const resetBtn = document.getElementById("reset-btn");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");
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

// ---- 文字の大きさ ----
function applySize(level) {
  // level(50〜200) を倍率(0.5〜2.0)に変換
  clock.style.setProperty("--scale", level / 100);
}

const savedSize = localStorage.getItem(KEYS.size);
const sizeLevel = savedSize !== null ? Number(savedSize) : DEFAULTS.size;
sizeSlider.value = sizeLevel;
applySize(sizeLevel);

sizeSlider.addEventListener("input", () => {
  applySize(Number(sizeSlider.value));
  localStorage.setItem(KEYS.size, sizeSlider.value);
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

// ---- 書体（フォント）----
function applyFont(name) {
  clock.style.fontFamily =
    name === "system" ? SYSTEM_STACK : `"${name}", ${SYSTEM_STACK}`;
}

const savedFont = localStorage.getItem(KEYS.font);
const font = savedFont !== null ? savedFont : DEFAULTS.font;
fontSelect.value = font;
applyFont(font);

fontSelect.addEventListener("change", () => {
  applyFont(fontSelect.value);
  localStorage.setItem(KEYS.font, fontSelect.value);
});

// ---- 表示位置（ドラッグ＆ドロップ）----
// 位置は画面サイズに対する割合(%)で保存 → ウィンドウサイズが変わってもズレにくい
function applyPosition(xPercent, yPercent) {
  clock.style.left = `${xPercent}%`;
  clock.style.top = `${yPercent}%`;
}

// 起動時に必ず位置を確定させる（保存値が無ければデフォルト中央）。
// これでインラインスタイルが常にセットされ、Export時に値がnullにならない。
let initialPos = { ...DEFAULTS.pos };
const savedPos = localStorage.getItem(KEYS.pos);
if (savedPos) {
  try {
    const { x, y } = JSON.parse(savedPos);
    if (Number.isFinite(x) && Number.isFinite(y)) initialPos = { x, y };
  } catch (e) {
    /* 壊れた値は無視してデフォルト中央 */
  }
}
applyPosition(initialPos.x, initialPos.y);

let dragging = false;

clock.addEventListener("mousedown", (e) => {
  dragging = true;
  clock.classList.add("dragging");
  e.preventDefault(); // テキスト選択を防止
});

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const clamp = (v) => Math.min(100, Math.max(0, v));
  const xPercent = clamp((e.clientX / window.innerWidth) * 100);
  const yPercent = clamp((e.clientY / window.innerHeight) * 100);
  applyPosition(xPercent, yPercent);
});

window.addEventListener("mouseup", () => {
  if (!dragging) return;
  dragging = false;
  clock.classList.remove("dragging");
  // 現在位置(%)を保存
  const x = parseFloat(clock.style.left);
  const y = parseFloat(clock.style.top);
  localStorage.setItem(KEYS.pos, JSON.stringify({ x, y }));
});

// ---- デフォルトに戻す ----
resetBtn.addEventListener("click", () => {
  // 保存値を消去
  localStorage.removeItem(KEYS.bg);
  localStorage.removeItem(KEYS.size);
  localStorage.removeItem(KEYS.pos);
  localStorage.removeItem(KEYS.font);
  localStorage.removeItem(KEYS.opacity);

  // 表示・スライダーをデフォルトへ
  bgSlider.value = DEFAULTS.bg;
  applyBackground(DEFAULTS.bg);

  sizeSlider.value = DEFAULTS.size;
  applySize(DEFAULTS.size);

  opacitySlider.value = DEFAULTS.opacity;
  applyOpacity(DEFAULTS.opacity);

  fontSelect.value = DEFAULTS.font;
  applyFont(DEFAULTS.font);

  applyPosition(DEFAULTS.pos.x, DEFAULTS.pos.y);
});

// ================= 設定の Export / Import =================
// 現在の設定をまとめて取得
function getCurrentSettings() {
  return {
    bg: Number(bgSlider.value),
    size: Number(sizeSlider.value),
    opacity: Number(opacitySlider.value),
    font: fontSelect.value,
    pos: {
      // インラインスタイルが未設定でも NaN→null にならないようデフォルトで補完
      x: Number.isFinite(parseFloat(clock.style.left)) ? parseFloat(clock.style.left) : DEFAULTS.pos.x,
      y: Number.isFinite(parseFloat(clock.style.top)) ? parseFloat(clock.style.top) : DEFAULTS.pos.y
    }
  };
}

// 設定オブジェクトを画面へ反映＆保存（未指定の項目はデフォルトで補完）
function applySettings(s) {
  const bg = Number.isFinite(Number(s.bg)) ? Number(s.bg) : DEFAULTS.bg;
  const size = Number.isFinite(Number(s.size)) ? Number(s.size) : DEFAULTS.size;
  const opacity = Number.isFinite(Number(s.opacity)) ? Number(s.opacity) : DEFAULTS.opacity;
  const font = typeof s.font === "string" ? s.font : DEFAULTS.font;
  // s.pos.x/y が null の場合、Number(null)===0 で isFinite を誤って通過するため
  // 明示的に null/undefined を弾いてからチェックする
  const pos = (s.pos &&
    s.pos.x != null && Number.isFinite(Number(s.pos.x)) &&
    s.pos.y != null && Number.isFinite(Number(s.pos.y)))
    ? { x: Number(s.pos.x), y: Number(s.pos.y) }
    : DEFAULTS.pos;

  bgSlider.value = bg;
  applyBackground(bg);
  localStorage.setItem(KEYS.bg, bg);

  sizeSlider.value = size;
  applySize(size);
  localStorage.setItem(KEYS.size, size);

  opacitySlider.value = opacity;
  applyOpacity(opacity);
  localStorage.setItem(KEYS.opacity, opacity);

  fontSelect.value = font;
  applyFont(font);
  localStorage.setItem(KEYS.font, font);

  applyPosition(pos.x, pos.y);
  localStorage.setItem(KEYS.pos, JSON.stringify(pos));
}

// ---- Export：JSONファイルとしてダウンロード ----
exportBtn.addEventListener("click", () => {
  const data = JSON.stringify(getCurrentSettings(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mono_new_tab_clock-settings.json";
  a.click();
  URL.revokeObjectURL(url);
});

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
