/* js/ui_modals.js - (Modüller ve Resim Geçişleri) */

// setHeroMode fonksiyonunu dışarıdan alıyoruz
export function initUi(setHeroMode) {
    console.log("🎨 UI ve Navigasyon Başlatılıyor...");

    // --- 1. MENÜ (DRAWER) ---
    const menuBtn = document.getElementById('menuBtn');
    const drawer = document.getElementById('drawer');
    const drawerMask = document.getElementById('drawerMask');
    const drawerClose = document.getElementById('drawerClose');

    function toggleDrawer(show) {
        if (!drawer || !drawerMask) return;
        const disp = show ? 'block' : 'none';
        const trans = show ? 'translateX(0)' : 'translateX(100%)';
        drawerMask.style.display = disp;
        drawer.style.transform = trans;
    }

    if (menuBtn) menuBtn.addEventListener('click', () => toggleDrawer(true));
    if (drawerClose) drawerClose.addEventListener('click', () => toggleDrawer(false));
    if (drawerMask) drawerMask.addEventListener('click', () => toggleDrawer(false));


    // --- 2. ALT BAR TUŞLARI (Resim Değiştirme Burda!) ---
    
    // Kamera Butonu (Fal Modu)
    const camBtn = document.getElementById('camBtn');
    if (camBtn && typeof setHeroMode === 'function') {
        camBtn.addEventListener('click', () => {
            console.log("📷 Fal Moduna Geçiliyor...");
            setHeroMode('fal');
            // İstersen burada fal modalını açabilirsin
            // document.querySelector('.fal-only').style.display = 'block';
        });
    }

    // Mesaj Kutusu (Chat Modu)
    const chatInput = document.getElementById('text');
    if (chatInput && typeof setHeroMode === 'function') {
        chatInput.addEventListener('focus', () => {
            setHeroMode('chat');
        });
    }


    // --- 3. PERSONA (KAYNANA MODLARI) ---
    const personaBtn = document.getElementById('personaBtn');
    const personaModal = document.getElementById('personaModal');
    const personaClose = document.getElementById('personaClose');

    if (personaBtn && personaModal) {
        personaBtn.addEventListener('click', () => personaModal.style.display = 'flex');
    }
    if (personaClose && personaModal) {
        personaClose.addEventListener('click', () => personaModal.style.display = 'none');
    }

    // Persona Seçimi
    const personaOpts = document.querySelectorAll('.persona-opt');
    personaOpts.forEach(opt => {
        opt.addEventListener('click', () => {
            personaOpts.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            // Mod seçince Chat resmine geri dön (veya moda özel resim varsa onu yap)
            if (typeof setHeroMode === 'function') setHeroMode('chat');
        });
    });

    // --- 4. DİĞERLERİ ---
    // Bildirimler
    const notifBtn = document.getElementById('notifIconBtn');
    const notifModal = document.getElementById('notifModal');
    const notifClose = document.getElementById('notifClose');
    if (notifBtn) notifBtn.addEventListener('click', () => notifModal.style.display = 'flex');
    if (notifClose) notifClose.addEventListener('click', () => notifModal.style.display = 'none');

    // Giriş
    const openLoginBtn = document.getElementById('openLoginBtn');
    const authCloseX = document.getElementById('authCloseX');
    const authModal = document.getElementById('authModal');
    window.openLoginModal = function() { if (authModal) authModal.style.display = 'flex'; };
    if (openLoginBtn) openLoginBtn.addEventListener('click', window.openLoginModal);
    if (authCloseX) authCloseX.addEventListener('click', () => authModal.style.display = 'none');
}
