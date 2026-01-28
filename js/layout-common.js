// ===== COMMON LAYOUT (HER SAYFA AYNI) =====
document.addEventListener("DOMContentLoaded", () => {
  // hamburger aç/kapa
  const hamb = document.getElementById("hambBtn");
  const overlay = document.getElementById("menuOverlay");

  if (hamb && overlay) {
    hamb.addEventListener("click", () => overlay.classList.add("open"));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
  }

  // alt bar click
  document.querySelectorAll(".assistant-item").forEach(el => {
    el.addEventListener("click", () => {
      const go = el.getAttribute("data-go");
      if(go) location.href = go;
    });
  });

  // aktif sayfayı otomatik işaretle
  const path = location.pathname;
  document.querySelectorAll(".assistant-item").forEach(el => {
    const go = el.getAttribute("data-go") || "";
    if (go && path.endsWith(go)) el.classList.add("active");
    else el.classList.remove("active");
  });
});
