import { initAuth, handleLogin, logout, acceptTerms, waitForGsi } from "./auth.js";
import { initEyes, showPage, closePage } from "./ui.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";
import { openDedikoduPanel } from "./dedikodu.js";
import { STORAGE_KEY } from "./config.js";

const $ = (id) => document.getElementById(id);
window.currentAppMode = 'chat';

document.addEventListener("DOMContentLoaded", async () => {
    initEyes();
    
    const gsiReady = await waitForGsi();
    if(gsiReady) {
        const gBtn = $('googleLoginBtn');
        const aBtn = $('appleLoginBtn');
        const hint = $('loginHint');
        if(gBtn) gBtn.classList.remove('disabled');
        if(aBtn) aBtn.classList.remove('disabled');
        if(hint) hint.textContent = "Hadi giriş yap.";
        initAuth();
    }

    // Event Listeners
    $('hambBtn')?.addEventListener('click', () => $('menuOverlay').classList.add('open'));
    $('menuOverlay')?.addEventListener('click', (e) => {
        if(e.target.id === 'menuOverlay') $('menuOverlay').classList.remove('open');
    });

    $('sendBtn')?.addEventListener('click', sendMessage);
    $('msgInput')?.addEventListener('keydown', (e) => { if(e.key==='Enter') sendMessage(); });

    $('notifBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        $('notifDropdown').classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
        if(!$('notifBtn').contains(e.target)) $('notifDropdown').classList.remove('show');
    });

    $('googleLoginBtn')?.addEventListener('click', () => handleLogin('google'));
    $('appleLoginBtn')?.addEventListener('click', () => handleLogin('apple'));
    $('termsAcceptBtn')?.addEventListener('click', async () => {
        if($('termsCheck').checked) {
            await acceptTerms();
            $('termsOverlay').style.display = 'none';
            checkSession();
        } else {
            alert("Sözleşmeyi onayla evladım.");
        }
    });

    $('closeFalBtn')?.addEventListener('click', closeFalPanel);
    $('falInput')?.addEventListener('change', (e) => handleFalPhoto(e.target));
    $('closePageBtn')?.addEventListener('click', closePage);

    // Menü Butonları
    const actions = {
        'fal': openFalPanel,
        'dedikodu': openDedikoduPanel,
        'shopping': () => { window.currentAppMode='shopping'; sendMessage("Alışveriş modundayız, ne lazım?"); },
        'diet': () => { window.currentAppMode='diet'; sendMessage("Diyet için boyun kilon kaç?"); },
        'health': () => { window.currentAppMode='health'; sendMessage("Neren ağrıyor evladım?"); },
        'translate': () => { window.currentAppMode='trans'; sendMessage("Çevireceğin şeyi yaz."); },
        'astro': () => window.location.href = 'pages/burc.html',
        'dream': () => window.location.href = 'pages/ruya.html',
        'tarot': () => window.location.href = 'pages/tarot.html'
    };

    const grid = $('mainMenu');
    if(grid) {
        grid.innerHTML = `
            <div class="menu-action" data-act="shopping"><div class="ico">🛍️</div><div>Alışveriş</div></div>
            <div class="menu-action" data-act="translate"><div class="ico">🌍</div><div>Tercüman</div></div>
            <div class="menu-action" data-act="diet"><div class="ico">🥗</div><div>Diyet</div></div>
            <div class="menu-action" data-act="health"><div class="ico">❤️</div><div>Sağlık</div></div>
            <div class="menu-action" data-act="fal"><div class="ico">☕</div><div>Fal</div></div>
            <div class="menu-action" data-act="dedikodu"><div class="ico">🤫</div><div>Dedikodu</div></div>
            <div class="menu-action" data-act="astro"><div class="ico">♈</div><div>Burç</div></div>
            <div class="menu-action" data-act="tarot"><div class="ico">🃏</div><div>Tarot</div></div>
        `;
        grid.querySelectorAll('.menu-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const act = btn.dataset.act;
                $('menuOverlay').classList.remove('open');
                if(actions[act]) actions[act]();
            });
        });
    }

    $('logoutBtn')?.addEventListener('click', logout);
    $('deleteAccountBtn')?.addEventListener('click', () => { if(confirm("Silmek istediğine emin misin?")) logout(); });

    const toggleCam = () => { $('mobileFrame').classList.toggle('tracking-active'); };
    $('camBtn')?.addEventListener('click', toggleCam);
    $('trackToggleBtn')?.addEventListener('click', toggleCam);
    $('mainTrackBtn')?.addEventListener('click', toggleCam);

    checkSession();
});

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
