// FILE: /js/gossip_page.js
// GROUP CHAT (max 10) + invite/accept + ephemeral messages (sessionStorage)
// ✅ Only text
// ✅ Mic fills textarea (no auto-send). Send via airplane or Enter.
// ✅ Optional local Kaynana interjection (checkbox). Only local user sees it.
// ✅ Leave -> notify others + remove member
// ✅ Room close -> clear messages for all (ephemeral)

import { initMenuHistoryUI } from "/js/menu_history_ui.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2600);
}

function getUser(){
  const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
  const id = String(u.user_id || u.id || u.email || "").trim() || "guest";
  const name = String(u.fullname || u.display_name || u.name || u.email || id).trim();
  const sp = clamp(parseInt(u.sp_score ?? 10,10)||10, 0, 100);
  return { id, name, sp };
}

function syncTopUI(){
  try{
    const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const s = clamp(parseInt(u.sp_score ?? 10,10)||10, 0, 100);
    if($("ypFill")) $("ypFill").style.width = `${s}%`;
    if($("ypNum")) $("ypNum").textContent = `${s}/100`;
    if($("planChip")) $("planChip").textContent = String(u.plan || "FREE").toUpperCase();
  }catch{}
}

/* =========================================================
   Storage model
   - Invites (localStorage): per user inbox
   - Room metadata (localStorage): participants list, accepted state
   - Messages (sessionStorage): ephemeral, wiped on close/leave/refresh
   - Realtime (BroadcastChannel): between tabs/devices (same origin)
========================================================= */

function inboxKey(uid){ return `caynana_gossip_inbox:${uid}`; }
function roomMetaKey(roomId){ return `caynana_gossip_meta:${roomId}`; }
function roomMsgKey(roomId){ return `caynana_gossip_msgs:${roomId}`; } // sessionStorage
function myRoomKey(uid){ return `caynana_gossip_myroom:${uid}`; }      // localStorage

function loadInbox(uid){ return safeJson(localStorage.getItem(inboxKey(uid)), []); }
function saveInbox(uid, arr){ localStorage.setItem(inboxKey(uid), JSON.stringify(arr||[])); }

function pushInbox(uid, item){
  const arr = loadInbox(uid);
  arr.unshift(item);
  saveInbox(uid, arr.slice(0,30));
}

