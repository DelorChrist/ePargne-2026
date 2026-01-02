// ================== CONFIGURATION GÉNÉRALE ==================
const YEAR = 2026;
const START_DATE = new Date(YEAR, 0, 1); // 1er janvier 2026
const END_DATE = new Date(YEAR, 11, 31); // 31 décembre 2026
const CYCLE_LENGTH = 10;
const BASE_AMOUNT = 100; // 100 F CFA
const STEP_AMOUNT = 100; // +100 F par jour
const GOAL_AMOUNT = 200000;

// Clé localStorage pour isoler les données de cette appli
const STORAGE_KEY = "epargne_2026_calendar";
const USER_NAME_KEY = "epargne_2026_user_name"; // pour le nom utilisateur [web:5][web:164]

// ================== ÉTAT EN MÉMOIRE ==================
const state = {
  currentMonth: 0, // 0 = janvier
  selectedDate: null, // string "YYYY-MM-DD"
  // Structure: { "YYYY-MM-DD": { amount: number, validated: boolean } }
  days: {},
  total: 0
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

// Retourne l'index du jour dans l'année 2026 (0 = 1er janvier)
function getDayIndexInYear(date) {
  if (date.getFullYear() !== YEAR) return -1;
  const diffMs = date.getTime() - START_DATE.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Vérifie que tous les jours avant "date" sont déjà validés
function canValidateDate(date) {
  const index = getDayIndexInYear(date);
  if (index <= 0) {
    // 1er janvier (index 0) est toujours validable
    return true;
  }
  for (let i = 0; i < index; i++) {
    const d = new Date(YEAR, 0, 1 + i);
    const key = formatDateKey(d);
    const info = state.days[key];
    if (!info || !info.validated) {
      return false;
    }
  }
  return true;
}

// ================== CALCUL COTISATION ==================
function getContributionAmount(date) {
  if (date < START_DATE || date > END_DATE || date.getFullYear() !== YEAR) {
    return 0;
  }

  const diffMs = date.getTime() - START_DATE.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // 0 pour 1er janvier
  const cyclePosition = (diffDays % CYCLE_LENGTH) + 1; // 1 à 10
  return BASE_AMOUNT + (cyclePosition - 1) * STEP_AMOUNT;
}

// ================== LOCAL STORAGE ==================
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      state.days = data.days || {};
      state.total = data.total || 0;
    }
  } catch (e) {
    console.error("Erreur de lecture localStorage", e);
  }
}

function saveToStorage() {
  const payload = {
    days: state.days,
    total: state.total
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("Erreur d'écriture localStorage", e);
  }
}

// ================== MISE À JOUR UI GLOBALE ==================
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

// Écran d'accueil / nom utilisateur
const userNameDisplayEl = document.getElementById("userNameDisplay");
const welcomeOverlayEl = document.getElementById("welcomeOverlay");
const userNameInputEl = document.getElementById("userNameInput");
const startAppBtnEl = document.getElementById("startAppBtn");

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre"
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatAmount(amount) {
  return (
    amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " F CFA"
  );
}

// ================== NOM UTILISATEUR ==================
function setUserName(name) {
  const cleanName = name && name.trim() ? name.trim() : "Invité";
  userNameDisplayEl.textContent = cleanName;
}

function showWelcomeOverlay() {
  welcomeOverlayEl.classList.remove("welcome-hidden");
}

function hideWelcomeOverlay() {
  welcomeOverlayEl.classList.add("welcome-hidden");
}

function handleStartApp() {
  const name = userNameInputEl.value.trim();
  if (!name) {
    alert("Merci de saisir ton nom pour personnaliser ton plan d'épargne.");
    return;
  }

  localStorage.setItem(USER_NAME_KEY, name);
  setUserName(name);
  hideWelcomeOverlay();
}

// ================== TOTAL & JOUR SÉLECTIONNÉ ==================
function updateTotalUI() {
  totalAmountEl.textContent = formatAmount(state.total);

  const progress = Math.min(
    100,
    Math.round((state.total / GOAL_AMOUNT) * 100)
  );
  progressBarEl.style.width = progress + "%";
  progressPercentEl.textContent = progress + " %";

  const remaining = Math.max(GOAL_AMOUNT - state.total, 0);
  remainingAmountEl.textContent =
    "Reste " + remaining.toLocaleString("fr-FR") + " F";
}

