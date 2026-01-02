// ================== CONFIGURATION GÉNÉRALE ==================
const YEAR = 2026;
const START_DATE = new Date(YEAR, 0, 1);
const END_DATE = new Date(YEAR, 11, 31);
const CYCLE_LENGTH = 10;
const STEP_AMOUNT = 100;
const GOAL_AMOUNT = 200000;
const STORAGE_KEY = "epargne_2026_profiles";

// ================== ÉTAT EN MÉMOIRE ==================
const state = {
  currentMonth: 0,
  selectedDate: null,
  profiles: {},
  currentProfileId: null
};

// ================== OUTILS DE DATE ==================
function pad2(n) {
  return n.toString().padStart(2, "0");
}

function formatDateKey(date) {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate())
  ].join("-");
}

function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isToday(date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getDayIndexInYear(date) {
  if (date.getFullYear() !== YEAR) return -1;
  const diffMs = date.getTime() - START_DATE.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ================== GESTION PROFILS ==================
function getCurrentProfile() {
  if (!state.currentProfileId) return null;
  return state.profiles[state.currentProfileId] || null;
}

function normalizeProfileId(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

// ================== CALCUL COTISATION ==================
function getContributionAmount(date) {
  const profile = getCurrentProfile();
  if (!profile) return 0;

  if (date < START_DATE || date > END_DATE || date.getFullYear() !== YEAR) {
    return 0;
  }

  const baseAmount = profile.baseAmount || 100;
  const diffMs = date.getTime() - START_DATE.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const cyclePosition = (diffDays % CYCLE_LENGTH) + 1;
  return baseAmount + (cyclePosition - 1) * STEP_AMOUNT;
}

// ================== LOCAL STORAGE ==================
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state.profiles = {};
      state.currentProfileId = null;
      return;
    }
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      state.profiles = data.profiles || {};
      state.currentProfileId = data.currentProfileId || null; // on RESTAURE le client courant
    }
  } catch (e) {
    console.error("Erreur de lecture localStorage", e);
  }
}

function saveToStorage() {
  // NE SAUVE PAS LE PROFIL INVITÉ
  const profilesToSave = {};
  Object.values(state.profiles).forEach((p) => {
    if (p.id !== "guest") {
      profilesToSave[p.id] = p;
    }
  });

  const payload = {
    profiles: profilesToSave,
    currentProfileId: state.currentProfileId === "guest"
      ? null
      : state.currentProfileId
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("Erreur d'écriture localStorage", e);
  }
}

// ================== RÈGLE ORDRE DE COTISATION ==================
function canValidateDate(date) {
  const profile = getCurrentProfile();
  if (!profile) return false;

  const index = getDayIndexInYear(date);
  if (index <= 0) return true;

  for (let i = 0; i < index; i++) {
    const d = new Date(YEAR, 0, 1 + i);
    const key = formatDateKey(d);
    const info = profile.days[key];
    if (!info || !info.validated) {
      return false;
    }
  }
  return true;
}

// ================== DOM ELEMENTS ==================
const appRootEl = document.getElementById("appRoot");

const monthLabelEl = document.getElementById("monthLabel");
const calendarGridEl = document.getElementById("calendarGrid");
const totalAmountEl = document.getElementById("totalAmount");
const progressBarEl = document.getElementById("progressBar");
const progressPercentEl = document.getElementById("progressPercent");
const remainingAmountEl = document.getElementById("remainingAmount");
const selectedDateLabelEl = document.getElementById("selectedDateLabel");
const selectedAmountLabelEl = document.getElementById("selectedAmountLabel");
const selectedAmountTextEl = document.getElementById("selectedAmountText");
const selectedStatusBadgeEl = document.getElementById("selectedStatusBadge");
const confirmBtnEl = document.getElementById("confirmBtn");
const cancelContributionBtnEl = document.getElementById("cancelContributionBtn");
const unselectBtnEl = document.getElementById("unselectBtn");
const prevMonthBtnEl = document.getElementById("prevMonthBtn");
const nextMonthBtnEl = document.getElementById("nextMonthBtn");
const todayBtnEl = document.getElementById("todayBtn");
const currentProfileInfoEl = document.getElementById("currentProfileInfo");
const userNameDisplayEl = document.getElementById("userNameDisplay");
const userBaseAmountDisplayEl = document.getElementById("userBaseAmountDisplay");
const logoutBtnEl = document.getElementById("logoutBtn");
const switchToAuthBtnEl = document.getElementById("switchToAuthBtn");

