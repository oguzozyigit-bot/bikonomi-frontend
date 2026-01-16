/* js/main.js (v30.0 - ULTIMATE CAYNANA EXPERIENCE) */

const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";
const GOOGLE_CLIENT_ID = "530064560706-03ga0q36t703ve7gmahr98.apps.googleusercontent.com"; 

let isBusy = false;
let currentPersona = "normal";
let voiceEnabled = false;
const chatHistory = {};

// --- KONFIGURASYON ---
const MODE_CONFIG = {
    'chat': { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments", showCam: false, showMic: true },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping", showCam: true, showMic: true },
    'dedikodu': { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret", showCam: false, showMic: true },
    'fal': { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot", showCam: true, showMic: false, specialInput: 'fal' },
    'astro': { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Merkür retrosu hayırdır.", color: "#7986CB", icon: "fa-star", showCam: false, showMic: true },
    'ruya': { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon", showCam: false, showMic: false },
    'health': { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse", showCam: true, showMic: true },
    'diet': { title: "Boğazını Tut<br>Rahat Et.", desc: "Diyet Listeni Hazırladım.", color: "#AED581", icon: "fa-carrot", showCam: false, showMic: true, specialInput: 'diet' },
    'trans': { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language", showCam: true, showMic: true }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Caynana v30.0 Started");
    initDock();
    setAppMode('chat');
    checkLoginStatus(); 
    initSwipeDetection(); // Kaydırma Özelliği
    
    if(typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
                auto_select: false
            });
        } catch(e) { console.error(e); }
    }

    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("text").addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// --- UI & NAVIGASYON ---
function initDock() {
    const dock = document.getElementById('dock');
    if (!dock) return;
    dock.innerHTML = ''; 
    MODULE_ORDER.forEach(key => {
        const conf = MODE_CONFIG[key];
        const item = document.createElement('div');
        item.className = 'dock-item';
        item.dataset.mode = key;
        item.onclick = () => setAppMode(key);
        item.innerHTML = `<div class="dock-icon"><i class="fa-solid ${conf.icon}"></i></div>`;
        dock.appendChild(item);
    });
}

function setAppMode(mode) {
    // 1. Eski geçmişi kaydet
    const currentContainer = document.getElementById('chatContainer');
    const oldMode = window.currentAppMode || 'chat';
    if(currentContainer) chatHistory[oldMode] = currentContainer.innerHTML;

    // 2. Yeni moda geç
    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode];
    
    // 3. UI Güncellemeleri
    document.getElementById('heroTitle').innerHTML = cfg.title;
    document.getElementById('heroDesc').innerHTML = cfg.desc;
    document.documentElement.style.setProperty('--primary', cfg.color);
    
    // Top Bar İkonu
    document.getElementById('currentModeIcon').innerHTML = `<i class="fa-solid ${cfg.icon}"></i>`;

    // Resim Değişimi
    const heroImg = document.getElementById('heroImage');
    heroImg.style.opacity = '0';
    setTimeout(() => {
        heroImg.src = `./images/hero-${mode}.png`;
        heroImg.onload = () => heroImg.style.opacity = '1';
        heroImg.onerror = () => { heroImg.src = './images/hero-chat.png'; heroImg.style.opacity='1'; };
    }, 200);

    // Dock Aktiflik
    document.querySelectorAll('.dock-item').forEach(el => {
        el.classList.remove('active');
        if(el.dataset.mode === mode) el.classList.add('active');
    });
    updateFooterBars(mode);

    // 4. Input Alanı Ayarları (Kamera/Mikrofon Gizle/Göster)
    document.getElementById('falInputArea').style.display = (cfg.specialInput === 'fal') ? 'flex' : 'none';
    document.getElementById('stdInputArea').style.display = (cfg.specialInput === 'fal') ? 'none' : 'flex';
    document.getElementById('dietActions').style.display = (cfg.specialInput === 'diet') ? 'flex' : 'none';
    
    document.getElementById('camBtn').style.display = cfg.showCam ? 'flex' : 'none';
    document.getElementById('micBtn').style.display = cfg.showMic ? 'flex' : 'none';

    // 5. İçeriği Yükle
    currentContainer.innerHTML = '';
    
    if (mode === 'diet') {
        // Diyet Modu Özel Mantığı
        loadDietContent();
    } else if (chatHistory[mode]) {
        currentContainer.innerHTML = chatHistory[mode];
        setTimeout(() => currentContainer.scrollTo({ top: currentContainer.scrollHeight, behavior: 'instant' }), 10);
    } else {
        // Yeni başlangıç mesajı (Hitaplı)
        const user = JSON.parse(localStorage.getItem("user_info") || "{}");
        const hitap = user.hitap || "Evladım";
        let welcomeMsg = `Gel ${hitap}, ne var ne yok?`;
        
        // Modlara göre karşılama (Basit)
        if(mode === 'shopping') welcomeMsg = `Paraları saçma ${hitap}, ne alacaksın?`;
        if(mode === 'fal') welcomeMsg = `Kapat fincanı ${hitap}, soğusun gel.`;
        
        addBotMessage(welcomeMsg);
    }
}

// --- DİYET MODÜLÜ MANTIĞI ---
function loadDietContent() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const container = document.getElementById('chatContainer');
    
    // Profil eksikse uyar
    if (!user.profile || !user.profile.weight || !user.profile.height) {
        addBotMessage(`Aman ${user.hitap || 'evladım'}, boyunu kilonu bilmeden sana ne yedireyim? Git profilini doldur gel.`);
        return;
    }

    // Tarih Kontrolü (Günde 1 menü)
    const today = new Date().toDateString();
    const storedDiet = localStorage.getItem("daily_diet");
    const storedDate = localStorage.getItem("diet_date");

    if (storedDiet && storedDate === today) {
        // Zaten var, yükle
        addBotMessage(`Bugünkü listen burada ${user.hitap}. Sakın kaçamak yapma!`);
        container.innerHTML += storedDiet;
    } else {
        // Yeni liste oluştur
        generateDietList(false);
    }
}

function generateDietList(forceNew) {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const p = user.profile;
    
    // BMI Hesapla
    const heightM = p.height / 100;
    const bmi = (p.weight / (heightM * heightM)).toFixed(1);
    let status = "Normal";
    if(bmi > 25) status = "Biraz toplu";
    if(bmi > 30) status = "Aman dikkat";

    // Basit Liste Oluştur (İlerde AI yapacak)
    const menus = [
        `
        <div class="diet-card">
            <div class="diet-title">🍳 Sabah</div>
            <div class="diet-content">1 Haşlanmış yumurta, bol yeşillik, 2 zeytin. Ekmek yok!</div>
        </div>
        <div class="diet-card">
            <div class="diet-title">🍲 Öğle</div>
            <div class="diet-content">Mercimek çorbası, yağsız salata. Kola içme su iç.</div>
        </div>
        <div class="diet-card">
            <div class="diet-title">🥗 Akşam</div>
            <div class="diet-content">Izgara tavuk (derisi yok), yoğurt.</div>
        </div>
        `
    ];
    
    const dietHtml = menus[0]; // Rastgelelik eklenebilir
    
    // Kaydet
    localStorage.setItem("daily_diet", dietHtml);
    localStorage.setItem("diet_date", new Date().toDateString());

    const container = document.getElementById('chatContainer');
    if(forceNew) container.innerHTML = '';
    
    addBotMessage(`Vücut Kitle Endeksin: <b>${bmi}</b> (${status}). Al sana bugünkü listen:`);
    container.innerHTML += dietHtml;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function showBmiStatus() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const p = user.profile;
    if(!p) return;
    const heightM = p.height / 100;
    const bmi = (p.weight / (heightM * heightM)).toFixed(1);
    alert(`Boy: ${p.height}, Kilo: ${p.weight}\nEndeks: ${bmi}\n\nCaynana Diyor ki: ${bmi > 25 ? "Boğazını tut biraz!" : "İyisin iyi, maşallah."}`);
}

// --- KAYDIRMA (SWIPE) ALGILAMA ---
function initSwipeDetection() {
    let touchStartX = 0;
    let touchEndX = 0;
    const mainArea = document.getElementById('main');

    mainArea.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
    mainArea.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const threshold = 50;
        if (touchEndX < touchStartX - threshold) changeModule(1); // Sola kaydır -> İleri
        if (touchEndX > touchStartX + threshold) changeModule(-1); // Sağa kaydır -> Geri
    }
}