function updateSelectedDayUI() {
  if (!state.selectedDate) {
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
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  };
  const dateText = date.toLocaleDateString("fr-FR", options);

  selectedDateLabelEl.textContent = dateText;
  selectedAmountLabelEl.textContent = formatAmount(amount);
  selectedAmountTextEl.textContent = formatAmount(amount);

  const info = state.days[state.selectedDate];
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const isFuture = date > todayDate;

  if (info && info.validated) {
    selectedStatusBadgeEl.textContent = "Cotisation validée";
    selectedStatusBadgeEl.className = "status-badge status-ok";
    confirmBtnEl.disabled = true;
    cancelContributionBtnEl.disabled = false; // on peut annuler
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
  calendarGridEl.innerHTML = "";

  // Entêtes jours de la semaine
  WEEKDAYS.forEach((name) => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = name;
    calendarGridEl.appendChild(div);
  });

  const firstDayOfMonth = new Date(YEAR, state.currentMonth, 1);
  const lastDayOfMonth = new Date(YEAR, state.currentMonth + 1, 0);
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7; // Lundi=0, Dimanche=6

  monthLabelEl.textContent =
    MONTH_NAMES[state.currentMonth] + " " + YEAR;

  // Cases vides avant le 1er du mois
  for (let i = 0; i < firstWeekday; i++) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "day empty";
    calendarGridEl.appendChild(emptyDiv);
  }

  // Jours du mois
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

    const info = state.days[dateKey];
    if (info && info.validated) {
      dayDiv.classList.add("validated");
    }

    // Visuellement désactiver les jours non encore autorisés
    if (!canValidateDate(date) && !(info && info.validated)) {
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
      if (dayDiv.classList.contains("disabled") && !(info && info.validated)) {
        alert(
          "Vous ne pouvez pas encore sélectionner ce jour.\n" +
          "Cotisez d'abord tous les jours précédents."
        );
        return;
      }

      if (state.selectedDate === dateKey) {
        state.selectedDate = null;
      } else {
        state.selectedDate = dateKey;
      }
      updateSelectedDayUI();
      renderCalendar();
    });

    calendarGridEl.appendChild(dayDiv);
  }
}

// ================== ACTIONS ==================
function confirmContribution() {
  if (!state.selectedDate) return;
  const date = parseDateKey(state.selectedDate);
  const amount = getContributionAmount(date);
  const existing = state.days[state.selectedDate];

  if (existing && existing.validated) {
    // Sécurité : ne pas valider deux fois
    return;
  }

  // RÈGLE : progression étape par étape
  if (!canValidateDate(date)) {
    alert(
      "Vous ne pouvez pas valider ce jour.\n" +
      "Tous les jours précédents doivent être cotisés avant de passer à celui-ci."
    );
    return;
  }

  state.days[state.selectedDate] = {
    amount: amount,
    validated: true
  };
  state.total += amount;

  saveToStorage();
  updateTotalUI();
  updateSelectedDayUI();
  renderCalendar();
}

function cancelContribution() {
  if (!state.selectedDate) return;

  const info = state.days[state.selectedDate];
  if (!info || !info.validated) {
    return;
  }

  if (!confirm("Voulez-vous vraiment annuler cette cotisation ?")) {
    return;
  }

  state.total = Math.max(0, state.total - info.amount);
  delete state.days[state.selectedDate];

  saveToStorage();
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
  if (now.getFullYear() === YEAR) {
    state.currentMonth = now.getMonth();
  } else {
    state.currentMonth = 0;
  }
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

// ================== INITIALISATION ==================
function init() {
  loadFromStorage();
  updateTotalUI();

  // Gérer le nom utilisateur
  const storedName = localStorage.getItem(USER_NAME_KEY);
  if (storedName && storedName.trim()) {
    setUserName(storedName);
    hideWelcomeOverlay();
  } else {
    showWelcomeOverlay();
  }

  const now = new Date();
  if (now.getFullYear() === YEAR) {
    state.currentMonth = now.getMonth();
  } else {
    state.currentMonth = 0;
  }

  renderCalendar();
  updateSelectedDayUI();

  confirmBtnEl.addEventListener("click", confirmContribution);
  cancelContributionBtnEl.addEventListener("click", cancelContribution);
  unselectBtnEl.addEventListener("click", unselectDay);
  prevMonthBtnEl.addEventListener("click", goToPrevMonth);
  nextMonthBtnEl.addEventListener("click", goToNextMonth);
  todayBtnEl.addEventListener("click", goToTodayMonth);

  // Bouton "Commencer" de l'écran d'accueil
  startAppBtnEl.addEventListener("click", handleStartApp);

  // Valider avec Entrée dans le champ nom
  userNameInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleStartApp();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