// Auth / accueil
const authOverlayEl = document.getElementById("authOverlay");
const loginModeBtnEl = document.getElementById("loginModeBtn");
const signupModeBtnEl = document.getElementById("signupModeBtn");
const loginFormEl = document.getElementById("loginForm");
const signupFormEl = document.getElementById("signupForm");
const loginNameInputEl = document.getElementById("loginNameInput");
const loginPinInputEl = document.getElementById("loginPinInput");
const signupNameInputEl = document.getElementById("signupNameInput");
const signupPinInputEl = document.getElementById("signupPinInput");
const baseAmountInputEl = document.getElementById("baseAmountInput");
const loginBtnEl = document.getElementById("loginBtn");
const signupBtnEl = document.getElementById("signupBtn");
const guestBtnEl = document.getElementById("guestBtn");
const authErrorEl = document.getElementById("authError");
const closeAuthBtnEl = document.getElementById("closeAuthBtn");

// Overlay de bienvenue
const welcomeOverlayEl = document.getElementById("welcomeOverlay");
const welcomeTitleEl = document.getElementById("welcomeTitle");
const welcomeMessageEl = document.getElementById("welcomeMessage");
const welcomeContinueBtnEl = document.getElementById("welcomeContinueBtn");

// ================== UTILS ==================
const MONTH_NAMES = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
];

const WEEKDAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

function formatAmount(amount) {
  return amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " F CFA";
}

// ================== AFFICHAGE APP / OVERLAYS ==================
function showApp() {
  appRootEl.classList.remove("app-hidden");
}

function hideApp() {
  appRootEl.classList.add("app-hidden");
}

function showAuthOverlay() {
  authOverlayEl.classList.remove("welcome-hidden");
}

function hideAuthOverlay() {
  authOverlayEl.classList.add("welcome-hidden");
  setAuthError("");
}

function showWelcomeMessage(type) {
  const profile = getCurrentProfile();
  if (!profile || profile.id === "guest") return;

  if (type === "signup") {
    welcomeTitleEl.textContent = "Bienvenue " + profile.name;
    welcomeMessageEl.textContent =
      "Ton plan d'épargne est créé avec un montant de départ de " +
      profile.baseAmount.toLocaleString("fr-FR") +
      " F. Tu peux commencer à cotiser jour après jour.";
  } else if (type === "login") {
    welcomeTitleEl.textContent = "Bon retour " + profile.name;
    welcomeMessageEl.textContent =
      "Tu peux reprendre ta cotisation exactement là où tu t'es arrêté.";
  } else {
    return;
  }

  welcomeOverlayEl.classList.remove("welcome-hidden");
  hideApp();
}

function hideWelcomeMessage() {
  welcomeOverlayEl.classList.add("welcome-hidden");
  showApp();
}

function setAuthError(message) {
  authErrorEl.textContent = message;
  authErrorEl.style.display = message ? "block" : "none";
}

// ================== NOM & PROFIL COURANT + BOUTONS ==================
function updateProfileHeader() {
  const profile = getCurrentProfile();

  if (!profile || profile.id === "guest") {
    userNameDisplayEl.textContent = "Invité";
    userBaseAmountDisplayEl.textContent = profile ? "(mode invité)" : "";
    currentProfileInfoEl.textContent = "Invité (aucune sauvegarde)";
    logoutBtnEl.style.display = "none";
    switchToAuthBtnEl.style.display = "inline-flex";
    return;
  }

  userNameDisplayEl.textContent = profile.name;
  userBaseAmountDisplayEl.textContent =
    "(départ " + profile.baseAmount.toLocaleString("fr-FR") + " F)";
  currentProfileInfoEl.textContent =
    profile.name + " | départ " + profile.baseAmount.toLocaleString("fr-FR") + " F";

  logoutBtnEl.style.display = "inline-flex";
  switchToAuthBtnEl.style.display = "none";
}

