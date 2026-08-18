let lang = getStoredLang();
let currentUser = null;
let depotTickets = [];
const depotDraftGameId = { value: "euromillions" };
const depotDraftMain = new Set();
const depotDraftBonus = new Set();

function t() {
  return I18N[lang];
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options
  });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

/* ---------- Auth ---------- */

function showTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("loginForm").hidden = !isLogin;
  document.getElementById("registerForm").hidden = isLogin;
  document.getElementById("tabLogin").classList.toggle("active", isLogin);
  document.getElementById("tabRegister").classList.toggle("active", !isLogin);
}

function errorMessage(T, code) {
  const map = {
    invalid_credentials: T.depot.errorInvalidCredentials,
    email_taken: T.depot.errorEmailTaken,
    invalid_email: T.depot.errorInvalidEmail,
    password_too_short: T.depot.errorPasswordShort
  };
  return map[code] || T.depot.errorGeneric;
}

async function handleLogin(e) {
  e.preventDefault();
  const T = t();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  errEl.hidden = true;

  const { ok, data } = await api("api/login.php", { method: "POST", body: JSON.stringify({ email, password }) });
  if (!ok) {
    errEl.textContent = errorMessage(T, data.error);
    errEl.hidden = false;
    return;
  }
  await refreshSession();
}

async function handleRegister(e) {
  e.preventDefault();
  const T = t();
  const payload = {
    email: document.getElementById("regEmail").value.trim(),
    password: document.getElementById("regPassword").value,
    firstName: document.getElementById("regFirstName").value.trim(),
    lastName: document.getElementById("regLastName").value.trim(),
    address: document.getElementById("regAddress").value.trim(),
    postalCode: document.getElementById("regPostalCode").value.trim(),
    city: document.getElementById("regCity").value.trim()
  };
  const errEl = document.getElementById("registerError");
  errEl.hidden = true;

  const { ok, data } = await api("api/register.php", { method: "POST", body: JSON.stringify(payload) });
  if (!ok) {
    errEl.textContent = errorMessage(T, data.error);
    errEl.hidden = false;
    return;
  }
  await refreshSession();
}

async function handleLogout() {
  await api("api/logout.php", { method: "POST" });
  await refreshSession();
}

async function refreshSession() {
  const { data } = await api("api/me.php", { method: "GET" });
  currentUser = data.loggedIn ? data.user : null;
  renderAuthState();
  if (currentUser) {
    await loadDepotTickets();
  }
}

function renderAuthState() {
  const T = t();
  const authSection = document.getElementById("authSection");
  const accountSection = document.getElementById("accountSection");
  if (currentUser) {
    authSection.hidden = true;
    accountSection.hidden = false;
    const name = currentUser.firstName || currentUser.email;
    document.getElementById("welcomeMessage").textContent = T.depot.welcomeMessage(name);
  } else {
    authSection.hidden = false;
    accountSection.hidden = true;
  }
}

/* ---------- Draft ticket form ---------- */

