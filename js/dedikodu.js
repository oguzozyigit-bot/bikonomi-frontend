import { showPage, escapeHtml } from "./ui.js";
import { STORAGE_KEY, BASE_DOMAIN } from "./config.js";

let socket = null;
let myID = null;
let myName = "Misafir";
let currentRoom = null;
let isApproved = false; // Odaya kabul edildim mi?

// ID ve İsim Al
function initUser() {
    let user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (!user.caynana_no) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let result = "CN-";
        for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        user.caynana_no = result;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    myID = user.caynana_no;
    myName = user.hitap || user.name || "Misafir";
    return { id: myID, name: myName };
}

export async function openDedikoduPanel() {
    const u = initUser();

    const html = `
        <div style="height:100%; display:flex; flex-direction:column; background:#0e0e0e;">
            
            <div style="padding:15px; border-bottom:1px solid #333; background:#161616; display:flex; flex-direction:column; align-items:center;">
                <h3 style="color:#fff; margin:0 0 5px 0;">🔥 Dedikodu Grubu</h3>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-family:monospace; font-size:14px; color:var(--pistachio); border:1px solid #333; padding:4px 8px; border-radius:6px;">
                        Sen: ${u.name} (${u.id})
                    </span>
                    <button id="copyIdBtn" style="background:none; border:none; cursor:pointer; font-size:16px;">📋</button>
                </div>

                <div style="margin-top:10px; display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="botToggle" checked style="accent-color:var(--gold); width:16px; height:16px;">
                    <label for="botToggle" style="color:#ccc; font-size:12px; cursor:pointer;">Caynana Botları Karışsın</label>
                </div>
            </div>

            <div id="inviteArea" style="padding:20px; background:#111; border-bottom:1px solid #333;">
                <div style="font-size:12px; color:#aaa; margin-bottom:8px;">Grup Kodunu Gir (Arkadaşının CN Kodu):</div>
                <div style="display:flex; gap:10px;">
                    <input id="roomIdInp" type="text" placeholder="CN-XXXXX" 
                           style="flex:1; background:#222; border:1px solid #444; color:#fff; padding:12px; border-radius:8px; outline:none; text-transform:uppercase; font-weight:bold;">
                    <button id="connectBtn" style="background:#fff; color:#000; border:none; padding:0 20px; border-radius:8px; font-weight:bold; cursor:pointer;">İSTEK YOLLA</button>
                </div>
                <div id="connectionStatus" style="font-size:11px; color:var(--gold); margin-top:8px; height:15px; font-weight:bold;"></div>
            </div>

            <div id="requestModal" style="display:none; background:#2e7d32; padding:10px; color:#fff; font-size:12px; align-items:center; justify-content:space-between; gap:10px; border-bottom:1px solid #4caf50;">
                <span id="reqText" style="font-weight:bold;">Ahmet girmek istiyor?</span>
                <div style="display:flex; gap:5px;">
                    <button id="acceptBtn" style="background:#fff; color:#000; border:none; padding:4px 10px; border-radius:4px; font-weight:bold; cursor:pointer;">KABUL ET</button>
                    <button id="rejectBtn" style="background:#b71c1c; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;">X</button>
                </div>
            </div>

            <div id="ddChatArea" style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:12px; opacity:0.3; pointer-events:none;"></div>

            <div style="padding:10px; background:#161616; border-top:1px solid #333; display:flex; gap:10px;">
                <input id="ddInput" type="text" placeholder="Önce odaya gir..." disabled
                       style="flex:1; background:#222; border:none; padding:12px; color:#fff; border-radius:20px; outline:none;">
                <button id="ddSendBtn" disabled style="width:40px; height:40px; border-radius:50%; background:#333; border:none; font-weight:bold; cursor:not-allowed;">➤</button>
            </div>
        </div>
    `;

    showPage("Dedikodu Odası", html);

    setTimeout(() => {
        document.getElementById('copyIdBtn').onclick = () => { navigator.clipboard.writeText(myID); alert("Kodun kopyalandı!"); };

        // Bot Checkbox Değişince
        const botCheck = document.getElementById('botToggle');
        botCheck.onchange = () => {
            if(socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "toggle_bots", status: botCheck.checked }));
            }
        };

        // BAĞLAN BUTONU
        document.getElementById('connectBtn').onclick = () => {
            const roomVal = document.getElementById('roomIdInp').value.trim().toUpperCase();
            if (!roomVal) return alert("Kodu yaz evladım.");
            connectWebSocket(roomVal);
        };

        // GÖNDER BUTONU
        const send = () => {
            const inp = document.getElementById('ddInput');
            const txt = inp.value.trim();
            if(!txt || !socket) return;
            
            socket.send(JSON.stringify({ type: "chat", text: txt }));
            inp.value = "";
        };

        document.getElementById('ddSendBtn').onclick = send;
        document.getElementById('ddInput').onkeydown = (e) => { if(e.key === 'Enter') send(); };
    }, 100);
}