// ================== TOTAL & JOUR SÉLECTIONNÉ ==================
function updateTotalUI() {
  const profile = getCurrentProfile();
  const total = profile ? profile.total : 0;

  totalAmountEl.textContent = formatAmount(total);

  const progress = Math.min(100, Math.round((total / GOAL_AMOUNT) * 100));
  progressBarEl.style.width = progress + "%";
  progressPercentEl.textContent = progress + " %";

  const remaining = Math.max(GOAL_AMOUNT - total, 0);
  remainingAmountEl.textContent =
    "Reste " + remaining.toLocaleString("fr-FR") + " F";
}

function updateSelectedDayUI() {
  const profile = getCurrentProfile();

  if (!state.selectedDate || !profile) {
    selectedDateLabelEl.textContent = "Aucun jour sélectionné";
    selectedAmountLabelEl.textContent = "0 F CFA";
    selectedAmountTextEl.textContent = "—";
    selectedStatusBadgeEl.textContent = "Aucun";
    selectedStatusBadgeEl.className = "status-badge status-future";
    confirmBtnEl.disabled = true;
    cancelContributionBtnEl.disabled = true;
    return;
  }

  const date = parseDateKey(state.selectedDate);
  const amount = getContributionAmount(date);
  const options = {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  };
  selectedDateLabelEl.textContent = date.toLocaleDateString("fr-FR", options);
  selectedAmountLabelEl.textContent = formatAmount(amount);
  selectedAmountTextEl.textContent = formatAmount(amount);

  const info = profile.days[state.selectedDate];
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);
  const isFuture = date > todayDate;

  if (info && info.validated) {
    selectedStatusBadgeEl.textContent = "Cotisation validée";
    selectedStatusBadgeEl.className = "status-badge status-ok";
    confirmBtnEl.disabled = true;
    cancelContributionBtnEl.disabled = false;
  } else if (isFuture) {
    selectedStatusBadgeEl.textContent = "Jour futur";
    selectedStatusBadgeEl.className = "status-badge status-future";
    confirmBtnEl.disabled = false;
    cancelContributionBtnEl.disabled = true;
  } else {
    selectedStatusBadgeEl.textContent = "En attente";
    selectedStatusBadgeEl.className = "status-badge status-pending";
    confirmBtnEl.disabled = false;
    cancelContributionBtnEl.disabled = true;
  }
}

// ================== RENDU DU CALENDRIER ==================
function renderCalendar() {
  const profile = getCurrentProfile();
  calendarGridEl.innerHTML = "";

  WEEKDAYS.forEach((name) => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = name;
    calendarGridEl.appendChild(div);
  });

  const firstDayOfMonth = new Date(YEAR, state.currentMonth, 1);
  const lastDayOfMonth = new Date(YEAR, state.currentMonth + 1, 0);
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;

  monthLabelEl.textContent = MONTH_NAMES[state.currentMonth] + " " + YEAR;

  for (let i = 0; i < firstWeekday; i++) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "day empty";
    calendarGridEl.appendChild(emptyDiv);
  }

  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const date = new Date(YEAR, state.currentMonth, d);
    const dateKey = formatDateKey(date);
    const amount = getContributionAmount(date);

    const dayDiv = document.createElement("div");
    dayDiv.className = "day";
    dayDiv.dataset.date = dateKey;

    if (isToday(date)) {
      dayDiv.classList.add("current");
    }

    if (state.selectedDate === dateKey) {
      dayDiv.classList.add("selected");
    }

    const profileData = profile ? profile.days[dateKey] : null;
    if (profileData && profileData.validated) {
      dayDiv.classList.add("validated");
    }

    if (!canValidateDate(date) && !(profileData && profileData.validated)) {
      dayDiv.classList.add("disabled");
    }

    const numSpan = document.createElement("div");
    numSpan.className = "day-number";
    numSpan.textContent = d;

    const amountSpan = document.createElement("div");
    amountSpan.className = "day-amount";
    amountSpan.textContent = amount + " F";

    dayDiv.appendChild(numSpan);
    dayDiv.appendChild(amountSpan);

    dayDiv.addEventListener("click", () => {
      if (!profile) return;

      if (dayDiv.classList.contains("disabled") && !(profileData && profileData.validated)) {
        alert(
          "Vous ne pouvez pas encore sélectionner ce jour.\n" +
          "Cotisez d'abord tous les jours précédents."
        );
        return;
      }

      state.selectedDate = (state.selectedDate === dateKey) ? null : dateKey;
      updateSelectedDayUI();
      renderCalendar();
    });

    calendarGridEl.appendChild(dayDiv);
  }
}

