// Forcer l'affichage du header et vérifier la connexion
(function ensureHeaderVisible() {
  const checkHeader = setInterval(() => {
    const headerEl = document.getElementById("mcHeader");
    if (headerEl) {
      clearInterval(checkHeader);
      
      const profile = window.getCurrentProfile && window.getCurrentProfile();
      if (profile && profile.id !== "guest") {
        headerEl.style.display = "flex";
        initMonComptePage();
      } else {
        window.location.href = "/index.html";
      }
    }
  }, 50);
  
  setTimeout(() => clearInterval(checkHeader), 3000);
})();

function initMonComptePage() {
  const profile = window.getCurrentProfile && window.getCurrentProfile();
  if (!profile || profile.id === "guest") {
    window.location.href = "/index.html";
    return;
  }

  updateProfileHeader(profile);
  updateStatistics(profile);
  setupFormHandlers(profile);
  setupPreferences();
  setupDangerZone(profile);
  loadRecentActivity(profile);
  setupPasswordVisibilityToggles();
}

// S'assurer que le logout fonctionne sur cette page
window.logoutFromAccount = function() {
  if (window.logout) {
    window.logout();
  } else {
    // Fallback si window.logout n'existe pas encore
    localStorage.removeItem("epargne_2026_profiles");
    window.location.href = "/index.html";
  }
};

// ========== SYSTÈME DE NOTIFICATIONS TOAST ==========
function showToast(type, title, message) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '!';

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== PROFIL HEADER ==========
function updateProfileHeader(profile) {
  if (!profile) {
    profile = window.getCurrentProfile && window.getCurrentProfile();
  }
  
  if (!profile) return;
  
  const initialsEl = document.getElementById("profileInitials");
  const nameDisplayEl = document.getElementById("profileNameDisplay");
  
  if (initialsEl && profile.name) {
    const initials = profile.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    initialsEl.textContent = initials;
  }
  
  if (nameDisplayEl && profile.name) {
    nameDisplayEl.textContent = profile.name;
  }
}

// ========== STATISTIQUES ==========
function updateStatistics(profile) {
  const totalEl = document.getElementById("statTotal");
  const daysEl = document.getElementById("statDays");
  const progressEl = document.getElementById("statProgress");
  const streakEl = document.getElementById("statStreak");

  const total = profile.total || 0;
  const validatedDays = Object.keys(profile.days || {}).filter(
    key => profile.days[key].validated
  ).length;
  const progress = Math.min(100, Math.round((total / 200000) * 100));

  if (totalEl) totalEl.textContent = total.toLocaleString('fr-FR') + ' F';
  if (daysEl) daysEl.textContent = validatedDays;
  if (progressEl) progressEl.textContent = progress + '%';
  if (streakEl) streakEl.textContent = calculateStreak(profile);
}

