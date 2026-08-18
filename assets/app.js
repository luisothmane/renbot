function initialGameId() {
  const param = new URLSearchParams(location.search).get("game");
  if (param && GAME_SPECS[param]) return param;
  return localStorage.getItem("game") || "euromillions";
}

const STATE = {
  lang: getStoredLang(),
  gameId: initialGameId(),
  yourMain: new Set(),
  yourBonus: new Set(),
  winMain: new Set(),
  winBonus: new Set()
};

function t() {
  return I18N[STATE.lang];
}

function game() {
  return GAME_SPECS[STATE.gameId];
}

function updateCounts() {
  const T = t();
  const g = game();
  document.getElementById("yourMainCount").textContent = T.countLabel(STATE.yourMain.size, g.mainCount);
  document.getElementById("winMainCount").textContent = T.countLabel(STATE.winMain.size, g.mainCount);
  if (g.bonusCount > 0) {
    document.getElementById("yourBonusCount").textContent = T.countLabel(STATE.yourBonus.size, g.bonusCount);
    document.getElementById("winBonusCount").textContent = T.countLabel(STATE.winBonus.size, g.bonusCount);
  }
}

function isComplete() {
  const g = game();
  return (
    STATE.yourMain.size === g.mainCount &&
    STATE.yourBonus.size === g.bonusCount &&
    STATE.winMain.size === g.mainCount &&
    STATE.winBonus.size === g.bonusCount
  );
}