// ================== ACTIONS CALENDRIER ==================
function confirmContribution() {
  const profile = getCurrentProfile();
  if (!state.selectedDate || !profile) return;

  const date = parseDateKey(state.selectedDate);
  const amount = getContributionAmount(date);
  const existing = profile.days[state.selectedDate];

  if (existing && existing.validated) return;

  if (!canValidateDate(date)) {
    alert(
      "Vous ne pouvez pas valider ce jour.\n" +
      "Tous les jours précédents doivent être cotisés avant de passer à celui-ci."
    );
    return;
  }

  profile.days[state.selectedDate] = { amount, validated: true };
  profile.total += amount;

  if (profile.id !== "guest") {
    saveToStorage();
  }

  updateTotalUI();
  updateSelectedDayUI();
  renderCalendar();
}

function cancelContribution() {
  const profile = getCurrentProfile();
  if (!state.selectedDate || !profile) return;

  const info = profile.days[state.selectedDate];
  if (!info || !info.validated) return;

  if (!confirm("Voulez-vous vraiment annuler cette cotisation ?")) return;

  profile.total = Math.max(0, profile.total - info.amount);
  delete profile.days[state.selectedDate];

  if (profile.id !== "guest") {
    saveToStorage();
  }

  updateTotalUI();
  updateSelectedDayUI();
  renderCalendar();
}

function unselectDay() {
  state.selectedDate = null;
  updateSelectedDayUI();
  renderCalendar();
}

function goToTodayMonth() {
  const now = new Date();
  state.currentMonth = (now.getFullYear() === YEAR) ? now.getMonth() : 0;
  renderCalendar();
}

function goToPrevMonth() {
  state.currentMonth = (state.currentMonth - 1 + 12) % 12;
  renderCalendar();
}

function goToNextMonth() {
  state.currentMonth = (state.currentMonth + 1) % 12;
  renderCalendar();
}

// ================== AUTH / PROFILS ==================
function switchToLoginMode() {
  loginModeBtnEl.classList.add("auth-toggle-btn-active");
  signupModeBtnEl.classList.remove("auth-toggle-btn-active");
  loginFormEl.classList.remove("auth-form-hidden");
  signupFormEl.classList.add("auth-form-hidden");
  setAuthError("");
}

function switchToSignupMode() {
  signupModeBtnEl.classList.add("auth-toggle-btn-active");
  loginModeBtnEl.classList.remove("auth-toggle-btn-active");
  signupFormEl.classList.remove("auth-form-hidden");
  loginFormEl.classList.add("auth-form-hidden");
  setAuthError("");
}

function handleSignup() {
  const name = signupNameInputEl.value.trim();
  const pin = signupPinInputEl.value.trim();
  let baseAmount = parseInt(baseAmountInputEl.value.trim(), 10);

  if (!name) {
    setAuthError("Merci de saisir ton nom.");
    return;
  }
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    setAuthError("Le PIN doit contenir exactement 4 chiffres.");
    return;
  }
  if (isNaN(baseAmount) || baseAmount < 100) {
    setAuthError("Le montant de départ doit être au minimum 100 F.");
    return;
  }

  baseAmount = Math.round(baseAmount / 100) * 100;

  const profileId = normalizeProfileId(name);
  if (state.profiles[profileId]) {
    setAuthError("Un profil avec ce nom existe déjà. Essaie un autre nom ou connecte-toi.");
    return;
  }

  state.profiles[profileId] = {
    id: profileId,
    name,
    pin,
    baseAmount,
    days: {},
    total: 0
  };
  state.currentProfileId = profileId;
  state.selectedDate = null;

  saveToStorage();
  updateProfileHeader();
  updateTotalUI();
  renderCalendar();
  updateSelectedDayUI();
  hideAuthOverlay();
  showWelcomeMessage("signup");
}