function connectWebSocket(roomName) {
    const status = document.getElementById('connectionStatus');
    status.innerText = "Sunucuya bağlanıyor...";
    status.style.color = "var(--gold)";

    // URL'ye ?name=Ahmet ekliyoruz
    const protocol = BASE_DOMAIN.startsWith("https") ? "wss" : "ws";
    const cleanDomain = BASE_DOMAIN.replace("http://", "").replace("https://", "");
    const wsUrl = `${protocol}://${cleanDomain}/ws/dedikodu/${roomName}/${myID}?name=${encodeURIComponent(myName)}`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        status.innerText = "Bağlandı. İçeriye istek gönderildi, bekleniyor...";
        
        // Eğer odayı kuran kişi (kodu aynı olan) sensen direkt girersin
        if (roomName === myID) {
            status.innerText = "Oda senin. Bekliyorsun...";
            activateChat(true);
        } else {
            // Başkasının odasıysa izin iste
            socket.send(JSON.stringify({ type: "join_request" }));
        }
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleIncomingMessage(data);
    };

    socket.onclose = () => {
        status.innerText = "Bağlantı koptu.";
        status.style.color = "red";
        activateChat(false);
    };
}

function activateChat(isActive) {
    const chat = document.getElementById('ddChatArea');
    const inp = document.getElementById('ddInput');
    const btn = document.getElementById('ddSendBtn');
    const status = document.getElementById('connectionStatus');
    const inviteArea = document.getElementById('inviteArea');

    if (isActive) {
        chat.style.opacity = "1";
        chat.style.pointerEvents = "auto";
        inp.disabled = false;
        inp.placeholder = "Gıybet başlasın...";
        btn.disabled = false;
        btn.style.background = "var(--pistachio)";
        btn.style.cursor = "pointer";
        status.innerText = "SOHBETTESİN ✅";
        status.style.color = "#bef264";
        inviteArea.style.display = "none";
        isApproved = true;
    } else {
        chat.style.opacity = "0.3";
        chat.style.pointerEvents = "none";
        inp.disabled = true;
        btn.disabled = true;
        isApproved = false;
    }
}

function handleIncomingMessage(data) {
    // 1. Biri Girmek İstiyor (Bildirim)
    if (data.type === "join_request_notify") {
        if (data.requester_id !== myID) {
            const modal = document.getElementById('requestModal');
            const txt = document.getElementById('reqText');
            const acc = document.getElementById('acceptBtn');
            const rej = document.getElementById('rejectBtn');
            
            modal.style.display = "flex";
            txt.innerText = `${data.requester_name} girmek istiyor.`;
            
            acc.onclick = () => {
                socket.send(JSON.stringify({ type: "join_accept", target_id: data.requester_id }));
                modal.style.display = "none";
            };
            rej.onclick = () => {
                modal.style.display = "none";
            };
        }
    }

    // 2. Biri Kabul Edildi (Kapı Açılıyor)
    else if (data.type === "join_approved") {
        if (data.target_id === myID) {
            activateChat(true); 
            addDedikoduBubble("Odaya kabul edildin.", "system");
        } else {
             if(isApproved) addDedikoduBubble("Yeni biri odaya katıldı.", "system");
        }
    }

    // 3. Normal Chat
    else if (data.type === "chat") {
        if(!isApproved) return; 
        const isMe = data.sender_id === myID;
        addDedikoduBubble(data.text, isMe ? "me" : "friend", data.sender_name);
    }
    
    // 4. Sistem & Botlar
    else if (data.type === "system") {
        if(isApproved) addDedikoduBubble(data.text, "system");
    }
    else if (data.type === "bot_support" || data.type === "bot_attack") {
        if(!isApproved) return;
        const type = data.type === "bot_support" 
            ? (data.target === myID ? "my-bot" : "enemy-bot-support")
            : (data.target === myID ? "enemy-bot" : "my-bot-attack");
        
        addDedikoduBubble(data.text, type);
    }
}

function addDedikoduBubble(text, type, senderName) {
    const chat = document.getElementById('ddChatArea');
    if(!chat) return;
    const div = document.createElement('div');
    div.style.padding = "8px 12px"; div.style.borderRadius = "12px"; div.style.fontSize = "13px";
    div.style.marginBottom = "8px"; div.style.maxWidth = "85%"; div.style.wordWrap = "break-word";
    
    let nameTag = senderName ? `<span style="font-size:9px; font-weight:bold; opacity:0.8; display:block; margin-bottom:2px;">${senderName}</span>` : "";

    if(type === "me") {
        div.style.alignSelf = "flex-end"; div.style.background = "#2e7d32"; div.style.color = "#fff"; div.style.borderBottomRightRadius = "2px";
        div.innerHTML = text;
    } else if(type === "friend") {
        div.style.alignSelf = "flex-start"; div.style.background = "#333"; div.style.color = "#ddd"; div.style.borderBottomLeftRadius = "2px";
        div.innerHTML = nameTag + text;
    } else if(type === "my-bot") {
        div.style.alignSelf = "flex-end"; div.style.background = "#FFB300"; div.style.color = "#000"; div.style.fontWeight = "600";
        div.innerHTML = `<span style="font-size:9px;opacity:0.7;">SENİN CAYNANA:</span><br>${text}`;
    } else if(type === "enemy-bot" || type === "enemy-bot-support" || type === "my-bot-attack") {
        div.style.alignSelf = "flex-start"; div.style.background = "#b71c1c"; div.style.color = "#fff";
        div.innerHTML = `<span style="font-size:9px;opacity:0.7;">ELTİNİN CAYNANASI:</span><br>${text}`;
    } else {
        div.style.alignSelf = "center"; div.style.fontSize = "10px"; div.style.color = "#666"; div.innerText = text;
    }
    chat.appendChild(div); chat.scrollTop = chat.scrollHeight;
}