function genRoomId(meId){
  return `room_${meId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
}

function loadRoomMeta(roomId){
  return safeJson(localStorage.getItem(roomMetaKey(roomId)), null);
}
function saveRoomMeta(roomId, meta){
  localStorage.setItem(roomMetaKey(roomId), JSON.stringify(meta||{}));
}

function loadMsgs(roomId){
  return safeJson(sessionStorage.getItem(roomMsgKey(roomId)), []);
}
function saveMsgs(roomId, msgs){
  sessionStorage.setItem(roomMsgKey(roomId), JSON.stringify(msgs||[]));
}

function setMyRoom(uid, roomId){
  if(roomId) localStorage.setItem(myRoomKey(uid), roomId);
  else localStorage.removeItem(myRoomKey(uid));
}
function getMyRoom(uid){
  return (localStorage.getItem(myRoomKey(uid)) || "").trim() || "";
}

function bcName(roomId){ return `caynana_gossip_bc:${roomId}`; }
let bc = null;

/* =========================================================
   UI helpers
========================================================= */

function escapeHTML(s=""){
  return String(s).replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function setHeader(meta){
  const title = $("roomTitle");
  const info = $("roomMeta");

  if(!meta){
    title.textContent = "Henüz oda yok";
    info.textContent = "ID ekle + onay";
    return;
  }

  title.textContent = `Kazan: ${meta.title || "Dedikodu"}`;
  info.textContent = `${meta.members.length}/10 kişi`;
}

function renderInbox(){
  const me = getUser();
  const inbox = loadInbox(me.id);
  $("inboxCount").textContent = String(inbox.length||0);

  const box = $("inbox");
  box.innerHTML = "";

  if(!inbox.length){
    box.classList.remove("show");
    return;
  }
  box.classList.add("show");

  inbox.forEach((it)=>{
    const row = document.createElement("div");
    row.className = "req";
    row.innerHTML = `
      <div class="l">
        <div class="id"><b>İstek:</b> ${escapeHTML(it.fromId)}</div>
        <div class="nm">${escapeHTML(it.fromName || "—")}</div>
      </div>
      <div class="r">
        <button class="btn" data-act="ok">Onayla</button>
        <button class="btn secondary" data-act="no">Reddet</button>
      </div>
    `;

    row.querySelector('[data-act="ok"]').addEventListener("click", ()=> acceptInvite(it));
    row.querySelector('[data-act="no"]').addEventListener("click", ()=> rejectInvite(it));
    box.appendChild(row);
  });
}

function renderChat(roomId){
  const me = getUser();
  const meta = roomId ? loadRoomMeta(roomId) : null;
  setHeader(meta);

  const sc = $("chat");
  sc.innerHTML = "";

  if(!roomId || !meta){
    sc.innerHTML = `<div class="bubble other">Henüz kazan kaynamıyor evladım. ID ekle, onay gelsin 🙂</div>`;
    return;
  }

  const msgs = loadMsgs(roomId);
  if(!msgs.length){
    sc.innerHTML = `<div class="bubble sys">Sohbet başladı. Dedikodu serbest ama ölçülü 🙂</div>`;
    return;
  }

  msgs.forEach(m=>{
    const div = document.createElement("div");
    if(m.type === "sys"){
      div.className = "bubble sys";
      div.textContent = m.text;
    }else if(m.type === "kaynana"){
      // local-only
      div.className = "bubble kaynana";
      div.innerHTML = `<div class="tag">Kaynana (sadece sen)</div>${escapeHTML(m.text)}`;
    }else{
      div.className = `bubble ${m.fromId === me.id ? "me" : "other"}`;
      div.textContent = m.text;
    }
    sc.appendChild(div);
  });

  sc.scrollTop = sc.scrollHeight;
}

function autoGrow(){
  const ta = $("msg");
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
}

/* =========================================================
   Kaynana comment by SP
========================================================= */
function kaynanaTone(sp){
  if(sp < 20) return "sert";
  if(sp < 40) return "normal";
  if(sp < 70) return "samimi";
  return "evladim_modu";
}

function kaynanaComment(sp, userText){
  const t = kaynanaTone(sp);
  const s = String(userText||"").trim().toLowerCase();

  if(t === "sert"){
    return "Evladım… sen yine fazla konuştun. Dedikodu var diye her şeyi yazılmaz.";
  }
  if(t === "evladim_modu"){
    return "Canım evladım… tamam tamam, ben anladım. Ama yine de ölçüyü kaçırma 🙂";
  }

  const spicy = [
    "Heh! Kazan kaynadı… ama taşırma evladım.",
    "Bunu yazdın ya… karşı tarafın kaşı kalkar 🙂",
    "Biraz daha yazarsan dumanı komşu görür.",
    "Sen yaz, ben araya gerçekleri koyarım."
  ];
  const praise = [
    "Aferin… bu sefer akıllı yazdın.",
    "Bak bu cümle tam ‘kıvamında’. Helal.",
    "Kaynana onayladı. Çok şımarmadan devam 🙂"
  ];

  if(s.includes("özür") || s.includes("hakli") || s.includes("pardon")) return praise[Math.floor(Math.random()*praise.length)];
  return spicy[Math.floor(Math.random()*spicy.length)];
}

/* =========================================================
   Invite / accept flow
========================================================= */
function normalizeId(x){ return String(x||"").trim(); }

function sendInvite(peerId){
  const me = getUser();
  const peer = normalizeId(peerId);

  if(!peer || peer.length < 4) return toast("Evladım düzgün bir ID yaz.");
  if(peer === me.id) return toast("Kendinle dedikodu mu yapacaksın evladım? 🙂");

  // if I already have room, don't allow (design decision)
  const myRoom = getMyRoom(me.id);
  if(myRoom){
    toast("Evladım zaten bir kazandasın. Önce ayrıl, sonra yeni kişi ekle.");
    return;
  }

  // create room meta
  const roomId = genRoomId(me.id);
  const meta = {
    roomId,
    title: "Dedikodu Kazanı",
    hostId: me.id,
    members: [{ id: me.id, name: me.name }],
    pending: [{ id: peer, name: "" }],
    createdAt: Date.now(),
    open: true
  };
  saveRoomMeta(roomId, meta);

  // store my room
  setMyRoom(me.id, roomId);

  // send invite to peer inbox
  pushInbox(peer, {
    type: "invite",
    roomId,
    fromId: me.id,
    fromName: me.name,
    at: Date.now()
  });

  // create first sys msg (ephemeral)
  saveMsgs(roomId, [{ type:"sys", text:`${me.name} kazanı kurdu. ${peer} bekleniyor…`, at: Date.now() }]);

  openRoom(roomId);
  toast("İstek gitti evladım. Onay gelince başlarız.");
}

function acceptInvite(inv){
  const me = getUser();
  const roomId = inv.roomId;
  const meta = loadRoomMeta(roomId);

  if(!meta || !meta.open){
    toast("Evladım bu istek bayatlamış. Oda kapalı.");
    // remove from inbox
    saveInbox(me.id, loadInbox(me.id).filter(x => !(x.roomId===roomId)));
    renderInbox();
    return;
  }

  // capacity check
  if(meta.members.length >= 10){
    toast("Evladım bu kazan dolu (10 kişi). Giremezsin.");
    saveInbox(me.id, loadInbox(me.id).filter(x => !(x.roomId===roomId)));
    renderInbox();
    return;
  }

  // join
  meta.members.push({ id: me.id, name: me.name });
  meta.pending = (meta.pending||[]).filter(p => p.id !== me.id && p.id !== inv.fromId);
  saveRoomMeta(roomId, meta);

  setMyRoom(me.id, roomId);

  // inbox remove
  saveInbox(me.id, loadInbox(me.id).filter(x => !(x.roomId===roomId)));
  renderInbox();

  // broadcast join + add system message (ephemeral)
  const msgs = loadMsgs(roomId);
  msgs.push({ type:"sys", text:`${me.name} katıldı. Kazan kızışıyor 🙂`, at: Date.now() });
  saveMsgs(roomId, msgs);

  // notify others
  broadcast(roomId, { kind:"joined", user:{ id: me.id, name: me.name } });

  openRoom(roomId);
  toast("Onayladın. Hadi yaz bakalım 🙂");
}

function rejectInvite(inv){
  const me = getUser();
  saveInbox(me.id, loadInbox(me.id).filter(x => !(x.roomId===inv.roomId)));
  renderInbox();
  toast("Reddettin. Kazanı soğuttun evladım 🙂");
}

/* =========================================================
   Room open / close / leave
========================================================= */
function closeBC(){
  try{ bc?.close?.(); }catch{}
  bc = null;
}

function openRoom(roomId){
  // open BroadcastChannel
  closeBC();
  bc = new BroadcastChannel(bcName(roomId));
  bc.onmessage = (ev)=> onBC(roomId, ev.data);

  // render
  renderChat(roomId);
  updateRoomHeaderRoom(roomId);
}

function updateRoomHeaderRoom(roomId){
  const meta = loadRoomMeta(roomId);
  setHeader(meta);
}

function broadcast(roomId, payload){
  try{
    const c = new BroadcastChannel(bcName(roomId));
    c.postMessage(payload);
    c.close();
  }catch{}
}

function leaveRoom(){
  const me = getUser();
  const roomId = getMyRoom(me.id);
  if(!roomId) return toast("Evladım zaten odada değilsin.");

  const meta = loadRoomMeta(roomId);
  if(meta){
    meta.members = (meta.members||[]).filter(m => m.id !== me.id);
    saveRoomMeta(roomId, meta);

    // system message local
    const msgs = loadMsgs(roomId);
    msgs.push({ type:"sys", text:`${me.name} ayrıldı.`, at: Date.now() });
    saveMsgs(roomId, msgs);

    // notify others
    broadcast(roomId, { kind:"left", user:{ id: me.id, name: me.name } });

    // if room empty => close for all
    if(meta.members.length === 0){
      meta.open = false;
      saveRoomMeta(roomId, meta);
      broadcast(roomId, { kind:"closed" });
    }
  }

  // clear my session
  sessionStorage.removeItem(roomMsgKey(roomId));
  setMyRoom(me.id, "");
  closeBC();
  renderChat("");
  toast("Ayrıldın evladım.");
}

/* =========================================================
   Message send (text only)
========================================================= */
function sendText(){
  const me = getUser();
  const roomId = getMyRoom(me.id);
  if(!roomId) return toast("Evladım önce odaya gir.");

  const meta = loadRoomMeta(roomId);
  if(!meta || !meta.open) return toast("Evladım oda kapalı.");

  const txt = String($("msg").value||"").trim();
  if(!txt) return;

  $("msg").value = "";
  autoGrow();

  const msgs = loadMsgs(roomId);
  msgs.push({ type:"msg", fromId: me.id, fromName: me.name, text: txt, at: Date.now() });

  // Kaynana local only (checkbox)
  if($("kaynanaOn").checked){
    const ktxt = kaynanaComment(me.sp, txt);
    msgs.push({ type:"kaynana", fromId:"k", fromName:"Kaynana", text: ktxt, at: Date.now() });
  }

  saveMsgs(roomId, msgs);
  renderChat(roomId);

  // broadcast only the user msg (NOT kaynana)
  broadcast(roomId, { kind:"msg", msg:{ type:"msg", fromId: me.id, fromName: me.name, text: txt, at: Date.now() } });
}

/* =========================================================
   BroadcastChannel receive
========================================================= */
function onBC(roomId, data){
  if(!data) return;

  const me = getUser();

  if(data.kind === "msg"){
    // store only normal messages
    const msgs = loadMsgs(roomId);
    // prevent duplicate (same timestamp+from+text)
    const exists = msgs.some(m => m.type==="msg" && m.fromId===data.msg.fromId && m.at===data.msg.at && m.text===data.msg.text);
    if(!exists){
      msgs.push(data.msg);
      saveMsgs(roomId, msgs);
    }
    renderChat(roomId);
    return;
  }

  if(data.kind === "joined"){
    // update meta
    const meta = loadRoomMeta(roomId);
    if(meta){
      const ex = meta.members.some(x => x.id === data.user.id);
      if(!ex){
        if(meta.members.length < 10){
          meta.members.push({ id: data.user.id, name: data.user.name });
          saveRoomMeta(roomId, meta);
        }
      }
    }
    const msgs = loadMsgs(roomId);
    msgs.push({ type:"sys", text:`${data.user.name} katıldı.`, at: Date.now() });
    saveMsgs(roomId, msgs);
    updateRoomHeaderRoom(roomId);
    renderChat(roomId);
    return;
  }

  if(data.kind === "left"){
    const meta = loadRoomMeta(roomId);
    if(meta){
      meta.members = (meta.members||[]).filter(m => m.id !== data.user.id);
      saveRoomMeta(roomId, meta);
    }
    const msgs = loadMsgs(roomId);
    msgs.push({ type:"sys", text:`${data.user.name} ayrıldı.`, at: Date.now() });
    saveMsgs(roomId, msgs);
    updateRoomHeaderRoom(roomId);
    renderChat(roomId);
    return;
  }

  if(data.kind === "closed"){
    // clear everything
    const meta = loadRoomMeta(roomId);
    if(meta){
      meta.open = false;
      saveRoomMeta(roomId, meta);
    }
    sessionStorage.removeItem(roomMsgKey(roomId));
    setMyRoom(me.id, "");
    closeBC();
    renderChat("");
    toast("Kazan kapandı evladım. Mesajlar uçtu 🙂");
    return;
  }
}

/* =========================================================
   Mic -> textarea (no autosend)
========================================================= */
let rec = null;
let listening = false;

function setMic(on){
  listening = !!on;
  $("micBtn")?.classList.toggle("listening", listening);
}

function startMic(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    toast("Bu cihaz mikrofondan yazıya çevirmiyor evladım.");
    return;
  }
  stopMic();

  rec = new SR();
  rec.lang = "tr-TR";
  rec.interimResults = false;
  rec.continuous = true;

  setMic(true);

  rec.onresult = (e)=>{
    let chunk = "";
    for(let i=e.resultIndex; i<e.results.length; i++){
      const t = e.results[i]?.[0]?.transcript || "";
      chunk += t + " ";
    }
    chunk = chunk.trim();
    if(!chunk) return;

    const ta = $("msg");
    ta.value = (ta.value ? ta.value + " " : "") + chunk;
    autoGrow();
  };

  rec.onerror = ()=> toast("Mikrofon bir durdu evladım. Tekrar dene.");
  rec.onend = ()=>{
    // user mic açıkken bazen kendiliğinden kapanır → tekrar aç
    if(listening){
      try{ rec.start(); }catch{}
    }
  };

  try{ rec.start(); }catch{ toast("Mikrofon açılamadı evladım (HTTPS/izin)."); stopMic(); }
}

function stopMic(){
  try{ rec?.stop?.(); }catch{}
  rec = null;
  setMic(false);
}

function toggleMic(){
  if(listening) stopMic();
  else startMic();
}

/* =========================================================
   Inbox polling (localStorage)
========================================================= */
function pollInbox(){
  renderInbox();
}

/* =========================================================
   Boot
========================================================= */
document.addEventListener("DOMContentLoaded", ()=>{
  const token = (localStorage.getItem("google_id_token") || "").trim();
  if(!token){ location.href="/index.html"; return; }

  try{ initMenuHistoryUI(); }catch{}
  $("hambBtn")?.addEventListener("click", ()=> $("menuOverlay")?.classList.add("open"));
  $("menuOverlay")?.addEventListener("click", (e)=>{
    const sidebar = e.currentTarget?.querySelector?.(".menu-sidebar");
    if(sidebar && sidebar.contains(e.target)) return;
    e.currentTarget.classList.remove("open");
  });

  syncTopUI();

  // actions
  $("btnInvite")?.addEventListener("click", ()=> sendInvite($("peerId").value));
  $("btnRefresh")?.addEventListener("click", ()=> pollInbox());
  $("btnLeave")?.addEventListener("click", ()=> leaveRoom());

  $("send")?.addEventListener("click", sendText);
  $("msg")?.addEventListener("input", autoGrow);
  $("msg")?.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      sendText();
    }
  });

  $("micBtn")?.addEventListener("click", toggleMic);

  // restore room
  const me = getUser();
  const roomId = getMyRoom(me.id);
  if(roomId){
    openRoom(roomId);
  }else{
    renderChat("");
  }

  // inbox render
  renderInbox();
  autoGrow();

  // poll every 2s
  setInterval(pollInbox, 2000);

  // best-effort leave on close
  window.addEventListener("beforeunload", ()=>{
    try{
      if(getMyRoom(getUser().id)){
        // attempt to broadcast leave (may not complete)
        leaveRoom();
      }
    }catch{}
  });
});
