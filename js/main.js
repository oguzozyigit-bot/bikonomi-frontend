/* js/main.js (v40.0 - SINGLE FILE STABILITY) */

const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";
const GOOGLE_CLIENT_ID = "530064560706-03ga0q36t703ve7gmahr98.apps.googleusercontent.com"; 

let isBusy = false;
let currentPersona = "normal";
let voiceEnabled = false;
const chatHistory = {};

const MODE_CONFIG = {
    'chat': { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments", showCam: false, showMic: true },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping", showCam: true, showMic: true },
    'dedikodu': { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret", showCam: false, showMic: true },
    'fal': { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot", showCam: true, showMic: false, specialInput: 'fal' },
    'astro': { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Yıldızlar senin için parlıyor.", color: "#7986CB", icon: "fa-star", showCam: false, showMic: true, specialInput: 'astro' },
    'ruya': { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon", showCam: false, showMic: false },
    'health': { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse", showCam: true, showMic: true },
    'diet': { title: "Boğazını Tut<br>Rahat Et.", desc: "Diyet Listeni Hazırladım.", color: "#AED581", icon: "fa-carrot", showCam: false, showMic: true, specialInput: 'diet' },
    'trans': { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language", showCam: true, showMic: true }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Caynana v40.0 Single File Started");
    initDock();
    setAppMode('chat');
    updateUIForUser();
    initSwipeDetection();
    
    if(typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
        try { google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse, auto_select: false }); } catch(e) {}
    }

    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("text").addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// UI FONKSİYONLARI
function openDrawer() { document.getElementById('drawerMask').style.display='flex'; }
function closeDrawer() { document.getElementById('drawerMask').style.display='none'; }
function openPersonaModal() { document.getElementById('personaModal').style.display='flex'; }
function triggerAuth(msg) { addBotMessage(msg); document.getElementById("authModal").style.display="flex"; }
function handleGoogleLogin() { google.accounts.id.prompt(); }
function handleLogout() { localStorage.clear(); window.location.reload(); }
function handleDeleteAccount() { if(confirm("Hesabın silinecek?")) { localStorage.clear(); window.location.reload(); } }
function changePersona(p) { 
    currentPersona = p; 
    document.querySelectorAll('.persona-option').forEach(el => el.classList.remove('selected'));
    document.getElementById('personaModal').style.display='none';
    addBotMessage(`Tamam evladım, modumu <b>${p.toUpperCase()}</b> yaptım.`);
}
function clearCurrentChat() { document.getElementById('chatContainer').innerHTML=''; addBotMessage(MODE_CONFIG[window.currentAppMode].desc); }
function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    const icon = document.getElementById('voiceIcon');
    icon.className = voiceEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
    icon.style.color = voiceEnabled ? "#4CAF50" : "#fff";
}
function speakThisText(btn) {
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Okunuyor...`;
    setTimeout(() => { btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Tekrar Oku`; }, 2000);
}

// UI GÜNCELLEME
function updateUIForUser() {
    const raw = localStorage.getItem("user_info");
    const menu = document.querySelector('.menu-list');
    const bar = document.getElementById('userInfoBar');
    
    if (raw) {
        const u = JSON.parse(raw);
        bar.classList.add('visible'); 
        document.getElementById('headerAvatar').src = u.picture || PLACEHOLDER_IMG;
        let nick = u.hitap || "Misafir";
        if(nick.length > 10) nick = nick.substring(0, 10) + "..";
        document.getElementById('headerHitap').innerText = nick.toUpperCase();

        menu.innerHTML = `
            <a href="pages/profil.html" class="menu-item" style="border:1px solid var(--primary);"><i class="fa-solid fa-user-pen"></i> Profil</a>
            <a href="pages/sss.html" class="menu-item"><i class="fa-solid fa-circle-question"></i> S.S.S</a>
            <a href="pages/gizlilik.html" class="menu-item"><i class="fa-solid fa-shield-halved"></i> Gizlilik Politikası</a>
            <a href="pages/iletisim.html" class="menu-item"><i class="fa-solid fa-envelope"></i> İletişim</a>
            <div style="margin-top:15px; border-top:1px solid #333;"></div>
            <div class="menu-item" onclick="handleLogout()"><i class="fa-solid fa-right-from-bracket"></i> Güvenli Çıkış</div>
            <div class="menu-item" onclick="handleDeleteAccount()" style="color:#f44;"><i class="fa-solid fa-trash-can"></i> Hesabı Sil</div>
        `;
    } else {
        bar.classList.remove('visible'); 
        menu.innerHTML = `<div class="menu-item" onclick="document.getElementById('authModal').style.display='flex'" style="background:var(--primary); color:#000;"><i class="fa-solid fa-user-plus"></i> Giriş Yap / Üye Ol</div>`;
    }
}

// MODÜL SİSTEMİ
function initDock() {
    const dock = document.getElementById('dock');
    dock.innerHTML = '';
    MODULE_ORDER.forEach(key => {
        const item = document.createElement('div');
        item.className = 'dock-item';
        item.onclick = () => setAppMode(key);
        item.innerHTML = `<div class="dock-icon"><i class="fa-solid ${MODE_CONFIG[key].icon}"></i></div>`;
        dock.appendChild(item);
    });
}

function setAppMode(mode) {
    const container = document.getElementById('chatContainer');
    if(container) chatHistory[window.currentAppMode] = container.innerHTML;
    
    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode];
    
    document.getElementById('heroTitle').innerHTML = cfg.title;
    document.getElementById('heroDesc').innerHTML = cfg.desc;
    document.documentElement.style.setProperty('--primary', cfg.color);
    
    const heroImg = document.getElementById('heroImage');
    heroImg.style.opacity = '0';
    setTimeout(() => { 
        heroImg.src = `./images/hero-${mode}.png`; 
        heroImg.onload = () => heroImg.style.opacity = '1';
        heroImg.onerror = () => { heroImg.src = './images/hero-chat.png'; heroImg.style.opacity='1'; };
    }, 200);

    document.getElementById('falInputArea').style.display = (cfg.specialInput === 'fal') ? 'flex' : 'none';
    document.getElementById('stdInputArea').style.display = (cfg.specialInput === 'fal') ? 'none' : 'flex';
    document.getElementById('dietActions').style.display = (cfg.specialInput === 'diet') ? 'flex' : 'none';
    document.getElementById('astroActions').style.display = (cfg.specialInput === 'astro') ? 'flex' : 'none';
    document.getElementById('camBtn').style.display = cfg.showCam ? 'flex' : 'none';
    document.getElementById('micBtn').style.display = cfg.showMic ? 'flex' : 'none';

    document.querySelectorAll('.dock-item').forEach(el => {
        el.classList.remove('active');
        if(el.innerHTML.includes(cfg.icon)) el.classList.add('active');
    });

    container.innerHTML = '';
    if (mode === 'diet') loadDietContent();
    else if (mode === 'astro') loadAstroContent();
    else if (chatHistory[mode]) { container.innerHTML = chatHistory[mode]; setTimeout(() => container.scrollTop = container.scrollHeight, 10); }
    else addBotMessage(cfg.desc);
}

