const STATE = {
  lang: localStorage.getItem("lang") || "de",
  gameId: localStorage.getItem("game") || "euromillions",
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

function buildGrid(container, min, max, maxCount, setRef, onChange) {
  container.innerHTML = "";
  for (let i = min; i <= max; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "num-btn";
    btn.textContent = i;
    btn.dataset.value = i;
    btn.addEventListener("click", () => {
      if (setRef.has(i)) {
        setRef.delete(i);
        btn.classList.remove("selected");
      } else {
        if (setRef.size >= maxCount) return;
        setRef.add(i);
        btn.classList.add("selected");
      }
      onChange();
    });
    container.appendChild(btn);
  }
}

function syncGridVisual(container, setRef) {
  container.querySelectorAll(".num-btn").forEach((btn) => {
    const v = Number(btn.dataset.value);
    btn.classList.toggle("selected", setRef.has(v));
  });
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

function findTier(g, mainMatches, bonusMatches) {
  for (let i = 0; i < g.tiers.length; i++) {
    const [m, b] = g.tiers[i];
    if (m === mainMatches && (g.bonusCount === 0 || b === bonusMatches)) {
      return { rank: i + 1, main: m, bonus: b, isJackpot: i === 0 };
    }
  }
  return null;
}

function tierLabel(T, g, gameId, tier) {
  const gameT = T.games[gameId];
  let desc = `${tier.main} ${T.mainNumbersLabel}`;
  if (g.bonusCount > 0) {
    desc += ` + ${tier.bonus} ${gameT.bonusLabel}`;
  }
  let label = `${T.rankWord} ${tier.rank}`;
  if (tier.isJackpot) label += T.jackpotSuffix;
  return `${label} (${desc})`;
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
  syncGridVisual(document.getElementById("yourMainGrid"), STATE.yourMain);
  syncGridVisual(document.getElementById("yourBonusGrid"), STATE.yourBonus);
  syncGridVisual(document.getElementById("winMainGrid"), STATE.winMain);
  syncGridVisual(document.getElementById("winBonusGrid"), STATE.winBonus);
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
  syncGridVisual(document.getElementById("winMainGrid"), STATE.winMain);
  syncGridVisual(document.getElementById("winBonusGrid"), STATE.winBonus);
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

  buildGrid(document.getElementById("yourMainGrid"), g.mainMin, g.mainMax, g.mainCount, STATE.yourMain, updateCounts);
  buildGrid(document.getElementById("winMainGrid"), g.mainMin, g.mainMax, g.mainCount, STATE.winMain, updateCounts);

  const bonusSections = document.querySelectorAll(".bonus-section");
  if (g.bonusCount > 0) {
    bonusSections.forEach((el) => (el.hidden = false));
    buildGrid(document.getElementById("yourBonusGrid"), g.bonusMin, g.bonusMax, g.bonusCount, STATE.yourBonus, updateCounts);
    buildGrid(document.getElementById("winBonusGrid"), g.bonusMin, g.bonusMax, g.bonusCount, STATE.winBonus, updateCounts);
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
  document.title = T.pageTitle;
  document.documentElement.lang = STATE.lang === "be" ? "nl" : STATE.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (typeof T[key] === "string") el.textContent = T[key];
  });

  renderGameTabs();
  applyGameLayout();

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === STATE.lang);
  });
}

function setLang(lang) {
  STATE.lang = lang;
  localStorage.setItem("lang", lang);
  applyTranslations();
}

function init() {
  document.getElementById("checkBtn").addEventListener("click", showResult);
  document.getElementById("resetBtn").addEventListener("click", resetAll);
  document.getElementById("exampleSelect").addEventListener("change", (e) => loadExampleDraw(e.target.value));

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  applyTranslations();
}

document.addEventListener("DOMContentLoaded", init);