function handleLogin() {
  const name = loginNameInputEl.value.trim();
  const pin = loginPinInputEl.value.trim();

  if (!name || !pin) {
    setAuthError("Merci de saisir ton nom et ton PIN.");
    return;
  }
  const profileId = normalizeProfileId(name);
  const profile = state.profiles[profileId];

  if (!profile) {
    setAuthError("Aucun profil trouvé avec ce nom. Crée un profil d'abord.");
    return;
  }
  if (profile.pin !== pin) {
    setAuthError("PIN incorrect.");
    return;
  }

  state.currentProfileId = profileId;
  state.selectedDate = null;

  saveToStorage();
  updateProfileHeader();
  updateTotalUI();
  renderCalendar();
  updateSelectedDayUI();
  hideAuthOverlay();
  showWelcomeMessage("login");
}

function loginAsGuest() {
  const profileId = "guest";

  state.profiles[profileId] = {
    id: profileId,
    name: "Invité",
    pin: null,
    baseAmount: 100,
    days: {},
    total: 0
  };

  state.currentProfileId = profileId;
  state.selectedDate = null;

  // pas de saveToStorage pour l'invité
  updateProfileHeader();
  updateTotalUI();
  renderCalendar();
  updateSelectedDayUI();

  hideAuthOverlay();
  hideWelcomeMessage();
  showApp();
}

function logout() {
  state.currentProfileId = null;
  state.selectedDate = null;

  saveToStorage();
  updateProfileHeader();
  updateTotalUI();
  renderCalendar();
  updateSelectedDayUI();
  hideApp();
  showAuthOverlay();
}

function switchFromGuestToAuth() {
  hideApp();
  hideWelcomeMessage();
  showAuthOverlay();
}

function closeAuthOverlayIfPossible() {
  if (getCurrentProfile()) {
    hideAuthOverlay();
    hideWelcomeMessage();
    showApp();
  } else {
    alert("Tu dois d'abord te connecter, créer un profil ou continuer en invité.");
  }
}

// ================== INITIALISATION ==================
function init() {
  loadFromStorage();

  const now = new Date();
  state.currentMonth = (now.getFullYear() === YEAR) ? now.getMonth() : 0;

  updateProfileHeader();
  updateTotalUI();
  renderCalendar();
  updateSelectedDayUI();

  const profile = getCurrentProfile();
  if (profile && profile.id !== "guest") {
    // client déjà connecté avant le refresh
    hideAuthOverlay();
    hideWelcomeMessage();
    showApp();
  } else {
    // pas de client, ou invité => on reste sur la page de connexion
    showAuthOverlay();
    hideApp();
  }

  confirmBtnEl.addEventListener("click", confirmContribution);
  cancelContributionBtnEl.addEventListener("click", cancelContribution);
  unselectBtnEl.addEventListener("click", unselectDay);
  prevMonthBtnEl.addEventListener("click", goToPrevMonth);
  nextMonthBtnEl.addEventListener("click", goToNextMonth);
  todayBtnEl.addEventListener("click", goToTodayMonth);

  loginModeBtnEl.addEventListener("click", switchToLoginMode);
  signupModeBtnEl.addEventListener("click", switchToSignupMode);

  signupBtnEl.addEventListener("click", handleSignup);
  signupNameInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSignup(); }
  });
  signupPinInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSignup(); }
  });
  baseAmountInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSignup(); }
  });

  loginBtnEl.addEventListener("click", handleLogin);
  loginNameInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleLogin(); }
  });
  loginPinInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleLogin(); }
  });

  guestBtnEl.addEventListener("click", loginAsGuest);
  logoutBtnEl.addEventListener("click", logout);
  switchToAuthBtnEl.addEventListener("click", switchFromGuestToAuth);
  closeAuthBtnEl.addEventListener("click", closeAuthOverlayIfPossible);
  welcomeContinueBtnEl.addEventListener("click", hideWelcomeMessage);
}

document.addEventListener("DOMContentLoaded", init);