// ÖZEL MODÜLLER
function loadDietContent() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    if (!user.profile || !user.profile.weight) { addBotMessage("Önce profilini doldur da boyunu kilonu bilelim."); return; }
    const bmi = (user.profile.weight / ((user.profile.height/100)**2)).toFixed(1);
    const html = `<div class="info-card"><div class="info-header"><i class="fa-solid fa-carrot"></i> Diyet Menüsü</div>Sabah: Yumurta<br>Öğle: Çorba<br>Akşam: Salata<br><i>Endeks: ${bmi}</i></div>`;
    document.getElementById('chatContainer').innerHTML = html;
}
function loadAstroContent() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    if (!user.profile || !user.profile.birthDate) { addBotMessage("Doğum tarihini bilmeden yıldıza bakamam."); return; }
    const date = new Date(user.profile.birthDate);
    const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    const html = `<div class="astro-card"><div class="astro-date"><i class="fa-regular fa-calendar"></i> ${today}</div><div class="astro-sign">⭐ Burç Yorumu</div>Bugün şansın açık.</div>`;
    document.getElementById('chatContainer').innerHTML = html;
}
window.generateDietList = () => loadDietContent();
window.showZodiacFeatures = () => addBotMessage("Burç özellikleri yakında...");
window.showBmiStatus = () => alert("Detaylı analiz yakında...");