function calculateStreak(profile) {
  if (!profile.days) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let currentDate = new Date(today);

  while (true) {
    const key = formatDateKey(currentDate);
    if (profile.days[key] && profile.days[key].validated) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ========== FORMULAIRES ==========
function setupFormHandlers(profile) {
  const accountNameInputEl = document.getElementById("accountNameInput");
  const accountBaseInputEl = document.getElementById("accountBaseInput");
  const accountSaveBtnEl = document.getElementById("accountSaveBtn");
  
  const oldPinInputEl = document.getElementById("oldPinInput");
  const newPinInputEl = document.getElementById("newPinInput");
  const confirmPinInputEl = document.getElementById("confirmPinInput");
  const changePinBtnEl = document.getElementById("changePinBtn");

  if (accountNameInputEl) accountNameInputEl.value = profile.name;
  if (accountBaseInputEl) accountBaseInputEl.value = profile.baseAmount;

  if (accountSaveBtnEl) {
    accountSaveBtnEl.addEventListener("click", () => {
      saveProfileChanges(profile, accountNameInputEl, accountBaseInputEl);
    });
  }

  if (changePinBtnEl) {
    changePinBtnEl.addEventListener("click", () => {
      changePIN(profile, oldPinInputEl, newPinInputEl, confirmPinInputEl);
    });
  }
}

function saveProfileChanges(profile, nameInput, baseInput) {
  const newName = nameInput.value.trim();
  let newBase = parseInt(baseInput.value.trim(), 10);

  if (!newName) {
    showToast('error', 'Erreur', 'Le nom ne peut pas être vide.');
    return;
  }
  if (isNaN(newBase) || newBase < 100) {
    showToast('error', 'Erreur', 'La mise de départ doit être au minimum 100 F.');
    return;
  }
  newBase = Math.round(newBase / 100) * 100;

  const oldId = profile.id;
  const newId = window.normalizeProfileId(newName);

  if (newId !== oldId && window.state.profiles[newId]) {
    showToast('error', 'Erreur', 'Un autre profil utilise déjà ce nom.');
    return;
  }

  // Mise à jour du profil
  profile.name = newName;
  profile.baseAmount = newBase;

  if (newId !== oldId) {
    profile.id = newId;
    window.state.profiles[newId] = profile;
    delete window.state.profiles[oldId];
    window.state.currentProfileId = newId;
  }

  window.saveToStorage();
  
  // Mise à jour de l'interface
  if (window.updateProfileHeader) window.updateProfileHeader();
  if (window.mcToggleHeaderVisibility) window.mcToggleHeaderVisibility();

  // Afficher le message de succès
  showToast('success', 'Modifications enregistrées', 'Ton profil a été mis à jour avec succès.');
  
  // Rafraîchir l'affichage local
  const updatedProfile = window.getCurrentProfile();
  if (updatedProfile) {
    updateProfileHeader(updatedProfile);
    updateStatistics(updatedProfile);
  }
}

function changePIN(profile, oldPinInput, newPinInput, confirmPinInput) {
  const oldPin = oldPinInput.value.trim();
  const newPin = newPinInput.value.trim();
  const confirmPin = confirmPinInput.value.trim();

  if (!oldPin || !newPin || !confirmPin) {
    showToast('error', 'Erreur', 'Tous les champs sont obligatoires.');
    return;
  }

  if (oldPin !== profile.pin) {
    showToast('error', 'Erreur', 'Le PIN actuel est incorrect.');
    return;
  }

  if (!/^\d{4}$/.test(newPin)) {
    showToast('error', 'Erreur', 'Le nouveau PIN doit contenir exactement 4 chiffres.');
    return;
  }

  if (newPin !== confirmPin) {
    showToast('error', 'Erreur', 'Les deux nouveaux PINs ne correspondent pas.');
    return;
  }

  if (oldPin === newPin) {
    showToast('warning', 'Attention', 'Le nouveau PIN doit être différent de l\'ancien.');
    return;
  }

  profile.pin = newPin;
  window.saveToStorage();
  
  oldPinInput.value = "";
  newPinInput.value = "";
  confirmPinInput.value = "";
  
  showToast('success', 'Succès', 'PIN modifié avec succès.');
}

// ========== PRÉFÉRENCES ==========
function setupPreferences() {
  const notifToggle    = document.getElementById("notifToggle");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const reminderToggle = document.getElementById("reminderToggle");
  const reminderHourEl = document.getElementById("reminderHour");
  const reminderMinEl  = document.getElementById("reminderMinute");
  const reminderSecEl  = document.getElementById("reminderSecond");

  const prefs = JSON.parse(localStorage.getItem("mc_preferences") || "{}");

  // Notifications
  if (notifToggle) {
    notifToggle.checked = prefs.notifications || false;
    notifToggle.addEventListener("change", () => {
      if (notifToggle.checked) {
        requestNotificationPermission();
      }
      prefs.notifications = notifToggle.checked;
      localStorage.setItem("mc_preferences", JSON.stringify(prefs));
      showToast(
        'success',
        'Préférence enregistrée',
        notifToggle.checked ? 'Notifications activées.' : 'Notifications désactivées.'
      );
    });
  }

  // Mode sombre
  if (darkModeToggle) {
    darkModeToggle.checked = prefs.darkMode || false;
    
    darkModeToggle.addEventListener("change", () => {
      prefs.darkMode = darkModeToggle.checked;
      localStorage.setItem("mc_preferences", JSON.stringify(prefs));
      
      if (window.toggleDarkMode) {
        window.toggleDarkMode(darkModeToggle.checked);
      }
      
      if (darkModeToggle.checked) {
        showToast('success', 'Mode sombre activé', 'Thème sombre appliqué sur tout le site.');
      } else {
        showToast('success', 'Mode clair activé', 'Thème clair appliqué sur tout le site.');
      }
    });
  }

  // Rappel automatique avec heures/minutes/secondes
  if (reminderToggle && reminderHourEl && reminderMinEl && reminderSecEl) {
    const defaultTime = prefs.reminderTime || "20:00:00";
    const [hDef, mDef, sDef] = defaultTime.split(':').map(Number);

    reminderToggle.checked = prefs.reminder || false;

    reminderHourEl.value = isNaN(hDef) ? "20" : hDef.toString().padStart(2, '0');
    reminderMinEl.value  = isNaN(mDef) ? "00" : mDef.toString().padStart(2, '0');
    reminderSecEl.value  = isNaN(sDef) ? "00" : sDef.toString().padStart(2, '0');

    const setDisabled = (v) => {
      reminderHourEl.disabled = !v;
      reminderMinEl.disabled  = !v;
      reminderSecEl.disabled  = !v;
    };

    setDisabled(reminderToggle.checked);

    reminderToggle.addEventListener("change", () => {
      prefs.reminder = reminderToggle.checked;
      localStorage.setItem("mc_preferences", JSON.stringify(prefs));
      setDisabled(reminderToggle.checked);

      const timeStr = `${reminderHourEl.value || "20"}:${reminderMinEl.value || "00"}:${reminderSecEl.value || "00"}`;
      prefs.reminderTime = timeStr;
      localStorage.setItem("mc_preferences", JSON.stringify(prefs));

      if (reminderToggle.checked) {
        scheduleReminder(timeStr);
        showToast('success', 'Rappel activé', `Tu recevras un rappel à ${timeStr} chaque jour.`);
      } else {
        showToast('success', 'Rappel désactivé', 'Rappel automatique désactivé.');
      }
    });

    function onTimeChange() {
      let h = parseInt(reminderHourEl.value, 10);
      let m = parseInt(reminderMinEl.value, 10);
      let s = parseInt(reminderSecEl.value, 10);

      if (isNaN(h) || h < 0 || h > 23) h = 20;
      if (isNaN(m) || m < 0 || m > 59) m = 0;
      if (isNaN(s) || s < 0 || s > 59) s = 0;

      reminderHourEl.value = h.toString().padStart(2, '0');
      reminderMinEl.value  = m.toString().padStart(2, '0');
      reminderSecEl.value  = s.toString().padStart(2, '0');

      const timeStr = `${reminderHourEl.value}:${reminderMinEl.value}:${reminderSecEl.value}`;
      prefs.reminderTime = timeStr;
      localStorage.setItem("mc_preferences", JSON.stringify(prefs));
      scheduleReminder(timeStr);
      showToast('success', 'Heure mise à jour', `Rappel programmé pour ${timeStr}.`);
    }

    reminderHourEl.addEventListener("change", onTimeChange);
    reminderMinEl.addEventListener("change", onTimeChange);
    reminderSecEl.addEventListener("change", onTimeChange);
  }
}

// ========== NOTIFICATIONS NAVIGATEUR ==========
function requestNotificationPermission() {
  const NotificationAPI = window.Notification || window.webkitNotifications || navigator.mozNotification;
  if (!NotificationAPI) {
    showToast('warning', 'Non supporté', 'Les notifications système ne sont pas supportées sur ce navigateur.')
    return;
  }

  if (Notification.permission === "granted") {
    showToast('success', 'Autorisé', 'Les notifications sont déjà autorisées.')
    return;
  }

  if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        showToast('success', 'Autorisé', 'Notifications autorisées avec succès.')
        try {
          new Notification("Ma Cota", {
            body: "Tu recevras maintenant des rappels pour tes cotisations.",
            icon: "/images/logo.png"
          });
        } catch (e) {
          console.warn("Notification non affichée : ", e);
        }
      } else {
        showToast('error', 'Refusé', 'Notifications refusées.');
      }
    });
  } else {
    showToast('error', 'Refusé', 'Notifications déjà refusées dans le navigateur.');
  }
}

