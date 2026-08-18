let lang = getStoredLang();
let draws = [];
let ticketsData = [];
let usersData = [];
const drawGameId = { value: "euromillions" };
const drawMain = new Set();
const drawBonus = new Set();

function t() {
  return I18N[lang];
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...(options || {})
  });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

function formatDate(value) {
  const locales = { de: "de-DE", fr: "fr-FR", nl: "nl-NL", be: "nl-BE" };
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  return new Date(iso).toLocaleDateString(locales[lang] || "de-DE", { year: "numeric", month: "short", day: "numeric" });
}

function numbersToText(main, bonus) {
  let text = main.join(", ");
  if (bonus && bonus.length) text += " + " + bonus.join(", ");
  return text;
}

/* ---------- Access gate ---------- */

async function checkAccess() {
  const { data } = await api("api/me.php");
  const gateOut = document.getElementById("gateLoggedOut");
  const gateNotAdmin = document.getElementById("gateNotAdmin");
  const panel = document.getElementById("adminPanel");

  if (!data.loggedIn) {
    gateOut.hidden = false;
    gateNotAdmin.hidden = true;
    panel.hidden = true;
    return false;
  }
  if (!data.user.isAdmin) {
    gateOut.hidden = true;
    gateNotAdmin.hidden = false;
    panel.hidden = true;
    return false;
  }
  gateOut.hidden = true;
  gateNotAdmin.hidden = true;
  panel.hidden = false;
  return true;
}

/* ---------- Data loading ---------- */

async function loadAll() {
  await Promise.all([loadUsers(), loadDraws(), loadTickets()]);
  renderStats();
}

async function loadUsers() {
  const { ok, data } = await api("api/admin/users.php");
  usersData = ok && Array.isArray(data.users) ? data.users : [];
  renderUsers();
}

async function loadDraws() {
  const { ok, data } = await api("api/admin/draws.php");
  draws = ok && Array.isArray(data.draws) ? data.draws : [];
  renderDraws();
  renderTickets();
}

async function loadTickets() {
  const { ok, data } = await api("api/admin/tickets.php");
  ticketsData = ok && Array.isArray(data.tickets) ? data.tickets : [];
  renderTickets();
}

function renderStats() {
  document.getElementById("statUsers").textContent = usersData.length;
  document.getElementById("statTickets").textContent = ticketsData.length;
  document.getElementById("statDraws").textContent = draws.length;
}

/* ---------- Users table ---------- */

