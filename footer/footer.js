// Chargement du footer dans #appFooter
(async function loadFooter() {
  const container = document.getElementById("appFooter");
  if (!container) return;

  try {
    const resp = await fetch("/footer/footer.html");
    const html = await resp.text();
    container.innerHTML = html;
  } catch (e) {
    console.error("Erreur chargement footer", e);
  }
})();

