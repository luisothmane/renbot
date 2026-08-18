let lang = getStoredLang();
let tickets = [];
const draftGameId = { value: "euromillions" };
const draftMain = new Set();
const draftBonus = new Set();

function t() {
  return I18N[lang];
}

function loadTickets() {
  try {
    const raw = localStorage.getItem("lotto_tickets");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveTicketsToStorage() {
  localStorage.setItem("lotto_tickets", JSON.stringify(tickets));
}

function formatDate(iso) {
  const locales = { de: "de-DE", fr: "fr-FR", nl: "nl-NL", be: "nl-BE" };
  return new Date(iso).toLocaleDateString(locales[lang] || "de-DE", { year: "numeric", month: "short", day: "numeric" });
}

/* ---------- Draft (new ticket) form ---------- */

function renderDraftGameSwitch() {
  const T = t();
  const container = document.getElementById("draftGameSwitch");
  container.innerHTML = "";
  GAME_ORDER.forEach((id) => {
    const spec = GAME_SPECS[id];
    const info = T.games[id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "game-card" + (id === draftGameId.value ? " active" : "");
    btn.style.setProperty("--game-from", spec.colorFrom);
    btn.style.setProperty("--game-to", spec.colorTo);
    btn.innerHTML = `<span class="game-badge">${spec.mono}</span><span class="game-name">${info.name}</span>`;
    btn.addEventListener("click", () => {
      draftGameId.value = id;
      draftMain.clear();
      draftBonus.clear();
      renderDraftGameSwitch();
      applyDraftLayout();
    });
    container.appendChild(btn);
  });
}

function updateDraftCounts() {
  const T = t();
  const spec = GAME_SPECS[draftGameId.value];
  document.getElementById("draftMainCount").textContent = T.countLabel(draftMain.size, spec.mainCount);
  if (spec.bonusCount > 0) {
    document.getElementById("draftBonusCount").textContent = T.countLabel(draftBonus.size, spec.bonusCount);
  }
}

function applyDraftLayout() {
  const T = t();
  const spec = GAME_SPECS[draftGameId.value];

  buildBallGrid(document.getElementById("draftMainGrid"), spec.mainMin, spec.mainMax, spec.mainCount, draftMain, updateDraftCounts);

  const bonusSection = document.querySelector(".bonus-section");
  if (spec.bonusCount > 0) {
    bonusSection.hidden = false;
    buildBallGrid(document.getElementById("draftBonusGrid"), spec.bonusMin, spec.bonusMax, spec.bonusCount, draftBonus, updateDraftCounts);
    document.getElementById("draftBonusLabel").textContent = T.games[draftGameId.value].bonusLabel;
  } else {
    bonusSection.hidden = true;
    document.getElementById("draftBonusGrid").innerHTML = "";
  }

  updateDraftCounts();
  document.getElementById("draftWarning").hidden = true;
}

function addTicket() {
  const T = t();
  const spec = GAME_SPECS[draftGameId.value];
  if (draftMain.size !== spec.mainCount || draftBonus.size !== spec.bonusCount) {
    const warn = document.getElementById("draftWarning");
    warn.textContent = T.tickets.ticketIncompleteWarning;
    warn.hidden = false;
    return;
  }
  tickets.push({
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    gameId: draftGameId.value,
    main: [...draftMain].sort((a, b) => a - b),
    bonus: [...draftBonus].sort((a, b) => a - b),
    savedAt: new Date().toISOString()
  });
  saveTicketsToStorage();
  draftMain.clear();
  draftBonus.clear();
  applyDraftLayout();
  renderTicketList();
}

function removeTicket(id) {
  tickets = tickets.filter((tk) => tk.id !== id);
  saveTicketsToStorage();
  renderTicketList();
}

/* ---------- Saved ticket list ---------- */

function renderTicketList() {
  const T = t();
  const listEl = document.getElementById("ticketList");
  const emptyEl = document.getElementById("emptyState");
  listEl.innerHTML = "";
  if (tickets.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  tickets.slice().reverse().forEach((ticket) => {
    listEl.appendChild(buildTicketCard(ticket, T));
  });
}

function buildTicketCard(ticket, T) {
  const spec = GAME_SPECS[ticket.gameId];
  const info = T.games[ticket.gameId];
  const card = document.createElement("div");
  card.className = "ticket-card";

  const head = document.createElement("div");
  head.className = "ticket-card-head";
  head.innerHTML = `
    <div class="ticket-card-title">
      <span class="game-badge" style="--game-from:${spec.colorFrom}; --game-to:${spec.colorTo}; width:34px; height:34px; font-size:0.68rem;">${spec.mono}</span>
      <span>${info.name}</span>
    </div>
    <span class="ticket-meta">${T.tickets.savedOn(formatDate(ticket.savedAt))}</span>
  `;
  card.appendChild(head);

  const numbersRow = document.createElement("div");
  numbersRow.className = "ticket-numbers";
  ticket.main.forEach((n) => {
    const b = document.createElement("span");
    b.className = "num-btn static selected";
    b.textContent = n;
    numbersRow.appendChild(b);
  });
  if (spec.bonusCount > 0) {
    ticket.bonus.forEach((n) => {
      const b = document.createElement("span");
      b.className = "num-btn static selected";
      b.style.background = `radial-gradient(circle at 32% 26%, var(--gold-1), var(--gold-3) 78%)`;
      b.style.color = "#241a00";
      b.textContent = n;
      numbersRow.appendChild(b);
    });
  }
  card.appendChild(numbersRow);

  const actions = document.createElement("div");
  actions.className = "ticket-card-actions";
  const checkBtn = document.createElement("button");
  checkBtn.className = "btn-sm";
  checkBtn.type = "button";
  checkBtn.textContent = T.tickets.checkLabel;
  const removeBtn = document.createElement("button");
  removeBtn.className = "btn-sm danger";
  removeBtn.type = "button";
  removeBtn.textContent = T.tickets.removeLabel;
  removeBtn.addEventListener("click", () => removeTicket(ticket.id));
  actions.appendChild(checkBtn);
  actions.appendChild(removeBtn);
  card.appendChild(actions);

  const checkPanel = buildCheckPanel(ticket, T, spec);
  card.appendChild(checkPanel);

  let open = false;
  checkBtn.addEventListener("click", () => {
    open = !open;
    checkPanel.hidden = !open;
    checkBtn.textContent = open ? T.tickets.closeLabel : T.tickets.checkLabel;
  });

  return card;
}

function buildCheckPanel(ticket, T, spec) {
  const panel = document.createElement("div");
  panel.className = "check-panel";
  panel.hidden = true;

  const winMain = new Set();
  const winBonus = new Set();

  const mainLabel = document.createElement("div");
  mainLabel.className = "group-label";
  mainLabel.innerHTML = `<span>${T.mainNumbersLabel}</span><span class="count">${T.countLabel(0, spec.mainCount)}</span>`;
  panel.appendChild(mainLabel);

  const mainGrid = document.createElement("div");
  mainGrid.className = "grid";
  panel.appendChild(mainGrid);
  buildBallGrid(mainGrid, spec.mainMin, spec.mainMax, spec.mainCount, winMain, () => {
    mainLabel.querySelector(".count").textContent = T.countLabel(winMain.size, spec.mainCount);
  });

  let bonusGrid = null;
  let bonusLabelEl = null;
  if (spec.bonusCount > 0) {
    bonusLabelEl = document.createElement("div");
    bonusLabelEl.className = "group-label";
    bonusLabelEl.innerHTML = `<span>${T.games[ticket.gameId].bonusLabel}</span><span class="count">${T.countLabel(0, spec.bonusCount)}</span>`;
    panel.appendChild(bonusLabelEl);
    bonusGrid = document.createElement("div");
    bonusGrid.className = "grid grid-bonus";
    panel.appendChild(bonusGrid);
    buildBallGrid(bonusGrid, spec.bonusMin, spec.bonusMax, spec.bonusCount, winBonus, () => {
      bonusLabelEl.querySelector(".count").textContent = T.countLabel(winBonus.size, spec.bonusCount);
    });
  }

  const exampleRow = document.createElement("div");
  exampleRow.className = "example-row";
  const exLabel = document.createElement("label");
  exLabel.textContent = T.exampleDrawsLabel;
  const exSelect = document.createElement("select");
  exSelect.innerHTML = `<option value="">${T.exampleDrawsPlaceholder}</option>` +
    spec.examples.map((ex, i) => `<option value="${i}">${T.exampleLabel(i + 1)}</option>`).join("");
  exSelect.addEventListener("change", () => {
    if (exSelect.value === "") return;
    const ex = spec.examples[Number(exSelect.value)];
    winMain.clear();
    ex.main.forEach((n) => winMain.add(n));
    winBonus.clear();
    (ex.bonus || []).forEach((n) => winBonus.add(n));
    syncBallGrid(mainGrid, winMain);
    mainLabel.querySelector(".count").textContent = T.countLabel(winMain.size, spec.mainCount);
    if (bonusGrid) {
      syncBallGrid(bonusGrid, winBonus);
      bonusLabelEl.querySelector(".count").textContent = T.countLabel(winBonus.size, spec.bonusCount);
    }
  });
  exampleRow.appendChild(exLabel);
  exampleRow.appendChild(exSelect);
  panel.appendChild(exampleRow);

  const checkNowBtn = document.createElement("button");
  checkNowBtn.className = "btn btn-primary";
  checkNowBtn.type = "button";
  checkNowBtn.style.marginTop = "1.1rem";
  checkNowBtn.textContent = T.checkButton;
  panel.appendChild(checkNowBtn);

  const resultBox = document.createElement("div");
  resultBox.style.marginTop = "1rem";
  panel.appendChild(resultBox);

  checkNowBtn.addEventListener("click", () => {
    if (winMain.size !== spec.mainCount || winBonus.size !== spec.bonusCount) {
      resultBox.innerHTML = `<p class="warning">${T.tickets.ticketIncompleteWarning}</p>`;
      return;
    }
    const mainMatches = ticket.main.filter((n) => winMain.has(n));
    const bonusMatches = ticket.bonus.filter((n) => winBonus.has(n));
    const tier = findTier(spec, mainMatches.length, bonusMatches.length);
    const summary = T.matchSummary(mainMatches.length, spec.mainCount, bonusMatches.length, spec.bonusCount);
    if (tier) {
      resultBox.innerHTML = `
        <p style="color:var(--win); font-weight:700; margin:0 0 0.3rem;">${T.winMessage}</p>
        <p style="margin:0 0 0.3rem; color:var(--text-dim);">${summary}</p>
        <p style="margin:0; font-weight:700; color:var(--gold-3);">${T.tierPrefix} ${tierLabel(T, spec, ticket.gameId, tier)}</p>
      `;
    } else {
      resultBox.innerHTML = `
        <p style="color:var(--no-win); font-weight:700; margin:0 0 0.3rem;">${T.noWinMessage}</p>
        <p style="margin:0; color:var(--text-dim);">${summary}</p>
      `;
    }
  });

  return panel;
}

/* ---------- Nickname (local display name only, no auth) ---------- */

function bindNicknameInput() {
  const input = document.getElementById("nicknameInput");
  input.value = localStorage.getItem("lotto_nickname") || "";
  input.addEventListener("input", () => {
    localStorage.setItem("lotto_nickname", input.value.slice(0, 40));
  });
}

/* ---------- Page bootstrap ---------- */

function applyTicketsTranslations() {
  const T = t();
  document.title = `${T.brand} – ${T.tickets.title}`;
  document.documentElement.lang = lang === "be" ? "nl" : lang;
  applyDataI18n(T);
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const val = key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), T);
    if (typeof val === "string") el.placeholder = val;
  });
  setFooterYear(T);
  setActiveNav();
  setActiveLangButtons(lang);
  renderFooterGamesList(T);
  renderDraftGameSwitch();
  applyDraftLayout();
  renderTicketList();
}

function setTicketsLang(newLang) {
  lang = newLang;
  applyTicketsTranslations();
}

function initTickets() {
  tickets = loadTickets();
  bindNicknameInput();
  bindLangButtons(setTicketsLang);
  bindMobileNav();
  document.getElementById("addTicketBtn").addEventListener("click", addTicket);
  applyTicketsTranslations();
}

document.addEventListener("DOMContentLoaded", initTickets);