function renderUsers() {
  const T = t();
  const body = document.getElementById("usersTableBody");
  const empty = document.getElementById("usersEmpty");
  body.innerHTML = "";
  if (usersData.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  usersData.forEach((u) => {
    const tr = document.createElement("tr");
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
    tr.innerHTML = `
      <td>${u.email}</td>
      <td>${name}</td>
      <td>${u.city || "—"}</td>
      <td>${formatDate(u.createdAt)}</td>
      <td>${u.ticketCount}</td>
      <td>${u.isAdmin ? "✅" : "—"}</td>
    `;
    body.appendChild(tr);
  });
  document.getElementById("statUsers").textContent = usersData.length;
}

/* ---------- Draw add form ---------- */

function renderDrawGameSwitch() {
  const T = t();
  const container = document.getElementById("drawGameSwitch");
  container.innerHTML = "";
  GAME_ORDER.forEach((id) => {
    const spec = GAME_SPECS[id];
    const info = T.games[id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "game-card" + (id === drawGameId.value ? " active" : "");
    btn.style.setProperty("--game-from", spec.colorFrom);
    btn.style.setProperty("--game-to", spec.colorTo);
    btn.innerHTML = `<span class="game-badge">${spec.mono}</span><span class="game-name">${info.name}</span>`;
    btn.addEventListener("click", () => {
      drawGameId.value = id;
      drawMain.clear();
      drawBonus.clear();
      renderDrawGameSwitch();
      applyDrawLayout();
    });
    container.appendChild(btn);
  });
}

function updateDrawCounts() {
  const T = t();
  const spec = GAME_SPECS[drawGameId.value];
  document.getElementById("drawMainCount").textContent = T.countLabel(drawMain.size, spec.mainCount);
  if (spec.bonusCount > 0) {
    document.getElementById("drawBonusCount").textContent = T.countLabel(drawBonus.size, spec.bonusCount);
  }
}

function applyDrawLayout() {
  const T = t();
  const spec = GAME_SPECS[drawGameId.value];
  buildBallGrid(document.getElementById("drawMainGrid"), spec.mainMin, spec.mainMax, spec.mainCount, drawMain, updateDrawCounts);

  const bonusSection = document.querySelector("#adminPanel .bonus-section");
  if (spec.bonusCount > 0) {
    bonusSection.hidden = false;
    buildBallGrid(document.getElementById("drawBonusGrid"), spec.bonusMin, spec.bonusMax, spec.bonusCount, drawBonus, updateDrawCounts);
    document.getElementById("drawBonusLabel").textContent = T.games[drawGameId.value].bonusLabel;
  } else {
    bonusSection.hidden = true;
    document.getElementById("drawBonusGrid").innerHTML = "";
  }
  updateDrawCounts();
  document.getElementById("drawWarning").hidden = true;
}

async function addDraw() {
  const T = t();
  const spec = GAME_SPECS[drawGameId.value];
  const dateVal = document.getElementById("drawDateInput").value;
  const warn = document.getElementById("drawWarning");

  if (drawMain.size !== spec.mainCount || drawBonus.size !== spec.bonusCount || !dateVal) {
    warn.textContent = T.tickets.ticketIncompleteWarning;
    warn.hidden = false;
    return;
  }
  warn.hidden = true;

  const { ok } = await api("api/admin/draws.php", {
    method: "POST",
    body: JSON.stringify({
      gameId: drawGameId.value,
      main: [...drawMain].sort((a, b) => a - b),
      bonus: [...drawBonus].sort((a, b) => a - b),
      drawDate: dateVal
    })
  });
  if (!ok) return;

  drawMain.clear();
  drawBonus.clear();
  applyDrawLayout();
  document.getElementById("drawDateInput").value = "";
  await loadDraws();
  renderStats();
}

async function removeDraw(id) {
  await api(`api/admin/draws.php?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  await loadDraws();
  renderStats();
}

/* ---------- Draws table ---------- */

function renderDraws() {
  const T = t();
  const body = document.getElementById("drawsTableBody");
  const empty = document.getElementById("drawsEmpty");
  body.innerHTML = "";
  if (draws.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  draws.forEach((d) => {
    const info = T.games[d.gameId];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${info ? info.name : d.gameId}</td>
      <td>${numbersToText(d.main, d.bonus)}</td>
      <td>${formatDate(d.drawDate)}</td>
      <td></td>
    `;
    const delBtn = document.createElement("button");
    delBtn.className = "btn-sm danger";
    delBtn.type = "button";
    delBtn.textContent = T.admin.deleteLabel;
    delBtn.addEventListener("click", () => removeDraw(d.id));
    tr.lastElementChild.appendChild(delBtn);
    body.appendChild(tr);
  });
}

/* ---------- Latest draw per game + ticket status ---------- */

function latestDrawByGame() {
  const map = {};
  draws.forEach((d) => {
    const current = map[d.gameId];
    if (!current || d.drawDate > current.drawDate) {
      map[d.gameId] = d;
    }
  });
  return map;
}

function renderTickets() {
  const T = t();
  const body = document.getElementById("ticketsTableBody");
  const empty = document.getElementById("ticketsEmpty");
  body.innerHTML = "";
  if (ticketsData.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const latest = latestDrawByGame();

  ticketsData.forEach((ticket) => {
    const spec = GAME_SPECS[ticket.gameId];
    const info = T.games[ticket.gameId];
    const draw = latest[ticket.gameId];

    let statusHtml = `<span class="status-pill pending">${T.admin.statusPending}</span>`;
    if (draw) {
      const mainMatches = ticket.main.filter((n) => draw.main.includes(n));
      const bonusMatches = ticket.bonus.filter((n) => draw.bonus.includes(n));
      const tier = findTier(spec, mainMatches.length, bonusMatches.length);
      statusHtml = tier
        ? `<span class="status-pill win">${T.admin.statusWin}</span>`
        : `<span class="status-pill loss">${T.admin.statusLoss}</span>`;
    }

    const name = [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(" ") || ticket.user.email;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${name}</td>
      <td>${info ? info.name : ticket.gameId}</td>
      <td>${numbersToText(ticket.main, ticket.bonus)}</td>
      <td>${formatDate(ticket.createdAt)}</td>
      <td>${statusHtml}</td>
    `;
    body.appendChild(tr);
  });
}

/* ---------- Page bootstrap ---------- */

async function applyAdminTranslations() {
  const T = t();
  document.title = T.admin.title;
  document.documentElement.lang = lang === "be" ? "nl" : lang;
  applyDataI18n(T);
  setFooterYear(T);
  setActiveNav();
  setActiveLangButtons(lang);
  renderFooterGamesList(T);

  const isAdmin = await checkAccess();
  if (isAdmin) {
    renderDrawGameSwitch();
    applyDrawLayout();
    await loadAll();
  }
}

function setAdminLang(newLang) {
  lang = newLang;
  applyAdminTranslations();
}

function initAdmin() {
  bindLangButtons(setAdminLang);
  bindMobileNav();
  document.getElementById("addDrawBtn").addEventListener("click", addDraw);
  applyAdminTranslations();
}

document.addEventListener("DOMContentLoaded", initAdmin);