function changeModule(dir) {
    const currentIdx = MODULE_ORDER.indexOf(window.currentAppMode);
    let nextIdx = currentIdx + dir;
    if(nextIdx >= MODULE_ORDER.length) nextIdx = 0;
    if(nextIdx < 0) nextIdx = MODULE_ORDER.length - 1;
    setAppMode(MODULE_ORDER[nextIdx]);
}

// --- KİŞİLİK & SES ---
window.changePersona = (persona) => {
    currentPersona = persona;
    alert(`Kaynana Modu Değişti: ${persona.toUpperCase()} \nArtık ona göre konuşacak!`);
    document.getElementById('drawerMask').style.display='none';
};

window.toggleVoice = () => {
    voiceEnabled = !voiceEnabled;
    const icon = document.getElementById('voiceIcon');
    icon.className = voiceEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
    icon.style.color = voiceEnabled ? "#4CAF50" : "#fff";
};

// --- OTURUM YÖNETİMİ ---
function checkLoginStatus() {
    const rawUser = localStorage.getItem("user_info");
    const menuList = document.querySelector('.menu-list');
    const welcomeHeader = document.getElementById('headerWelcome');
    const headerAvatar = document.getElementById('headerAvatar');

    if (rawUser) {
        const user = JSON.parse(rawUser);
        const displayName = user.hitap || user.name || "Misafir";
        const shortName = displayName.length > 15 ? displayName.substring(0, 12) + "..." : displayName;

        // Sub Header Güncelle
        if(welcomeHeader) welcomeHeader.innerHTML = `Hoş geldin, <b>${shortName}</b>`;
        if(headerAvatar) headerAvatar.src = user.picture || PLACEHOLDER_IMG;

        // Menü
        if(menuList) {
            menuList.innerHTML = `
                <a href="pages/profil.html" class="menu-item highlight" style="background: rgba(230, 194, 91, 0.15); border-color: var(--primary);"><i class="fa-solid fa-user-pen"></i> Profil (Güncelle)</a>
                <a href="pages/hakkimizda.html" class="menu-item link-item"><i class="fa-solid fa-circle-info"></i> Hakkımızda</a>
                <a href="pages/faq.html" class="menu-item link-item"><i class="fa-solid fa-circle-question"></i> S.S.S</a>
                <a href="pages/iletisim.html" class="menu-item link-item"><i class="fa-solid fa-envelope"></i> İletişim</a>
                <a href="pages/gizlilik.html" class="menu-item link-item"><i class="fa-solid fa-shield-halved"></i> Gizlilik Politikası</a>
            `;
        }
    } else {
        if(welcomeHeader) welcomeHeader.innerHTML = "Misafir Girişi";
        if(menuList) {
            menuList.innerHTML = `
                <div class="menu-item highlight" onclick="document.getElementById('authModal').style.display='flex'"><i class="fa-solid fa-user-plus"></i> Giriş Yap / Üye Ol</div>
                <a href="pages/hakkimizda.html" class="menu-item link-item"><i class="fa-solid fa-circle-info"></i> Hakkımızda</a>
            `;
        }
    }
}

