let siteLang = getStoredLang();

function renderJackpotGrid(T) {
  const grid = document.getElementById("jackpotGrid");
  if (!grid) return;
  grid.innerHTML = "";
  GAME_ORDER.forEach((id) => {
    const spec = GAME_SPECS[id];
    const info = T.games[id];
    const card = document.createElement("a");
    card.className = "jackpot-card";
    card.href = `checker.html?game=${id}`;
    card.style.setProperty("--card-from", spec.colorFrom);
    card.style.setProperty("--card-to", spec.colorTo);
    card.style.setProperty("--card-color", spec.colorTo);
    card.innerHTML = `
      <div class="jackpot-card-top">
        <span class="jackpot-badge">${spec.mono}</span>
        <div>
          <h3>${info.name}</h3>
          <div class="jackpot-format">${gameFormatLabel(T, id)}</div>
        </div>
      </div>
      <div class="jackpot-amount-row">
        <p class="jackpot-amount-label">${T.home.jackpotLabel} *</p>
        <div class="jackpot-amount">${formatJackpot(siteLang, spec.jackpot)}</div>
      </div>
      <div class="jackpot-cta">${T.home.ctaPrimary} →</div>
    `;
    grid.appendChild(card);
  });
}

function applySiteTranslations() {
  const T = I18N[siteLang];
  document.title = T.home && T.home.heroTitle ? T.home.heroTitle : T.pageTitle;
  document.documentElement.lang = siteLang === "be" ? "nl" : siteLang;
  applyDataI18n(T);
  setFooterYear(T);
  setActiveNav();
  setActiveLangButtons(siteLang);
  renderJackpotGrid(T);
  renderFooterGamesList(T);
}

function setSiteLang(lang) {
  siteLang = lang;
  applySiteTranslations();
}

function initSite() {
  bindLangButtons(setSiteLang);
  bindMobileNav();
  applySiteTranslations();
}

document.addEventListener("DOMContentLoaded", initSite);
