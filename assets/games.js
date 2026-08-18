/* Language-independent game formats, prize-tier tables (best rank first), and example draws.
   Ranges: main numbers go from mainMin..mainMax, bonus numbers (if any) from bonusMin..bonusMax.
   Tiers are [mainMatches, bonusMatches] tuples; for bonusCount === 0 games only the main
   count is compared. This is an unofficial simplification for demo purposes. */
const GAME_ORDER = ["euromillions", "eurojackpot", "lotto49", "loto", "lotto645"];

const GAME_SPECS = {
  euromillions: {
    mono: "EM",
    colorFrom: "#a78bfa", colorTo: "#6d28d9",
    jackpot: 130000000,
    mainCount: 5, mainMin: 1, mainMax: 50,
    bonusCount: 2, bonusMin: 1, bonusMax: 12,
    tiers: [[5, 2], [5, 1], [5, 0], [4, 2], [4, 1], [3, 2], [4, 0], [2, 2], [3, 1], [3, 0], [1, 2], [2, 1], [2, 0]],
    examples: [
      { main: [7, 14, 22, 35, 41], bonus: [3, 9] },
      { main: [2, 18, 27, 33, 49], bonus: [6, 11] }
    ]
  },
  eurojackpot: {
    mono: "EJ",
    colorFrom: "#2dd4bf", colorTo: "#0f766e",
    jackpot: 90000000,
    mainCount: 5, mainMin: 1, mainMax: 50,
    bonusCount: 2, bonusMin: 1, bonusMax: 12,
    tiers: [[5, 2], [5, 1], [5, 0], [4, 2], [4, 1], [3, 2], [4, 0], [2, 2], [3, 1], [3, 0], [1, 2], [2, 1]],
    examples: [
      { main: [4, 12, 29, 38, 45], bonus: [5, 10] },
      { main: [9, 16, 24, 31, 47], bonus: [2, 7] }
    ]
  },
  lotto49: {
    mono: "49",
    colorFrom: "#fb7185", colorTo: "#9f1239",
    jackpot: 3000000,
    mainCount: 6, mainMin: 1, mainMax: 49,
    bonusCount: 1, bonusMin: 0, bonusMax: 9,
    tiers: [[6, 1], [6, 0], [5, 1], [5, 0], [4, 1], [4, 0], [3, 1], [3, 0], [2, 1]],
    examples: [
      { main: [3, 11, 19, 27, 34, 44], bonus: [6] },
      { main: [5, 14, 22, 30, 39, 48], bonus: [2] }
    ]
  },
  loto: {
    mono: "FR",
    colorFrom: "#60a5fa", colorTo: "#1e40af",
    jackpot: 15000000,
    mainCount: 5, mainMin: 1, mainMax: 49,
    bonusCount: 1, bonusMin: 1, bonusMax: 10,
    tiers: [[5, 1], [5, 0], [4, 1], [4, 0], [3, 1], [3, 0], [2, 1], [1, 1], [0, 1]],
    examples: [
      { main: [6, 13, 21, 29, 44], bonus: [7] },
      { main: [2, 9, 18, 27, 41], bonus: [3] }
    ]
  },
  lotto645: {
    mono: "NL",
    colorFrom: "#fbbf24", colorTo: "#b45309",
    jackpot: 5000000,
    mainCount: 6, mainMin: 1, mainMax: 45,
    bonusCount: 0, bonusMin: 0, bonusMax: 0,
    tiers: [[6, 0], [5, 0], [4, 0], [3, 0]],
    examples: [
      { main: [4, 10, 17, 23, 31, 40], bonus: [] },
      { main: [3, 12, 19, 28, 36, 44], bonus: [] }
    ]
  }
};

/* ---------- Shared game logic (used by checker, home and tickets pages) ---------- */

function buildBallGrid(container, min, max, maxCount, setRef, onChange) {
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

function syncBallGrid(container, setRef) {
  container.querySelectorAll(".num-btn").forEach((btn) => {
    const v = Number(btn.dataset.value);
    btn.classList.toggle("selected", setRef.has(v));
  });
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

function gameFormatLabel(T, gameId) {
  const g = GAME_SPECS[gameId];
  const gameT = T.games[gameId];
  let label = `${g.mainCount} ${T.ofWord} ${g.mainMax}`;
  if (g.bonusCount > 0) {
    label += ` + ${g.bonusCount} ${gameT.bonusLabel}`;
  }
  return label;
}

function formatJackpot(lang, amount) {
  const locales = { de: "de-DE", fr: "fr-FR", nl: "nl-NL", be: "nl-BE" };
  const formatted = new Intl.NumberFormat(locales[lang] || "de-DE", { maximumFractionDigits: 0 }).format(amount);
  return `${formatted} €`;
}

/* ---------- Shared header/footer/nav helpers (used on every page) ---------- */

function applyDataI18n(T) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const val = key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), T);
    if (typeof val === "string") el.textContent = val;
  });
}

function setActiveLangButtons(lang) {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}

function setFooterYear(T) {
  const el = document.getElementById("footerYear");
  if (el && T.footerRights) el.textContent = T.footerRights(new Date().getFullYear());
}

function setActiveNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === page);
  });
}

function getStoredLang() {
  return localStorage.getItem("lang") || "de";
}

function bindLangButtons(onChange) {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      localStorage.setItem("lang", btn.dataset.lang);
      onChange(btn.dataset.lang);
    });
  });
}

function renderFooterGamesList(T) {
  const list = document.getElementById("footerGamesList");
  if (!list) return;
  list.innerHTML = "";
  GAME_ORDER.forEach((id) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `checker.html?game=${id}`;
    a.textContent = T.games[id].name;
    li.appendChild(a);
    list.appendChild(li);
  });
}

function bindMobileNav() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("siteNav");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}
