let lang = getStoredLang();
let draws = [];
let ticketsData = [];
let usersData = [];
let currentUserEmail = null;
let editingDrawId = null;
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

function formatMoney(amount) {
  const locales = { de: "de-DE", fr: "fr-FR", nl: "nl-NL", be: "nl-BE" };
  return new Intl.NumberFormat(locales[lang] || "de-DE", { style: "currency", currency: "EUR" }).format(amount);
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
  currentUserEmail = data.user.email;
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
      <td></td>
    `;
    if (u.email !== currentUserEmail) {
      const delBtn = document.createElement("button");
      delBtn.className = "btn-sm danger";
      delBtn.type = "button";
      delBtn.textContent = T.admin.deleteUserLabel;
      delBtn.addEventListener("click", () => deleteUser(u.id));
      tr.lastElementChild.appendChild(delBtn);
    }
    body.appendChild(tr);
  });
  document.getElementById("statUsers").textContent = usersData.length;
}

async function createUser() {
  const T = t();
  const warn = document.getElementById("newUserWarning");
  warn.hidden = true;

  const payload = {
    email: document.getElementById("newUserEmail").value.trim(),
    password: document.getElementById("newUserPassword").value,
    firstName: document.getElementById("newUserFirstName").value.trim(),
    lastName: document.getElementById("newUserLastName").value.trim(),
    address: document.getElementById("newUserAddress").value.trim(),
    postalCode: document.getElementById("newUserPostalCode").value.trim(),
    city: document.getElementById("newUserCity").value.trim(),
    isAdmin: document.getElementById("newUserIsAdmin").checked
  };

  const { ok, data } = await api("api/admin/users.php", { method: "POST", body: JSON.stringify(payload) });
  if (!ok) {
    const map = {
      invalid_email: T.depot.errorInvalidEmail,
      password_too_short: T.depot.errorPasswordShort,
      email_taken: T.depot.errorEmailTaken
    };
    warn.textContent = map[data.error] || T.depot.errorGeneric;
    warn.hidden = false;
    return;
  }

  ["newUserEmail", "newUserPassword", "newUserFirstName", "newUserLastName", "newUserAddress", "newUserPostalCode", "newUserCity"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("newUserIsAdmin").checked = false;

  await loadUsers();
  renderStats();
}

async function deleteUser(id) {
  const T = t();
  if (!confirm(T.admin.deleteUserConfirm)) return;
  const { ok, data } = await api(`api/admin/users.php?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!ok && data.error === "cannot_delete_self") {
    alert(T.admin.errorCannotDeleteSelf);
    return;
  }
  await loadUsers();
  await loadTickets();
  renderStats();
}

/* ---------- Draw add/edit form ---------- */

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

function startEditDraw(draw) {
  editingDrawId = draw.id;
  drawGameId.value = draw.gameId;
  drawMain.clear();
  draw.main.forEach((n) => drawMain.add(n));
  drawBonus.clear();
  (draw.bonus || []).forEach((n) => drawBonus.add(n));
  renderDrawGameSwitch();
  applyDrawLayout();
  document.getElementById("drawDateInput").value = draw.drawDate;
  updateDrawFormMode();
  document.getElementById("drawFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditDraw() {
  editingDrawId = null;
  drawMain.clear();
  drawBonus.clear();
  applyDrawLayout();
  document.getElementById("drawDateInput").value = "";
  updateDrawFormMode();
}

function updateDrawFormMode() {
  const T = t();
  const isEditing = editingDrawId !== null;
  document.getElementById("drawFormTitle").textContent = isEditing ? T.admin.editDrawLabel : T.admin.addDrawTitle;
  document.getElementById("editingDrawNote").hidden = !isEditing;
  document.getElementById("addDrawBtn").textContent = isEditing ? T.admin.updateDrawButton : T.admin.addDrawButton;
  document.getElementById("cancelEditDrawBtn").hidden = !isEditing;
}

async function saveDraw() {
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

  const payload = {
    gameId: drawGameId.value,
    main: [...drawMain].sort((a, b) => a - b),
    bonus: [...drawBonus].sort((a, b) => a - b),
    drawDate: dateVal
  };

  const { ok } = editingDrawId
    ? await api(`api/admin/draws.php?id=${encodeURIComponent(editingDrawId)}`, { method: "PUT", body: JSON.stringify(payload) })
    : await api("api/admin/draws.php", { method: "POST", body: JSON.stringify(payload) });

  if (!ok) return;

  editingDrawId = null;
  drawMain.clear();
  drawBonus.clear();
  applyDrawLayout();
  document.getElementById("drawDateInput").value = "";
  updateDrawFormMode();
  await loadDraws();
  renderStats();
}

async function removeDraw(id) {
  await api(`api/admin/draws.php?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (editingDrawId === id) cancelEditDraw();
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
    const editBtn = document.createElement("button");
    editBtn.className = "btn-sm";
    editBtn.type = "button";
    editBtn.textContent = T.admin.editDrawLabel;
    editBtn.style.marginRight = "0.5rem";
    editBtn.addEventListener("click", () => startEditDraw(d));
    const delBtn = document.createElement("button");
    delBtn.className = "btn-sm danger";
    delBtn.type = "button";
    delBtn.textContent = T.admin.deleteLabel;
    delBtn.addEventListener("click", () => removeDraw(d.id));
    tr.lastElementChild.appendChild(editBtn);
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

async function setTicketStatus(id, status) {
  await api("api/admin/tickets.php", { method: "PATCH", body: JSON.stringify({ id, status }) });
  await loadTickets();
}

function toDateInputValue(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value || "");
  return match ? match[1] : "";
}

async function saveTicketEdit(ticket, main, bonus, dateVal, priceVal, wonAmountVal, warnEl) {
  const T = t();
  const spec = GAME_SPECS[ticket.gameId];
  const priceNum = Number(priceVal);
  if (main.size !== spec.mainCount || bonus.size !== spec.bonusCount || !dateVal || !priceVal || Number.isNaN(priceNum) || priceNum < 0) {
    warnEl.textContent = T.tickets.ticketIncompleteWarning;
    warnEl.hidden = false;
    return;
  }
  warnEl.hidden = true;
  await api(`api/admin/tickets.php?id=${encodeURIComponent(ticket.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      main: [...main].sort((a, b) => a - b),
      bonus: [...bonus].sort((a, b) => a - b),
      playedDate: dateVal,
      price: priceNum,
      wonAmount: wonAmountVal === "" ? null : Number(wonAmountVal)
    })
  });
  await loadTickets();
}

