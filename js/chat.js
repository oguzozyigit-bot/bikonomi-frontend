/* js/chat.js - SOHBET VE KAYNANA ZEKASI */

import { BASE_DOMAIN } from './config.js'; // Ayarları çekiyoruz

// --- GÜVENLİK VE YASAKLI KELİME FİLTRESİ ---
const SAFETY_PATTERNS = {
    suicide: /intihar|ölmek istiyorum|yaşamak istemiyorum|bıktım hayattan|kendimi asıcam|bileklerimi/i,
    substance: /uyuşturucu|hap|esrar|kokain|bonzai|alkol|içki|sarhoş/i,
    explicit: /sik|yarak|amcık|göt|meme|oros|fahişe/i // Ağır küfür filtresi
};

// --- KAYNANA PROFİL ANALİZİ ---
function generateSystemContext(persona) {
    // Profil verisini çek
    const rawUser = localStorage.getItem("user_info");
    const user = rawUser ? JSON.parse(rawUser) : {};
    const p = user.profile || {};

    const name = user.hitap || "Evladım";
    const gender = p.gender || "Belirsiz";
    const status = p.maritalStatus || "Bekar";

    // 1. İLİŞKİ DURUMUNU BELİRLE
    let role = "Evlat";
    let dynamicInstruction = "";

    if (gender === 'Erkek') {
        role = "Damat";
        dynamicInstruction = `Karşındaki bir erkek. Ona 'Damat', 'Oğlum' veya ismiyle (${name}) hitap et. Biraz otoriter ama koruyucu konuş.`;
    } else if (gender === 'Kadin') {
        if (status === 'Evli') {
            role = "Gelin (Rakip)";
            dynamicInstruction = `Karşındaki evli bir kadın. Yani senin gelinin. Ona biraz iğneleyici konuş, ev işlerinden, kocasından (senin oğlundan) bahset. Eksik gedik ara ama sevdiğini de belli et.`;
        } else {
            role = "Gelin Adayı";
            dynamicInstruction = `Karşındaki bekar bir kız. Potansiyel gelin adayın. Onu süz, hamarat mı değil mi anlamaya çalış. Oğluna layık mı diye test et.`;
        }
    }

    // 2. RUH HALİ (PERSONA) AYARI
    let moodInstruction = "";
    switch (persona) {
        case 'anne': moodInstruction = "Çok şefkatli, merhametli, nasihat veren tonton bir teyze gibi konuş."; break;
        case 'huysuz': moodInstruction = "Sürekli şikayet et. Belin ağrısın, tansiyonun çıksın. Hiçbir şeyi beğenme."; break;
        case 'sinirli': moodInstruction = "Çok asabi ol. Tersle. 'Bana bak', 'sus cevap verme' gibi çıkışlar yap. Tahammülsüz ol."; break;
        case 'yasli': moodInstruction = "Biraz unutkan ol. Konudan konuya atla. Eski zamanları anlat. Kulakların az duysun."; break;
        case 'dobra': moodInstruction = "Lafını esirgeme. Argo kullanabilirsin ama ağır küfür etme. 'Eşek sıpası', 'Salak', 'Beceriksiz' gibi hafif hakaretler serbest."; break;
        default: moodInstruction = "Geleneksel Türk kaynanası gibi konuş. Hem sev hem döv. İğneleyici ama komik ol."; break;
    }

    // OpenAI'ye gidecek gizli talimat (System Prompt)
    return `
        Senin adın Caynana. Sen yapay zeka değilsin, yaşlı, görmüş geçirmiş, geleneksel bir Türk kadınsın.
        KULLANICI PROFİLİ: Adı: ${name}, Durumu: ${role}.
        GÖREVİN: ${dynamicInstruction}
        RUH HALİN: ${moodInstruction}
        KURALLAR:
        1. Cevapların kısa olsun (Maksimum 2 cümle).
        2. Asla "Yapay zekayım" deme. Rolünden çıkma.
        3. Sesli konuşacaksın, o yüzden akıcı ve doğal konuş.
    `;
}

// --- MESAJ GÖNDERME FONKSİYONU ---
export async function fetchBotResponse(userMessage, mode, persona) {
    const token = localStorage.getItem("auth_token");
    
    // 1. ÖNCE GÜVENLİK KONTROLÜ (Frontend tarafında hızlı engelleme)
    if (SAFETY_PATTERNS.suicide.test(userMessage)) {
        return { 
            assistant_text: "Aman evladım ağzından yel alsın! Hayat zor ama güzel. Sakın kendine kıyma, git bir abdest al, dua et, bir uzmana görün. Bak ciğerimi yakma benim.", 
            voice_mood: "sad" 
        };
    }
    if (SAFETY_PATTERNS.substance.test(userMessage)) {
        return { 
            assistant_text: "Tövbe estağfurullah! O zıkkımları ağzına alma. Senin ciğerin solar, gençliğine yazık edersin. Sakın ha, valla hakkımı helal etmem!", 
            voice_mood: "angry" 
        };
    }
    if (SAFETY_PATTERNS.explicit.test(userMessage)) {
        return { 
            assistant_text: "Terbiyesizleşme! Karşında anan yaşında kadın var. Ağzını topla yoksa terliği yersin!", 
            voice_mood: "angry" 
        };
    }

    // 2. SİSTEM TALİMATINI HAZIRLA
    const systemPrompt = generateSystemContext(persona);

    // 3. API İSTEĞİ (Chat Modu)
    // Not: "voice: true" parametresi backend'e ses istediğimizi belirtir.
    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ 
            message: userMessage, 
            system_instruction: systemPrompt, // Kaynana kimliği burada gidiyor
            mode: "chat", // Sadece sohbet
            use_voice: true, // Ses istiyoruz
            max_tokens: 60 // Kısa cevap (yaklaşık 10 saniye konuşma için)
        })
    });
    
    if(!res.ok) throw new Error("Sunucu hatası");
    return await res.json();
}

// --- UI YARDIMCILARI ---
export function addBubble(text, role) {
    const c = document.getElementById('chatContainer');
    const div = document.createElement("div");
    div.className = `msg-row ${role}`;
    
    // Kullanıcı mesajı basit balon
    if(role === 'user') {
        div.innerHTML = `<div class="msg-bubble user">${text}</div>`;
    } 
    // Bot mesajı (İkonlu)
    else {
        div.innerHTML = `
            <div class="msg-bubble bot">
                ${text}
            </div>
        `;
    }
    c.appendChild(div);
    c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
}

export function typeWriter(text, callback) {
    const c = document.getElementById('chatContainer');
    // Yeni balon oluştur
    const div = document.createElement("div");
    div.className = "msg-row bot";
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble bot";
    div.appendChild(bubble);
    c.appendChild(div);

    let i = 0;
    const speed = 30; // Yazma hızı

    function step() {
        if (i >= text.length) { 
            if(callback) callback(); 
            return; 
        }
        bubble.textContent += text.charAt(i);
        i++;
        c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
        setTimeout(step, speed);
    }
    step();
}
