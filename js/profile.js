/* js/profile.js (FIXED v9907 - initProfile EKLENDİ) */
import { BASE_DOMAIN } from './main.js';
import { currentUser } from './auth.js';

let currentProfile = {};

// ✅ EKSİK OLAN FONKSİYON BU! (Main.js bunu arıyor)
export function initProfile() {
    console.log("👤 Profil Modülü Başlatılıyor...");
    
    // Kaydet butonunu dinle
    const saveBtn = document.getElementById('profileSave');
    if (saveBtn) {
        // Önce temizle (varsa) sonra ekle
        saveBtn.removeEventListener('click', saveProfile);
        saveBtn.addEventListener('click', saveProfile);
    }

    // Modal kapatma tuşu
    const closeBtn = document.getElementById('profileCloseX');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
             const modal = document.getElementById('profileModal');
             if(modal) modal.style.display = 'none';
        });
    }
}

// --- PROFİLİ YÜKLE ---
export async function loadProfile(forceCheck = false) {
    if (!currentUser) return;

    try {
        const res = await fetch(`${BASE_DOMAIN}/api/profile/me`, {
            headers: { "Authorization": `Bearer ${currentUser.token}` }
        });
        const data = await res.json();
        
        if (res.ok) {
            const prof = data.profile || {};
            currentProfile = prof;
            
            // Arayüzü Doldur (Drawer'daki isim vb.)
            updateUI(prof, data.user_id, data.plan);
            
            // Modal içindeki inputları doldur
            fillForm(prof);

            // ZORUNLU KONTROL (İlk giriş mi?)
            if (forceCheck) {
                if (!isProfileValid(prof)) {
                    console.log("⚠️ Profil eksik! Zorunlu açılıyor...");
                    openProfileModal(false); // false = kapatılamaz
                }
            }
        }
    } catch (err) {
        console.error("Profil Yükleme Hatası:", err);
    }
}

// --- MODAL AÇMA ---
export function openProfileModal(canClose = true) {
    const modal = document.getElementById('profileModal');
    const closeBtn = document.getElementById('profileCloseX');
    
    if (modal) {
        modal.style.display = 'flex'; // app.css'teki modalMask display: flex'i tetikler
        
        // Eğer zorunluysa kapatma tuşunu gizle
        if (!canClose) {
            if (closeBtn) closeBtn.style.display = 'none';
        } else {
            if (closeBtn) closeBtn.style.display = 'block';
        }
    }
}

// --- KAYDETME İŞLEMİ ---
export async function saveProfile() {
    // Formdan verileri al
    const p = {
        name: val('pfFullName'),
        nick: val('pfNick'),
        gender: val('pfGender'),
        age: val('pfAge'),
        height: val('pfHeight'),
        weight: val('pfWeight'),
        // Opsiyoneller
        bio: val('pfBio'),
        marital: val('pfMarital'),
        kids: val('pfKids'),
        kids_count: val('pfKidsCount'),
        kids_ages: val('pfKidsAges'),
        spouse_name: val('pfSpouseName'),
        city: val('pfCity'),
        job: val('pfJob'),
        priority: val('pfPriority')
    };

    // Zorunlu Alan Kontrolü
    if (!p.name || !p.nick || !p.gender || !p.age || !p.height || !p.weight) {
        alert("Evladım zorunlu alanları (Ad, Takma Ad, Cinsiyet, Yaş, Boy, Kilo) doldurmadan seni bırakmam!");
        return;
    }

    const statusDiv = document.getElementById('profileStatus');
    if (statusDiv) statusDiv.innerText = "Kaydediliyor...";

    try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`${BASE_DOMAIN}/api/profile/set`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ profile: p })
        });

        if (res.ok) {
            if (statusDiv) statusDiv.innerText = "Aferin, kaydettim.";
            
            // Modalı kapatmaya izin ver ve kapat
            const closeBtn = document.getElementById('profileCloseX');
            if (closeBtn) closeBtn.style.display = 'block';
            
            setTimeout(() => {
                const modal = document.getElementById('profileModal');
                if(modal) modal.style.display = 'none';
                if(statusDiv) statusDiv.innerText = "";
            }, 1000);
            
            // UI güncelle
            loadProfile(false);
        } else {
            if (statusDiv) statusDiv.innerText = "Hata oluştu.";
        }
    } catch (e) {
        console.error(e);
        if (statusDiv) statusDiv.innerText = "Sunucu hatası.";
    }
}

// --- YARDIMCILAR ---
function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

function setVal(id, v) {
    const el = document.getElementById(id);
    if (el && v) el.value = v;
}

function fillForm(p) {
    setVal('pfFullName', p.name);
    setVal('pfNick', p.nick);
    setVal('pfGender', p.gender);
    setVal('pfAge', p.age);
    setVal('pfHeight', p.height);
    setVal('pfWeight', p.weight);
    setVal('pfBio', p.bio);
    setVal('pfMarital', p.marital);
    setVal('pfKids', p.kids);
    setVal('pfKidsCount', p.kids_count);
    setVal('pfKidsAges', p.kids_ages);
    setVal('pfSpouseName', p.spouse_name);
    setVal('pfCity', p.city);
    setVal('pfJob', p.job);
    setVal('pfPriority', p.priority);
}

function updateUI(p, uid, plan) {
    // Drawer içindeki alanlar
    const dName = document.getElementById('dpName');
    const dPlan = document.getElementById('dpPlan');
    const dCN = document.getElementById('dpCN');
    
    // Modal içindeki başlık
    const pEmail = document.getElementById('profileEmail');
    const pCN = document.getElementById('profileCN');
    const pPlan = document.getElementById('profilePlan');
    const pAvatar = document.getElementById('profileAvatar');
    const dAvatar = document.getElementById('dpAvatar');

    const name = p.nick || p.name || "Evladım";
    const idStr = uid || "CN-????";
    const planStr = (plan || "FREE").toUpperCase();

    if (dName) dName.innerText = name;
    if (dPlan) dPlan.innerText = planStr;
    if (dCN) dCN.innerText = idStr;

    if (pEmail) pEmail.innerText = name; 
    if (pCN) pCN.innerText = idStr;
    if (pPlan) pPlan.innerText = planStr;

    if (p.avatar) {
        if (pAvatar) pAvatar.src = p.avatar;
        if (dAvatar) dAvatar.src = p.avatar;
    }
}

function isProfileValid(p) {
    return (p.name && p.nick && p.gender && p.age && p.height && p.weight);
}