function showResult() {
  const T = t();
  const g = game();
  const resultPanel = document.getElementById("resultPanel");
  const warning = document.getElementById("incompleteWarning");

  if (!isComplete()) {
    warning.textContent = T.incompleteWarning;
    warning.hidden = false;
    resultPanel.hidden = true;
    return;
  }
  warning.hidden = true;

  const mainMatches = [...STATE.yourMain].filter((n) => STATE.winMain.has(n));
  const bonusMatches = [...STATE.yourBonus].filter((n) => STATE.winBonus.has(n));
  const tier = findTier(g, mainMatches.length, bonusMatches.length);

  resultPanel.hidden = false;
  resultPanel.classList.toggle("win", !!tier);
  resultPanel.classList.toggle("no-win", !tier);

  document.getElementById("resultSummary").textContent =
    T.matchSummary(mainMatches.length, g.mainCount, bonusMatches.length, g.bonusCount);

  const tierEl = document.getElementById("resultTier");
  const messageEl = document.getElementById("resultMessage");

  if (tier) {
    tierEl.hidden = false;
    tierEl.textContent = `${T.tierPrefix} ${tierLabel(T, g, STATE.gameId, tier)}`;
    messageEl.textContent = T.winMessage;
  } else {
    tierEl.hidden = true;
    messageEl.textContent = T.noWinMessage;
  }

  highlightMatches("yourMainGrid", mainMatches);
  highlightMatches("yourBonusGrid", bonusMatches);
  highlightMatches("winMainGrid", mainMatches);
  highlightMatches("winBonusGrid", bonusMatches);

  resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function highlightMatches(gridId, matches) {
  const grid = document.getElementById(gridId);
  grid.querySelectorAll(".num-btn").forEach((btn) => {
    const v = Number(btn.dataset.value);
    btn.classList.toggle("match", matches.includes(v) && btn.classList.contains("selected"));
  });
}

function clearHighlights() {
  document.querySelectorAll(".num-btn.match").forEach((btn) => btn.classList.remove("match"));
}

function clearResultUI() {
  document.getElementById("resultPanel").hidden = true;
  document.getElementById("incompleteWarning").hidden = true;
}

function resetAll() {
  STATE.yourMain.clear();
  STATE.yourBonus.clear();
  STATE.winMain.clear();
  STATE.winBonus.clear();
  syncBallGrid(document.getElementById("yourMainGrid"), STATE.yourMain);
  syncBallGrid(document.getElementById("yourBonusGrid"), STATE.yourBonus);
  syncBallGrid(document.getElementById("winMainGrid"), STATE.winMain);
  syncBallGrid(document.getElementById("winBonusGrid"), STATE.winBonus);
  clearHighlights();
  updateCounts();
  clearResultUI();
  document.getElementById("exampleSelect").value = "";
}

function loadExampleDraw(index) {
  if (index === "" || index === null) return;
  const draw = game().examples[Number(index)];
  if (!draw) return;
  STATE.winMain = new Set(draw.main);
  STATE.winBonus = new Set(draw.bonus);
  syncBallGrid(document.getElementById("winMainGrid"), STATE.winMain);
  syncBallGrid(document.getElementById("winBonusGrid"), STATE.winBonus);
  clearHighlights();
  updateCounts();
  clearResultUI();
}

function populateExampleSelect() {
  const select = document.getElementById("exampleSelect");
  const T = t();
  select.innerHTML = `<option value="">${T.exampleDrawsPlaceholder}</option>`;
  game().examples.forEach((draw, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = T.exampleLabel(i + 1);
    select.appendChild(opt);
  });
}

function renderGameTabs() {
  const T = t();
  const container = document.getElementById("gameSwitch");
  container.innerHTML = "";
  GAME_ORDER.forEach((id) => {
    const spec = GAME_SPECS[id];
    const info = T.games[id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "game-card" + (id === STATE.gameId ? " active" : "");
    btn.dataset.game = id;
    btn.style.setProperty("--game-from", spec.colorFrom);
    btn.style.setProperty("--game-to", spec.colorTo);
    btn.innerHTML = `<span class="game-badge">${spec.mono}</span><span class="game-name">${info.name}</span>`;
    btn.addEventListener("click", () => setGame(id));
    container.appendChild(btn);
  });
}

function applyGameLayout() {
  const g = game();
  const T = t();
  const gameT = T.games[STATE.gameId];

  buildBallGrid(document.getElementById("yourMainGrid"), g.mainMin, g.mainMax, g.mainCount, STATE.yourMain, updateCounts);
  buildBallGrid(document.getElementById("winMainGrid"), g.mainMin, g.mainMax, g.mainCount, STATE.winMain, updateCounts);

  const bonusSections = document.querySelectorAll(".bonus-section");
  if (g.bonusCount > 0) {
    bonusSections.forEach((el) => (el.hidden = false));
    buildBallGrid(document.getElementById("yourBonusGrid"), g.bonusMin, g.bonusMax, g.bonusCount, STATE.yourBonus, updateCounts);
    buildBallGrid(document.getElementById("winBonusGrid"), g.bonusMin, g.bonusMax, g.bonusCount, STATE.winBonus, updateCounts);
    document.getElementById("yourBonusLabel").textContent = gameT.bonusLabel;
    document.getElementById("winBonusLabel").textContent = gameT.bonusLabel;
  } else {
    bonusSections.forEach((el) => (el.hidden = true));
    document.getElementById("yourBonusGrid").innerHTML = "";
    document.getElementById("winBonusGrid").innerHTML = "";
  }

  document.getElementById("yourNumbersHint").textContent = T.yourNumbersHint(g.mainCount, g.bonusCount);

  populateExampleSelect();
  updateCounts();
  clearResultUI();
}

function setGame(gameId) {
  STATE.gameId = gameId;
  localStorage.setItem("game", gameId);
  STATE.yourMain.clear();
  STATE.yourBonus.clear();
  STATE.winMain.clear();
  STATE.winBonus.clear();
  renderGameTabs();
  applyGameLayout();
}

function applyTranslations() {
  const T = t();
  document.title = `${T.brand} – ${T.nav.checker}`;
  document.documentElement.lang = STATE.lang === "be" ? "nl" : STATE.lang;
  applyDataI18n(T);
  setFooterYear(T);
  setActiveNav();
  renderFooterGamesList(T);

  renderGameTabs();
  applyGameLayout();

  setActiveLangButtons(STATE.lang);
}

function setLang(lang) {
  STATE.lang = lang;
  applyTranslations();
}

function init() {
  document.getElementById("checkBtn").addEventListener("click", showResult);
  document.getElementById("resetBtn").addEventListener("click", resetAll);
  document.getElementById("exampleSelect").addEventListener("change", (e) => loadExampleDraw(e.target.value));

  bindLangButtons(setLang);
  bindMobileNav();

  applyTranslations();
}

document.addEventListener("DOMContentLoaded", init);