// MESAJLAŞMA
async function sendMessage() {
    if(isBusy) return;
    const txt = document.getElementById("text").value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { triggerAuth("Giriş yap önce."); return; }

    isBusy = true; document.getElementById("text").value = ""; addBubble(txt, 'user');
    document.getElementById("caynanaSpeaking").style.display = "block";

    try {
        const u = JSON.parse(localStorage.getItem("user_info") || "{}");
        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST", headers: { "Content-Type":"application/json", "Authorization":`Bearer ${localStorage.getItem("auth_token")}` },
            body: JSON.stringify({ message: txt, mode: window.currentAppMode, persona: currentPersona, user_name: u.hitap })
        });
        const data = await res.json();
        const ans = data.assistant_text || "...";
        
        typeWriter(ans, () => {
            const rows = document.querySelectorAll('.msg-row.bot');
            const lastRow = rows[rows.length - 1];
            if(lastRow) lastRow.querySelector('.msg-bubble').insertAdjacentHTML('beforeend', `<div class="speak-btn-inline" onclick="speakThisText(this)"><i class="fa-solid fa-volume-high"></i> Caynanayı Konuştur</div>`);
            if(data.data) renderProducts(data.data);
        });
    } catch(e) { addBotMessage("Bağlantı koptu."); }
    finally { isBusy = false; document.getElementById("caynanaSpeaking").style.display = "none"; }
}

// YARDIMCILAR
function addBubble(t, r) { const c=document.getElementById("chatContainer"); c.innerHTML+=`<div class="msg-row ${r}"><div class="msg-bubble ${r}">${t}</div></div>`; c.scrollTop=c.scrollHeight; }
function addBotMessage(t) { const c=document.getElementById("chatContainer"); c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot">${t}</div></div>`; c.scrollTop=c.scrollHeight; }
function typeWriter(t, cb) { 
    const c=document.getElementById("chatContainer"); const id="b"+Date.now();
    c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot" id="${id}"></div></div>`; 
    const el=document.getElementById(id); let i=0; 
    function step(){ if(i>=t.length){if(cb)cb();return;} el.innerHTML+=t.charAt(i); i++; c.scrollTop=c.scrollHeight; setTimeout(step,10); } step(); 
}
function parseJwt(t) { try{return JSON.parse(decodeURIComponent(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')))}catch(e){return{}} }
async function handleGoogleResponse(r) { 
    const u=parseJwt(r.credential); 
    localStorage.setItem("user_info",JSON.stringify({name:u.name, picture:u.picture, hitap:u.given_name}));
    try{ const res=await fetch(`${BASE_DOMAIN}/api/auth/google`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:r.credential})}); const d=await res.json(); if(d.token) localStorage.setItem("auth_token",d.token); }catch(e){}
    window.location.href="pages/profil.html"; 
}
function renderProducts(p) { p.slice(0,5).forEach((x,i)=>{ setTimeout(()=>{ document.getElementById("chatContainer").innerHTML+=`<div class="msg-row bot"><div class="product-card"><img src="${x.image||PLACEHOLDER_IMG}" class="pc-img"><div class="pc-content"><div class="pc-title">${x.title}</div><div class="pc-price">${x.price}</div><a href="${x.url}" target="_blank" class="pc-btn-mini">Git</a></div></div></div>`; },i*200); }); }
function initSwipeDetection() {
    let ts=0; const m=document.getElementById('main'); 
    m.addEventListener('touchstart',e=>{ts=e.changedTouches[0].screenX});
    m.addEventListener('touchend',e=>{ const te=e.changedTouches[0].screenX; if(te<ts-50)changeModule(1); if(te>ts+50)changeModule(-1); });
}
function changeModule(d) { let i=MODULE_ORDER.indexOf(window.currentAppMode)+d; if(i>=9)i=0; if(i<0)i=8; setAppMode(MODULE_ORDER[i]); }

// Window Binding
window.openDrawer=openDrawer; window.closeDrawer=closeDrawer; window.openPersonaModal=openPersonaModal; 
window.triggerAuth=triggerAuth; window.handleGoogleLogin=handleGoogleLogin; window.handleLogout=handleLogout; 
window.handleDeleteAccount=handleDeleteAccount; window.changePersona=changePersona; window.clearCurrentChat=clearCurrentChat; 
window.toggleVoice=toggleVoice; window.speakThisText=speakThisText; window.generateDietList=generateDietList; 
window.showBmiStatus=showBmiStatus; window.showZodiacFeatures=showZodiacFeatures;