window.handleLogout = () => { localStorage.clear(); window.location.reload(); };
window.handleDeleteAccount = () => { if(confirm("Tüm verilerin silinecek?")) { localStorage.clear(); window.location.reload(); } };

// --- MESAJLAŞMA ---
async function sendMessage() {
    if(isBusy) return;
    const input = document.getElementById("text");
    const txt = input.value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { triggerAuth("Önce giriş yap evladım."); return; }
    
    isBusy = true; input.disabled = true; input.style.opacity = "0.5";
    addBubble(txt, 'user');
    input.value = "";
    
    // UI Feedback
    const badge = document.getElementById("caynanaSpeaking");
    badge.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Caynana yazıyor...`;
    badge.classList.add("is-typing");
    addLoading("Caynana düşünüyor...");

    try {
        const user = JSON.parse(localStorage.getItem("user_info") || "{}");
        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("auth_token")}` },
            body: JSON.stringify({ 
                message: txt, 
                mode: window.currentAppMode, 
                persona: currentPersona, // Seçilen kişilik
                user_name: user.hitap || "Evladım" 
            })
        });
        
        removeLoading();
        if (!res.ok) { addBotMessage("Tansiyonum düştü, sonra gel."); isBusy = false; input.disabled=false; input.style.opacity="1"; return; }
        
        const data = await res.json();
        const botText = (data?.assistant_text ?? "...").toString();
        
        // Ses Çalma (Frontend Simülasyonu - Backend entegrasyonu lazım)
        if(voiceEnabled) playAudioSim(botText);

        typeWriterBubble(botText, () => {
            badge.classList.remove("is-typing");
            badge.innerHTML = `<i class="fa-solid fa-comment-dots"></i> Caynana dinliyor...`;
            if (Array.isArray(data?.data) && data.data.length > 0) setTimeout(() => renderProducts(data.data), 250);
        });

    } catch(err) {
        removeLoading(); addBotMessage("Bağlantı koptu.");
    } finally {
        isBusy = false; input.disabled = false; input.style.opacity = "1"; input.focus();
    }
}