function buildTicketEditRow(ticket, spec, T) {
  const tr = document.createElement("tr");
  tr.hidden = true;
  const td = document.createElement("td");
  td.colSpan = 8;

  const note = document.createElement("p");
  note.className = "hint";
  note.textContent = T.admin.editingTicketNote;
  td.appendChild(note);

  const editMain = new Set(ticket.main);
  const editBonus = new Set(ticket.bonus);

  const mainLabel = document.createElement("div");
  mainLabel.className = "group-label";
  mainLabel.innerHTML = `<span>${T.mainNumbersLabel}</span><span class="count">${T.countLabel(editMain.size, spec.mainCount)}</span>`;
  td.appendChild(mainLabel);

  const mainGrid = document.createElement("div");
  mainGrid.className = "grid";
  td.appendChild(mainGrid);
  buildBallGrid(mainGrid, spec.mainMin, spec.mainMax, spec.mainCount, editMain, () => {
    mainLabel.querySelector(".count").textContent = T.countLabel(editMain.size, spec.mainCount);
  });

  if (spec.bonusCount > 0) {
    const bonusLabel = document.createElement("div");
    bonusLabel.className = "group-label";
    bonusLabel.innerHTML = `<span>${T.games[ticket.gameId].bonusLabel}</span><span class="count">${T.countLabel(editBonus.size, spec.bonusCount)}</span>`;
    td.appendChild(bonusLabel);
    const bonusGrid = document.createElement("div");
    bonusGrid.className = "grid grid-bonus";
    td.appendChild(bonusGrid);
    buildBallGrid(bonusGrid, spec.bonusMin, spec.bonusMax, spec.bonusCount, editBonus, () => {
      bonusLabel.querySelector(".count").textContent = T.countLabel(editBonus.size, spec.bonusCount);
    });
  }

  const dateRow = document.createElement("div");
  dateRow.className = "ticket-form-row";
  dateRow.style.marginTop = "1rem";
  const dateField = document.createElement("div");
  dateField.className = "field";
  const dateLabel = document.createElement("label");
  dateLabel.textContent = T.admin.playedDateLabel;
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = toDateInputValue(ticket.createdAt);
  dateField.appendChild(dateLabel);
  dateField.appendChild(dateInput);
  dateRow.appendChild(dateField);

  const priceField = document.createElement("div");
  priceField.className = "field";
  const priceLabel = document.createElement("label");
  priceLabel.textContent = T.admin.priceLabel;
  const priceInput = document.createElement("input");
  priceInput.type = "number";
  priceInput.min = "0";
  priceInput.step = "0.01";
  priceInput.value = ticket.price;
  priceField.appendChild(priceLabel);
  priceField.appendChild(priceInput);
  dateRow.appendChild(priceField);

  const wonField = document.createElement("div");
  wonField.className = "field";
  const wonLabel = document.createElement("label");
  wonLabel.textContent = T.admin.wonAmountLabel;
  const wonInput = document.createElement("input");
  wonInput.type = "number";
  wonInput.min = "0";
  wonInput.step = "0.01";
  wonInput.value = ticket.wonAmount === null || ticket.wonAmount === undefined ? "" : ticket.wonAmount;
  wonField.appendChild(wonLabel);
  wonField.appendChild(wonInput);
  dateRow.appendChild(wonField);

  td.appendChild(dateRow);

  const warn = document.createElement("p");
  warn.className = "warning";
  warn.hidden = true;
  td.appendChild(warn);

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.style.justifyContent = "flex-start";
  actions.style.marginTop = "1rem";
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-primary";
  saveBtn.type = "button";
  saveBtn.textContent = T.admin.updateTicketButton;
  saveBtn.addEventListener("click", () => saveTicketEdit(ticket, editMain, editBonus, dateInput.value, priceInput.value, wonInput.value, warn));
  actions.appendChild(saveBtn);
  td.appendChild(actions);

  tr.appendChild(td);
  return tr;
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

    let isWin = null;
    let manual = false;
    if (ticket.statusOverride === "win" || ticket.statusOverride === "loss") {
      isWin = ticket.statusOverride === "win";
      manual = true;
    } else {
      const draw = latest[ticket.gameId];
      if (draw) {
        const mainMatches = ticket.main.filter((n) => draw.main.includes(n));
        const bonusMatches = ticket.bonus.filter((n) => draw.bonus.includes(n));
        isWin = !!findTier(spec, mainMatches.length, bonusMatches.length);
      }
    }

    let statusHtml;
    if (isWin === null) {
      statusHtml = `<span class="status-pill pending">${T.admin.statusPending}</span>`;
    } else {
      statusHtml = `<span class="status-pill ${isWin ? "win" : "loss"}">${isWin ? T.admin.statusWin : T.admin.statusLoss}</span>`;
      if (manual) statusHtml += ` <span class="ticket-meta">(${T.admin.manualBadge})</span>`;
    }

    const name = [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(" ") || ticket.user.email;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${name}</td>
      <td>${info ? info.name : ticket.gameId}</td>
      <td>${numbersToText(ticket.main, ticket.bonus)}</td>
      <td>${formatDate(ticket.createdAt)}</td>
      <td>${formatMoney(ticket.price)}</td>
      <td>${ticket.wonAmount === null ? "—" : formatMoney(ticket.wonAmount)}</td>
      <td>${statusHtml}</td>
      <td></td>
    `;

    const editRow = buildTicketEditRow(ticket, spec, T);

    const editBtn = document.createElement("button");
    editBtn.className = "btn-sm";
    editBtn.type = "button";
    editBtn.textContent = T.admin.editTicketLabel;
    editBtn.style.marginRight = "0.4rem";
    editBtn.addEventListener("click", () => {
      editRow.hidden = !editRow.hidden;
    });

    const winBtn = document.createElement("button");
    winBtn.className = "btn-sm";
    winBtn.type = "button";
    winBtn.textContent = T.admin.markWinLabel;
    winBtn.addEventListener("click", () => setTicketStatus(ticket.id, "win"));

    const lossBtn = document.createElement("button");
    lossBtn.className = "btn-sm";
    lossBtn.type = "button";
    lossBtn.textContent = T.admin.markLossLabel;
    lossBtn.style.margin = "0 0.4rem";
    lossBtn.addEventListener("click", () => setTicketStatus(ticket.id, "loss"));

    const actionsCell = tr.lastElementChild;
    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(winBtn);
    actionsCell.appendChild(lossBtn);

    if (manual) {
      const resetBtn = document.createElement("button");
      resetBtn.className = "btn-sm";
      resetBtn.type = "button";
      resetBtn.textContent = T.admin.resetStatusLabel;
      resetBtn.addEventListener("click", () => setTicketStatus(ticket.id, null));
      actionsCell.appendChild(resetBtn);
    }

    body.appendChild(tr);
    body.appendChild(editRow);
  });
}

/* ---------- Page bootstrap ---------- */

async function applyAdminTranslations() {
  const T = t();
  document.title = `${T.brand} – ${T.admin.title}`;
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
    updateDrawFormMode();
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
  document.getElementById("addDrawBtn").addEventListener("click", saveDraw);
  document.getElementById("cancelEditDrawBtn").addEventListener("click", cancelEditDraw);
  document.getElementById("createUserBtn").addEventListener("click", createUser);
  applyAdminTranslations();
}

document.addEventListener("DOMContentLoaded", initAdmin);
