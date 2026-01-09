// Chargement du header dans #appHeader
(async function loadMcHeader() {
  const container = document.getElementById("appHeader");
  if (!container) return;

  try {
    const resp = await fetch("/header/header.html");
    const html = await resp.text();
    container.innerHTML = html;

    // Appliquer le mode sombre si activé
    const prefs = JSON.parse(localStorage.getItem("mc_preferences") || "{}");
    if (prefs.darkMode) {
      document.body.classList.add('dark-mode');
    }

    const headerEl       = document.getElementById("mcHeader");
    const logoutBtn      = document.getElementById("mcLogoutBtn");
    const accountLink    = document.getElementById("mcAccountLink");

    const burgerBtn      = document.getElementById("mcBurgerBtn");
    const mobileMenu     = document.getElementById("mcMobileMenu");
    const mobileLogoutBtn= document.getElementById("mcMobileLogout");

    function toggleHeaderVisibility() {
      if (!headerEl) return;
      const profile = window.getCurrentProfile && window.getCurrentProfile();
      if (profile && profile.id !== "guest") {
        headerEl.style.display = "flex";
      } else {
        headerEl.style.display = "none";
        if (mobileMenu) mobileMenu.style.display = "none";
      }
    }

    // Fonction de déconnexion universelle
    function universalLogout() {
      // Si window.logout existe (page index.html), l'utiliser
      if (window.logout) {
        window.logout();
      } else {
        // Sinon, déconnexion manuelle (pour les autres pages)
        const STORAGE_KEY = "epargne_2026_profiles";
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        data.currentProfileId = null;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      
      setTimeout(() => {
        window.location.href = "/index.html";
      }, 100);
    }

    toggleHeaderVisibility();

    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        universalLogout();
      });
    }

    if (accountLink) {
      accountLink.addEventListener("click", (e) => {
        if (window.location.pathname.includes('/mon-compte/')) {
          e.preventDefault();
        }
      });
    }

    if (burgerBtn && mobileMenu) {
      function closeMobileMenu() {
        mobileMenu.style.display = "none";
      }

      burgerBtn.addEventListener("click", () => {
        const isOpen = mobileMenu.style.display === "flex";
        mobileMenu.style.display = isOpen ? "none" : "flex";
      });

      // Fermer quand on clique sur un lien
      mobileMenu.addEventListener("click", (e) => {
        if (e.target.tagName === "A") {
          closeMobileMenu();
        }
      });

      // Fermer au scroll
      window.addEventListener("scroll", () => {
        if (mobileMenu.style.display === "flex") {
          closeMobileMenu();
        }
      });

      // Fermer au resize (et éviter menu ouvert sur desktop)
      window.addEventListener("resize", () => {
        if (window.innerWidth >= 768) {
          closeMobileMenu();
        }
      });
    }

    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        universalLogout();
      });
    }

    window.mcToggleHeaderVisibility = toggleHeaderVisibility;
  } catch (e) {
    console.error("Erreur chargement header Ma Cota", e);
  }
})();
