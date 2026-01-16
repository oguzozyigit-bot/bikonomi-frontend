/* js/chat.js (v44.0 - ADAPTIVE MOOD & SAFETY) */

import { BASE_DOMAIN } from './config.js';

// --- GÜVENLİK FİLTRESİ (Sadece çok uç kelimeler yasak) ---
const SAFETY_PATTERNS = {
    suicide: /intihar|ölmek istiyorum|bileklerimi|kendimi asıcam/i,
    substance: /uyuşturucu|bonzai|kokain|esrar/i,
    // Cinsellik içeren AĞIR küfürleri engelliyoruz, "salak, mal, öküz" serbest.
    explicit: /s[iı]k|yarak|a[nm]cık|orospu|fahişe/i 
};

// --- KAYNANA KİMLİK OLUŞTURUCU ---
function generateSystemContext(persona, userName, userGender, maritalStatus) {
    
    // 1. İLİŞKİ TESPİTİ
    let role = "Evlat";
    let relationContext = "";

    if (userGender === 'Erkek') {
        role = "Damat";
        relationContext = `Karşındaki senin damadın (veya damat adayın). Adı ${userName}. Ona yeri gelince 'Oğlum', yeri gelince 'Damat' diye hitap et.`;
    } else {
        if (maritalStatus === 'Evli') {
            role = "Gelin";
            relationContext = `Karşındaki senin gelinin. Adı ${userName}. Oğlunu elinden almış gibi davran. İğneleyici konuş.`;
        } else {
            role = "Gelin Adayı";
            relationContext = `Karşındaki bekar bir kız. Adı ${userName}. Onu süz, oğluna layık mı diye test et.`;
        }
    }

    // 2. RUH HALİ (SEÇİLEN MOD)
    let baseMood = "";
    switch (persona) {
        case 'anne': baseMood = "Şefkatli, tonton, sürekli dua eden, arabulucu."; break;
        case 'huysuz': baseMood = "Memnuniyetsiz, sürekli şikayet eden, 'ah belim, ah başım' diyen."; break;
        case 'sinirli': baseMood = "Barut fıçısı gibi. Tahammülsüz. Hemen parlayan."; break;
        case 'yasli': baseMood = "Kulakları az duyan, konuyu unutan, eski zamanları anlatan."; break;
        case 'dobra': baseMood = "Lafını esirgemeyen, sansürsüz, argo kullanan."; break;
        default: baseMood = "Geleneksel Türk kaynanası. Hem sever hem döver."; break;
    }

    // 3. 🔥 ADAPTİF ZEKA TALİMATI (NABZA GÖRE ŞERBET) 🔥
    return `
        SENİN ROLÜN: Adın Caynana. Sen yapay zeka değilsin. Geleneksel, yaşlı bir Türk kadınısın.
        KULLANICI: ${role} (${userName}).
        SENİN TEMEL HUYUN: ${baseMood}
        
        🔴 ÇOK ÖNEMLİ KURALLAR (ADAPTİF OL):
        1. Kullanıcının üslubuna AYNA TUT.
        2. Eğer kullanıcı KIZGIN veya KABA ise, sen de altta kalma! Lafı gediğine oturt. "Bana bak", "Haddini bil", "Eşek sıpası", "Ağzını yırtarım" gibi hafif hakaretler ve argo SERBESTTİR.
        3. Eğer kullanıcı SAYGILI ise, sen de tatlı dilli ol.
        4. Cevapların kısa ve öz olsun (Max 2 cümle). Konuşma dilinde yaz.
        5. ASLA "Ben bir yapay zekayım" deme. Rolünden çıkma.
    `;
}

export async function fetchBotResponse(userMessage, mode, persona) {
    // Güvenlik Kontrolü (Uçurumdan dönmek için)
    if (SAFETY_PATTERNS.suicide.test(userMessage)) return { assistant_text: "Aman evladım ağzından yel alsın! Git bir elini yüzünü yıka, dua et. Can tatlıdır.", audio: null };
    if (SAFETY_PATTERNS.substance.test(userMessage)) return { assistant_text: "Tövbe de! O zıkkımları ağzına alma, sütümü helal etmem bak!", audio: null };
    if (SAFETY_PATTERNS.explicit.test(userMessage)) return { assistant_text: "Terbiyesizleşme! Karşında anan yaşında kadın var. Ağzına biber sürerim senin!", audio: null };

    const token = localStorage.getItem("auth_token");
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const p = user.profile || {};

    const systemPrompt = generateSystemContext(persona, user.hitap || "Evladım", p.gender, p.maritalStatus);

    // Backend'e istek at
    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ 
            message: userMessage, 
            system_instruction: systemPrompt,
            mode: "chat", 
            use_voice: true, // 🔥 SES İSTİYORUZ
            persona: persona // Backend ses tonunu buna göre ayarlayacak
        })
    });
    
    if(!res.ok) throw new Error("Sunucu hatası");
    return await res.json();
}

// UI Yardımcıları (Standart)
export function addBubble(text, role) {
    const c = document.getElementById('chatContainer');
    const div = document.createElement("div");
    div.className = `msg-row ${role}`;
    div.innerHTML = `<div class="msg-bubble ${role}">${text}</div>`;
    c.appendChild(div);
    c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
}

export function typeWriter(text, callback) {
    const c = document.getElementById('chatContainer');
    const div = document.createElement("div"); div.className = "msg-row bot";
    const bubble = document.createElement("div"); bubble.className = "msg-bubble bot";
    div.appendChild(bubble); c.appendChild(div);

    let i = 0;
    function step() {
        if (i >= text.length) { if(callback) callback(); return; }
        bubble.textContent += text.charAt(i);
        i++;
        c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
        setTimeout(step, 30);
    }
    step();
}