// ========== PLANIFICATION DU RAPPEL ==========
function scheduleReminder(time) {
  const [hours, minutes, seconds = 0] = time.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    seconds || 0
  );

  if (scheduledTime < now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const timeUntilReminder = scheduledTime - now;

  setTimeout(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Ma Cota - Rappel quotidien", {
        body: "N'oublie pas de valider ta cotisation du jour !",
        icon: "/images/logo.png",
        badge: "/images/logo.png"
      });
    }
    scheduleReminder(time);
  }, timeUntilReminder);
}

// ========== ZONE DANGEREUSE ==========
function setupDangerZone(profile) {
  const resetBtn = document.getElementById("resetDataBtn");
  const deleteBtn = document.getElementById("deleteAccountBtn");

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Veux-tu vraiment réinitialiser toutes tes cotisations ? Cette action est irréversible.")) {
        profile.days = {};
        profile.total = 0;
        window.saveToStorage();
        
        if (window.updateTotalUI) window.updateTotalUI();
        if (window.renderCalendar) window.renderCalendar();
        updateStatistics(profile);
        loadRecentActivity(profile);
        
        showToast('success', 'Réinitialisé', 'Toutes tes cotisations ont été réinitialisées.');
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      const confirmText = prompt(
        "Cette action supprimera définitivement ton compte.\n\nTape 'SUPPRIMER' pour confirmer :"
      );
      if (confirmText === "SUPPRIMER") {
        delete window.state.profiles[profile.id];
        window.state.currentProfileId = null;
        window.saveToStorage();
        showToast('success', 'Compte supprimé', 'Tu vas être redirigé vers l\'accueil.');
        setTimeout(() => {
          window.location.href = "/index.html";
        }, 2000);
      }
    });
  }
}

