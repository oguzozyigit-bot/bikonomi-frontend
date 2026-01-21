// js/partials.js
// Amaç:
// - #menuMount ve #notifMount varsa kullan
// - İçleri BOŞSA partial inject et
// - DOLUYSA dokunma
// - HİÇBİR ŞEY yoksa siteyi kırma

export async function initPartials() {
  try {
    await initMenuPartial();
    await initNotifPartial();
  } catch (e) {
    console.warn("initPartials hata ama devam:", e);
  }
}

/* =========================
   MENU PARTIAL
========================= */
async function initMenuPartial() {
  const mount = document.getElementById("menuMount");
  if (!mount) return;

  // Eğer mount içinde zaten içerik varsa DOKUNMA
  if (mount.children.length > 0) return;

  try {
    // Şimdilik: index.html içindeki mevcut menuOverlay'i kullan
    const existingMenu = document.getElementById("menuOverlay");
    if (existingMenu) {
      // ✅ Fail-safe: taşıma yerine kopyala (DOM kırılmasın)
      const clone = existingMenu.cloneNode(true);
      mount.appendChild(clone);

      // İstersen orijinali gizleyebilirsin (UI'da iki tane görünmesin diye)
      // existingMenu.style.display = "none";
    }
  } catch (e) {
    console.warn("Menu partial yüklenemedi:", e);
  }
}

/* =========================
   NOTIF PARTIAL
========================= */
async function initNotifPartial() {
  const mount = document.getElementById("notifMount");
  if (!mount) return;

  // Zaten notif varsa dokunma
  if (mount.children.length > 0) return;

  try {
    // ✅ ID çakışması riskini azalt: içeride yine id bırakıyoruz ama
    // event binding'i mount scope'unda yapıyoruz.
    mount.innerHTML = `
      <button class="notif-btn" id="notifBtn">
        <svg viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <div class="badge" id="notifBadge" style="display:none;"></div>
      </button>

      <div class="notification-dropdown" id="notifDropdown">
        <div class="notif-header">Bildirimler</div>
        <div class="notif-list" id="notifList">
          <div class="notif-item">
            <div class="notif-icon">🧿</div>
            <div class="notif-content">
              <div class="notif-title">Hazırım</div>
              <div class="notif-desc">Evladım, hatırlatmalarını bekliyorum.</div>
              <div class="notif-time">—</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ✅ Buton davranışı (fail-safe + scope)
    const btn = mount.querySelector("#notifBtn");
    const dd = mount.querySelector("#notifDropdown");
    const badge = mount.querySelector("#notifBadge");

    if (btn && dd) {
      // Çift init olursa çift event olmasın diye clone yaklaşımı
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener("click", () => {
        dd.classList.toggle("show");
        if (badge) badge.style.display = "none";
      });
    }
  } catch (e) {
    console.warn("Notif partial yüklenemedi:", e);
  }
}
