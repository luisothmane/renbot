const STATE = {
  lang: localStorage.getItem("lang") || "de",
  yourMain: new Set(),
  yourStars: new Set(),
  winMain: new Set(),
  winStars: new Set()
};

const MAIN_MAX = 5;
const STAR_MAX = 2;

function t() {
  return I18N[STATE.lang];
}

function buildGrid(container, max, setRef, onChange) {
  container.innerHTML = "";
  const count = container.dataset.count === "stars" ? 12 : 50;
  for (let i = 1; i <= count; i++) {
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
        if (setRef.size >= max) return;
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
  document.getElementById("yourMainCount").textContent = T.countLabel(STATE.yourMain.size, MAIN_MAX);
  document.getElementById("yourStarsCount").textContent = T.countLabel(STATE.yourStars.size, STAR_MAX);
  document.getElementById("winMainCount").textContent = T.countLabel(STATE.winMain.size, MAIN_MAX);
  document.getElementById("winStarsCount").textContent = T.countLabel(STATE.winStars.size, STAR_MAX);
}

function computeTierKey(mainMatches, starMatches) {
  const key = `${mainMatches}+${starMatches}`;
  const validKeys = new Set([
    "5+2", "5+1", "5+0", "4+2", "4+1", "3+2", "4+0",
    "2+2", "3+1", "3+0", "1+2", "2+1", "2+0"
  ]);
  return validKeys.has(key) ? key : null;
}

function showResult() {
  const T = t();
  const resultPanel = document.getElementById("resultPanel");
  const warning = document.getElementById("incompleteWarning");

  if (
    STATE.yourMain.size !== MAIN_MAX ||
    STATE.yourStars.size !== STAR_MAX ||
    STATE.winMain.size !== MAIN_MAX ||
    STATE.winStars.size !== STAR_MAX
  ) {
    warning.textContent = T.incompleteWarning;
    warning.hidden = false;
    resultPanel.hidden = true;
    return;
  }
  warning.hidden = true;

  const mainMatches = [...STATE.yourMain].filter((n) => STATE.winMain.has(n));
  const starMatches = [...STATE.yourStars].filter((n) => STATE.winStars.has(n));
  const tierKey = computeTierKey(mainMatches.length, starMatches.length);

  resultPanel.hidden = false;
  resultPanel.classList.toggle("win", !!tierKey);
  resultPanel.classList.toggle("no-win", !tierKey);

  document.getElementById("resultSummary").textContent = T.matchSummary(mainMatches.length, starMatches.length);

  const tierEl = document.getElementById("resultTier");
  const messageEl = document.getElementById("resultMessage");

  if (tierKey) {
    tierEl.hidden = false;
    tierEl.textContent = `${T.tierPrefix} ${T.tiers[tierKey]}`;
    messageEl.textContent = T.winMessage;
  } else {
    tierEl.hidden = true;
    messageEl.textContent = T.noWinMessage;
  }

  highlightMatches("yourMainGrid", mainMatches);
  highlightMatches("yourStarsGrid", starMatches);
  highlightMatches("winMainGrid", mainMatches);
  highlightMatches("winStarsGrid", starMatches);

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

function resetAll() {
  STATE.yourMain.clear();
  STATE.yourStars.clear();
  STATE.winMain.clear();
  STATE.winStars.clear();
  syncGridVisual(document.getElementById("yourMainGrid"), STATE.yourMain);
  syncGridVisual(document.getElementById("yourStarsGrid"), STATE.yourStars);
  syncGridVisual(document.getElementById("winMainGrid"), STATE.winMain);
  syncGridVisual(document.getElementById("winStarsGrid"), STATE.winStars);
  clearHighlights();
  updateCounts();
  document.getElementById("resultPanel").hidden = true;
  document.getElementById("incompleteWarning").hidden = true;
  document.getElementById("exampleSelect").value = "";
}

function loadExampleDraw(index) {
  if (index === "" || index === null) return;
  const draw = t().exampleDraws[Number(index)];
  if (!draw) return;
  STATE.winMain = new Set(draw.main);
  STATE.winStars = new Set(draw.stars);
  syncGridVisual(document.getElementById("winMainGrid"), STATE.winMain);
  syncGridVisual(document.getElementById("winStarsGrid"), STATE.winStars);
  clearHighlights();
  updateCounts();
  document.getElementById("resultPanel").hidden = true;
  document.getElementById("incompleteWarning").hidden = true;
}

function populateExampleSelect() {
  const select = document.getElementById("exampleSelect");
  const T = t();
  select.innerHTML = `<option value="">${T.exampleDrawsPlaceholder}</option>`;
  T.exampleDraws.forEach((draw, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = draw.label;
    select.appendChild(opt);
  });
}

function applyTranslations() {
  const T = t();
  document.title = T.pageTitle;
  document.documentElement.lang = STATE.lang === "be" ? "nl" : STATE.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (T[key] !== undefined) el.textContent = T[key];
  });
  populateExampleSelect();
  updateCounts();
  document.getElementById("incompleteWarning").hidden = true;

  const resultPanel = document.getElementById("resultPanel");
  if (!resultPanel.hidden) {
    showResult();
  }

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
  buildGrid(document.getElementById("yourMainGrid"), MAIN_MAX, STATE.yourMain, updateCounts);
  buildGrid(document.getElementById("yourStarsGrid"), STAR_MAX, STATE.yourStars, updateCounts);
  buildGrid(document.getElementById("winMainGrid"), MAIN_MAX, STATE.winMain, updateCounts);
  buildGrid(document.getElementById("winStarsGrid"), STAR_MAX, STATE.winStars, updateCounts);

  document.getElementById("checkBtn").addEventListener("click", showResult);
  document.getElementById("resetBtn").addEventListener("click", resetAll);
  document.getElementById("exampleSelect").addEventListener("change", (e) => loadExampleDraw(e.target.value));

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  applyTranslations();
}

document.addEventListener("DOMContentLoaded", init);