// ========== ACTIVITÉ RÉCENTE ==========
function loadRecentActivity(profile) {
  const activityListEl = document.getElementById("activityList");
  if (!activityListEl) return;

  const days = profile.days || {};
  const sortedDays = Object.keys(days)
    .filter(key => days[key].validated)
    .sort((a, b) => new Date(b) - new Date(a))
    .slice(0, 5);

  if (sortedDays.length === 0) {
    activityListEl.innerHTML = '<p class="empty-state">Aucune activité récente.</p>';
    return;
  }

  activityListEl.innerHTML = sortedDays
    .map(dateKey => {
      const dayData = days[dateKey];
      const date = new Date(dateKey);
      const formattedDate = date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const timeAgo = getTimeAgo(date);

      return `
        <div class="activity-item">
          <div class="activity-icon">✓</div>
          <div class="activity-content">
            <div class="activity-title">Cotisation validée</div>
            <div class="activity-desc">${formattedDate} - ${dayData.amount.toLocaleString('fr-FR')} F CFA</div>
          </div>
          <div class="activity-time">${timeAgo}</div>
        </div>
      `;
    })
    .join('');
}

function getTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ========== VISIBILITÉ DES PINS ==========
function setupPasswordVisibilityToggles() {
  document.querySelectorAll(".toggle-visibility-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.textContent = isPassword ? "👁‍🗨" : "👁";
      });
  });
}
