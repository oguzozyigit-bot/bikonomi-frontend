import { APP_MODULES, STORAGE_KEY } from "./config.js"; // Config'den modülleri çekiyoruz
import { initAuth, handleLogin, logout, acceptTerms, waitForGsi } from "./auth.js";
import { initEyes, showPage, closePage } from "./ui.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";
import { openDedikoduPanel } from "./dedikodu.js";

const $ = (id) => document.getElementById(id);
window.currentAppMode = 'chat';

document.addEventListener("DOMContentLoaded", async () => {
    initEyes();
    
    // Google Scriptini Bekle (Çalışmazsa test butonu zaten var)
    const gsiReady = await waitForGsi();
    if(gsiReady) {
        const hint = $('loginHint');
        if(hint) hint.textContent = "Hadi giriş yap.";
        initAuth();
    } else {
        const hint = $('loginHint');
        if(hint) hint.textContent = "Google yüklenemedi, Test Girişini kullan.";
    }

    // --- EVENT LISTENERS ---

    // 1. Menü Aç/Kapa
    $('hambBtn')?.addEventListener('click', () => $('menuOverlay').classList.add('open'));
    $('menuOverlay')?.addEventListener('click', (e) => {
        if(e.target.id === 'menuOverlay') $('menuOverlay').classList.remove('open');
    });

    // 2. Mesaj Gönder
    $('sendBtn')?.addEventListener('click', sendMessage);
    $('msgInput')?.addEventListener('keydown', (e) => { if(e.key==='Enter') sendMessage(); });

    // 3. Bildirimler
    $('notifBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        $('notifDropdown').classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
        if(!$('notifBtn').contains(e.target)) $('notifDropdown').classList.remove('show');
    });

    // 4. LOGIN BUTONLARI
    $('googleLoginBtn')?.addEventListener('click', () => handleLogin('google'));
    $('appleLoginBtn')?.addEventListener('click', () => handleLogin('apple'));
    
    // 🔥 TEST GİRİŞİ (BYPASS) BUTONU (DÜZELTİLDİ VE TAMAMLANDI) 🔥
    $('devLoginBtn')?.addEventListener('click', () => {
        const fakeUser = {
            id: "test-user-id",
            email: "test@caynana.ai",
            name: "Test Kullanıcısı",
            avatar: "https://via.placeholder.com/150",
            termsAccepted: true,
            isSessionActive: true
        };
        // Kaydet ve yenile
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeUser));
        localStorage.setItem("google_id_token", "dev_token_bypass"); // Token varmış gibi yap
        window.location.reload();
    });

    // 5. Sözleşme Onayı
    $('termsAcceptBtn')?.addEventListener('click', async () => {
        if($('termsCheck').checked) {
            await acceptTerms();
            $('termsOverlay').style.display = 'none';
            checkSession();
        } else {
            alert("Sözleşmeyi onayla evladım.");
        }
    });

    // 6. UI İşlevleri (Fal, Modal vb.)
    $('closeFalBtn')?.addEventListener('click', closeFalPanel);
    $('falInput')?.addEventListener('change', (e) => handleFalPhoto(e.target));
    $('closePageBtn')?.addEventListener('click', closePage);

    // 7. 🔥 DINAMİK MENÜ OLUŞTURUCU (Config.js'den Çeker) 🔥
    const grid = $('mainMenu');
    if(grid && APP_MODULES && APP_MODULES.modules) {
        grid.innerHTML = ""; // Temizle
        
        // Config'deki her grubu ve item'ı dön
        APP_MODULES.modules.forEach(group => {
            group.items.forEach(item => {
                const div = document.createElement('div');
                div.className = "menu-action";
                div.innerHTML = `<div class="ico">${item.icon}</div><div>${item.name}</div>`;
                
                // Tıklama Olayı
                div.onclick = () => {
                    $('menuOverlay').classList.remove('open'); // Menüyü kapat
                    handleMenuAction(item.action);
                };
                
                grid.appendChild(div);
            });
        });
    }

    // 8. Çıkış İşlemleri
    $('logoutBtn')?.addEventListener('click', logout);
    $('deleteAccountBtn')?.addEventListener('click', () => { if(confirm("Silmek istediğine emin misin?")) logout(); });

    // 9. Kamera/Göz Takip
    const toggleCam = () => { $('mobileFrame').classList.toggle('tracking-active'); };
    $('camBtn')?.addEventListener('click', toggleCam);
    $('trackToggleBtn')?.addEventListener('click', toggleCam);
    $('mainTrackBtn')?.addEventListener('click', toggleCam);

    checkSession();
});

// --- MENÜ AKSİYON YÖNETİCİSİ ---
function handleMenuAction(action) {
    // 1. Fal & Dedikodu (Overlay)
    if (action === 'fal') openFalPanel();
    else if (action === 'dedikodu') openDedikoduPanel();
    
    // 2. Mod Değiştiren Sohbetler
    else if (action.startsWith('mode_')) {
        const mode = action.replace('mode_', ''); // shopping, diet, health...
        window.currentAppMode = mode;
        
        let msg = "Konuş bakalım.";
        if(mode === 'shopping') msg = "Alışveriş modundayız, ne lazım?";
        if(mode === 'diet') msg = "Diyet konuşalım, boyun kilon kaç?";
        if(mode === 'health') msg = "Neren ağrıyor evladım?";
        if(mode === 'trans') msg = "Çevireceğin şeyi yaz.";
        
        sendMessage(msg);
    }
    
    // 3. Sayfa Yönlendirmeleri
    else if (action.startsWith('page_')) {
        const page = action.replace('page_', '');
        window.location.href = `pages/${page}.html`;
    }
    
    // 4. Varsayılan Chat
    else if (action === 'chat') {
        window.currentAppMode = 'chat';
        sendMessage("Sohbet edelim.");
    }
}

async function sendMessage(overrideText) {
    const inp = $('msgInput');
    const txt = typeof overrideText === 'string' ? overrideText : inp.value.trim();
    if(!txt) return;

    if(!localStorage.getItem("google_id_token")) {
        alert("Önce giriş yap evladım.");
        return;
    }

    addUserBubble(txt);
    inp.value = "";

    const chat = $('chat');
    const loadBubble = document.createElement('div');
    loadBubble.className = 'bubble bot loading';
    loadBubble.textContent = "…";
    chat.appendChild(loadBubble);
    chat.scrollTop = chat.scrollHeight;

    $('brandWrapper').classList.add('thinking');
    
    const res = await fetchTextResponse(txt);
    
    loadBubble.remove();
    $('brandWrapper').classList.remove('thinking');
    $('brandWrapper').classList.add('talking');
    $('mobileFrame').classList.add('talking');

    typeWriter(res.text);

    setTimeout(() => {
        $('brandWrapper').classList.remove('talking');
        $('mobileFrame').classList.remove('talking');
    }, Math.max(2000, res.text.length * 50));
}

function checkSession() {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(user && user.id) {
        $('loginOverlay').classList.remove('active');
        if(!user.termsAccepted) {
            $('termsOverlay').style.display = 'flex';
        } else {
            $('termsOverlay').style.display = 'none';
            initNotif();
            if($('chat').children.length === 0) setTimeout(() => typeWriter(`Hoş geldin ${user.name || 'evladım'}.`), 500);
        }
    } else {
        $('loginOverlay').classList.add('active');
    }
}