function playAudioSim(text) {
    const badge = document.getElementById("caynanaSpeaking");
    badge.innerHTML = `<i class="fa-solid fa-volume-high fa-beat"></i> Caynana Konuşuyor...`;
    // Burada normalde backend'den gelen base64 ses çalınır.
    // Şimdilik sadece UI tepkisi veriyoruz.
    setTimeout(() => {
         badge.innerHTML = `<i class="fa-solid fa-comment-dots"></i> Caynana dinliyor...`;
    }, 5000); // 5 sn konuşuyormuş gibi yap
}

// --- STANDART FONKSİYONLAR ---
function addBubble(text, role) { const c=document.getElementById("chatContainer"); const w=document.createElement("div"); w.className="msg-row "+role; w.innerHTML=`<div class="msg-bubble ${role}">${text}</div>`; c.appendChild(w); c.scrollTo({top:c.scrollHeight,behavior:'smooth'}); }
function addBotMessage(text) { const c=document.getElementById("chatContainer"); c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot">${text}</div></div>`; c.scrollTo({top:c.scrollHeight,behavior:'smooth'}); }
function typeWriterBubble(text, cb) { 
    const c=document.getElementById("chatContainer"); 
    const w=document.createElement("div"); w.className="msg-row bot"; 
    const b=document.createElement("div"); b.className="msg-bubble bot"; 
    w.appendChild(b); c.appendChild(w); 
    let i=0; function step(){ if(i>=text.length){if(cb)cb();return;} b.innerHTML+=text.charAt(i); i++; c.scrollTo({top:c.scrollHeight,behavior:'smooth'}); setTimeout(step,10); } step(); 
}
function addLoading(t) { const c=document.getElementById("chatContainer"); removeLoading(); c.innerHTML+=`<div class="msg-row bot loading-bubble-wrap"><div class="msg-bubble bot">${t} <i class="fa-solid fa-pen-nib fa-fade"></i></div></div>`; c.scrollTo({top:c.scrollHeight,behavior:'smooth'}); }
function removeLoading() { document.querySelectorAll('.loading-bubble-wrap').forEach(el=>el.remove()); }
function updateFooterBars(mode) { /* Çizgi renkleri */ const idx=MODULE_ORDER.indexOf(mode); for(let i=0;i<4;i++){ const t=MODULE_ORDER[(idx+i)%9]; document.getElementById(`line${i+1}`).style.background=MODE_CONFIG[t].color; } }
window.triggerAuth = (msg) => { addBotMessage(msg); document.getElementById("authModal").style.display = "flex"; };
window.handleGoogleLogin = () => { google.accounts.id.prompt(); };
function parseJwt(token) { try{return JSON.parse(decodeURIComponent(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')))}catch(e){return{}} }
async function handleGoogleResponse(r) { 
    const u=parseJwt(r.credential); localStorage.setItem("user_info",JSON.stringify({name:u.name,picture:u.picture,hitap:u.given_name})); 
    try{ const res=await fetch(`${BASE_DOMAIN}/api/auth/google`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:r.credential})}); const d=await res.json(); if(d.token) localStorage.setItem("auth_token",d.token); }catch(e){}
    window.location.href="pages/profil.html"; 
}
window.clearCurrentChat = () => { document.getElementById('chatContainer').innerHTML=''; addBotMessage(MODE_CONFIG[window.currentAppMode].desc); };