function renderDepotDraftGameSwitch() {
  const T = t();
  const container = document.getElementById("depotDraftGameSwitch");
  container.innerHTML = "";
  GAME_ORDER.forEach((id) => {
    const spec = GAME_SPECS[id];
    const info = T.games[id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "game-card" + (id === depotDraftGameId.value ? " active" : "");
    btn.style.setProperty("--game-from", spec.colorFrom);
    btn.style.setProperty("--game-to", spec.colorTo);
    btn.innerHTML = `<span class="game-badge">${spec.mono}</span><span class="game-name">${info.name}</span>`;
    btn.addEventListener("click", () => {
      depotDraftGameId.value = id;
      depotDraftMain.clear();
      depotDraftBonus.clear();
      renderDepotDraftGameSwitch();
      applyDepotDraftLayout();
    });
    container.appendChild(btn);
  });
}

function updateDepotDraftCounts() {
  const T = t();
  const spec = GAME_SPECS[depotDraftGameId.value];
  document.getElementById("depotDraftMainCount").textContent = T.countLabel(depotDraftMain.size, spec.mainCount);
  if (spec.bonusCount > 0) {
    document.getElementById("depotDraftBonusCount").textContent = T.countLabel(depotDraftBonus.size, spec.bonusCount);
  }
}

function applyDepotDraftLayout() {
  const T = t();
  const spec = GAME_SPECS[depotDraftGameId.value];

  buildBallGrid(document.getElementById("depotDraftMainGrid"), spec.mainMin, spec.mainMax, spec.mainCount, depotDraftMain, updateDepotDraftCounts);

  const bonusSection = document.querySelector("#accountSection .bonus-section");
  if (spec.bonusCount > 0) {
    bonusSection.hidden = false;
    buildBallGrid(document.getElementById("depotDraftBonusGrid"), spec.bonusMin, spec.bonusMax, spec.bonusCount, depotDraftBonus, updateDepotDraftCounts);
    document.getElementById("depotDraftBonusLabel").textContent = T.games[depotDraftGameId.value].bonusLabel;
  } else {
    bonusSection.hidden = true;
    document.getElementById("depotDraftBonusGrid").innerHTML = "";
  }

  updateDepotDraftCounts();
  document.getElementById("depotDraftWarning").hidden = true;
}

async function addDepotTicket() {
  const T = t();
  const spec = GAME_SPECS[depotDraftGameId.value];
  if (depotDraftMain.size !== spec.mainCount || depotDraftBonus.size !== spec.bonusCount) {
    const warn = document.getElementById("depotDraftWarning");
    warn.textContent = T.tickets.ticketIncompleteWarning;
    warn.hidden = false;
    return;
  }
  const { ok } = await api("api/tickets.php", {
    method: "POST",
    body: JSON.stringify({
      gameId: depotDraftGameId.value,
      main: [...depotDraftMain].sort((a, b) => a - b),
      bonus: [...depotDraftBonus].sort((a, b) => a - b)
    })
  });
  if (!ok) return;
  depotDraftMain.clear();
  depotDraftBonus.clear();
  applyDepotDraftLayout();
  await loadDepotTickets();
}

async function removeDepotTicket(id) {
  await api(`api/tickets.php?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  await loadDepotTickets();
}

/* ---------- Ticket list ---------- */

async function loadDepotTickets() {
  const { ok, data } = await api("api/tickets.php", { method: "GET" });
  depotTickets = ok && Array.isArray(data.tickets) ? data.tickets : [];
  renderDepotTicketList();
}

function formatMoney(amount) {
  const locales = { de: "de-DE", fr: "fr-FR", nl: "nl-NL", be: "nl-BE" };
  return new Intl.NumberFormat(locales[lang] || "de-DE", { style: "currency", currency: "EUR" }).format(Number(amount) || 0);
}

function formatDate(iso) {
  const locales = { de: "de-DE", fr: "fr-FR", nl: "nl-NL", be: "nl-BE" };
  return new Date(iso.replace(" ", "T")).toLocaleDateString(locales[lang] || "de-DE", { year: "numeric", month: "short", day: "numeric" });
}

function renderDepotTicketList() {
  const T = t();
  const listEl = document.getElementById("depotTicketList");
  const emptyEl = document.getElementById("depotEmptyState");
  listEl.innerHTML = "";
  if (depotTickets.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  depotTickets.forEach((ticket) => {
    listEl.appendChild(buildDepotTicketCard(ticket, T));
  });
}

function buildDepotTicketCard(ticket, T) {
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
    <span class="ticket-meta">${T.tickets.savedOn(formatDate(ticket.createdAt))}</span>
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
      b.style.background = "radial-gradient(circle at 32% 26%, var(--gold-1), var(--gold-3) 78%)";
      b.style.color = "#241a00";
      b.textContent = n;
      numbersRow.appendChild(b);
    });
  }
  card.appendChild(numbersRow);

  const statusRow = document.createElement("div");
  statusRow.className = "ticket-meta";
  statusRow.style.margin = "0.6rem 0";
  let statusHtml = T.depot.priceLine(formatMoney(ticket.price));
  if (ticket.statusOverride === "win") {
    statusHtml += `<br><span style="color:var(--win); font-weight:700;">${T.depot.statusWinLabel}</span>`;
    if (ticket.wonAmount !== null) {
      statusHtml += `<br><span style="color:var(--win); font-weight:700;">${T.depot.wonAmountLine(formatMoney(ticket.wonAmount))}</span>`;
    }
  } else if (ticket.statusOverride === "loss") {
    statusHtml += `<br><span style="color:var(--no-win);">${T.depot.statusLossLabel}</span>`;
  }
  statusRow.innerHTML = statusHtml;
  card.appendChild(statusRow);

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
  removeBtn.addEventListener("click", () => removeDepotTicket(ticket.id));
  actions.appendChild(checkBtn);
  actions.appendChild(removeBtn);
  card.appendChild(actions);

  const checkPanel = buildDepotCheckPanel(ticket, T, spec);
  card.appendChild(checkPanel);

  let open = false;
  checkBtn.addEventListener("click", () => {
    open = !open;
    checkPanel.hidden = !open;
    checkBtn.textContent = open ? T.tickets.closeLabel : T.tickets.checkLabel;
  });

  return card;
}

function buildDepotCheckPanel(ticket, T, spec) {
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

/* ---------- Page bootstrap ---------- */

function applyDepotTranslations() {
  const T = t();
  document.title = `${T.brand} – ${T.depot.title}`;
  document.documentElement.lang = lang === "be" ? "nl" : lang;
  applyDataI18n(T);
  setFooterYear(T);
  setActiveNav();
  setActiveLangButtons(lang);
  renderFooterGamesList(T);
  renderAuthState();
  renderDepotDraftGameSwitch();
  applyDepotDraftLayout();
  renderDepotTicketList();
}

function setDepotLang(newLang) {
  lang = newLang;
  applyDepotTranslations();
}

function initDepot() {
  bindLangButtons(setDepotLang);
  bindMobileNav();

  document.getElementById("tabLogin").addEventListener("click", () => showTab("login"));
  document.getElementById("tabRegister").addEventListener("click", () => showTab("register"));
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("registerForm").addEventListener("submit", handleRegister);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("depotAddTicketBtn").addEventListener("click", addDepotTicket);

  showTab("login");
  applyDepotTranslations();
  refreshSession();
}

document.addEventListener("DOMContentLoaded", initDepot);
