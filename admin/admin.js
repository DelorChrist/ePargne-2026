const STORAGE_KEY = "epargne_2026_profiles";

const adminTotalProfilesEl = document.getElementById("adminTotalProfiles");
const adminGlobalTotalEl = document.getElementById("adminGlobalTotal");
const adminUsersContainerEl = document.getElementById("adminUsersContainer");
const adminBackBtnEl = document.getElementById("adminBackBtn");
const adminLogoutBtnEl = document.getElementById("adminLogoutBtn");

function loadProfilesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { profiles: {}, currentProfileId: null };
    }
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      return {
        profiles: data.profiles || {},
        currentProfileId: data.currentProfileId || null
      };
    }
  } catch (e) {
    console.error("Erreur lecture localStorage admin", e);
  }
  return { profiles: {}, currentProfileId: null };
}

function saveProfilesToStorage(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("Erreur écriture localStorage admin", e);
  }
}

function formatAmount(amount) {
  return amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " F";
}

function renderAdminUsers() {
  const data = loadProfilesFromStorage();
  const profilesObj = data.profiles || {};
  const profiles = Object.values(profilesObj);

  adminUsersContainerEl.innerHTML = "";

  if (profiles.length === 0) {
    adminUsersContainerEl.textContent = "Aucun client enregistré pour l'instant.";
    adminTotalProfilesEl.textContent = "0";
    adminGlobalTotalEl.textContent = "0 F";
    return;
  }

  adminTotalProfilesEl.textContent = String(profiles.length);

  let globalTotal = 0;

  profiles.forEach((profile) => {
    globalTotal += profile.total || 0;

    const row = document.createElement("div");
    row.className = "admin-user-row";

    row.innerHTML = `
      <div class="admin-user-name">${profile.name}</div>
      <div>
        <input
          type="number"
          class="admin-input admin-base-input"
          data-id="${profile.id}"
          value="${profile.baseAmount}"
          min="100"
          step="100"
        />
        <span class="badge">F</span>
      </div>
      <div class="amount-text">${formatAmount(profile.total || 0)}</div>
      <div>
        <input
          type="password"
          class="admin-input admin-pin-input"
          data-id="${profile.id}"
          value="${profile.pin || ""}"
          maxlength="4"
        />
      </div>
    `;

    adminUsersContainerEl.appendChild(row);
  });

  adminGlobalTotalEl.textContent = formatAmount(globalTotal);
}

adminUsersContainerEl.addEventListener("change", (e) => {
  const data = loadProfilesFromStorage();
  const profilesObj = data.profiles || {};

  const baseInput = e.target.closest(".admin-base-input");
  const pinInput = e.target.closest(".admin-pin-input");

  if (baseInput) {
    const profileId = baseInput.dataset.id;
    let newBase = parseInt(baseInput.value, 10);
    if (isNaN(newBase) || newBase < 100) {
      alert("La mise de départ doit être au minimum 100 F.");
      baseInput.value = profilesObj[profileId].baseAmount;
      return;
    }
    newBase = Math.round(newBase / 100) * 100;

    profilesObj[profileId].baseAmount = newBase;
    saveProfilesToStorage({
      profiles: profilesObj,
      currentProfileId: data.currentProfileId
    });
  }

  if (pinInput) {
    const profileId = pinInput.dataset.id;
    const newPin = pinInput.value.trim();

    if (!/^\d{4}$/.test(newPin)) {
      alert("Le PIN doit contenir exactement 4 chiffres.");
      pinInput.value = profilesObj[profileId].pin || "";
      return;
    }

    profilesObj[profileId].pin = newPin;
    saveProfilesToStorage({
      profiles: profilesObj,
      currentProfileId: data.currentProfileId
    });
  }
});

adminBackBtnEl.addEventListener("click", () => {
  window.location.href = "../index.html";
});

adminLogoutBtnEl.addEventListener("click", () => {
  sessionStorage.removeItem("isAdmin");
  window.location.href = "../index.html";
});

window.addEventListener("DOMContentLoaded", () => {
  renderAdminUsers();
});
