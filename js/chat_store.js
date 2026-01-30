// FILE: /js/chat_store.js
// FINAL+++ (USER-SCOPED INDEX + CURRENT CHAT PERSIST + LIVE UI EVENT + TITLE 15 CHARS + CONFIRM SUPPORT)
// ✅ Seçilen sohbet kalıcı
// ✅ "Yeni sohbet" görünmez
// ✅ Başlık ilk user mesajından 15 karakter
// ✅ deleteChat: UI onay sonrası force ile silebilir

const INDEX_KEY_PREFIX = "caynana_chat_index::";
const CURRENT_KEY_PREFIX = "caynana_chat_current::";
const CHAT_PREFIX = "caynana_chat_";

function safeJson(s, fb) { try { return JSON.parse(s || ""); } catch { return fb; } }

// Kullanıcı bazlı key
function getUserKey() {
  try {
    const u = safeJson(localStorage.getItem("caynana_user_v1"), {});
    const uid = String(u.user_id || u.id || u.email || "").trim().toLowerCase();
    return uid || "guest";
  } catch {
    return "guest";
  }
}
function INDEX_KEY() { return INDEX_KEY_PREFIX + getUserKey(); }
function CURRENT_KEY() { return CURRENT_KEY_PREFIX + getUserKey(); }

function emitUpdated(){
  try { window.dispatchEvent(new CustomEvent("caynana:chats-updated")); } catch {}
}

function uid(){
  return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function now(){ return new Date().toISOString(); }

function loadIndex(){
  return safeJson(localStorage.getItem(INDEX_KEY()) || "[]", []);
}
function saveIndex(list){
  localStorage.setItem(INDEX_KEY(), JSON.stringify(list));
  emitUpdated();
}
function loadChat(id){
  return safeJson(localStorage.getItem(CHAT_PREFIX + id) || "[]", []);
}
function saveChat(id, history){
  localStorage.setItem(CHAT_PREFIX + id, JSON.stringify(history));
  emitUpdated();
}

function cleanText(s=""){
  return String(s||"").replace(/\s+/g," ").trim();
}

// Başlık: ilk user mesajından, 15 karakter
function makeTitleFromText(text){
  const t = cleanText(text);
  if(!t) return "";
  const sliced = t.slice(0, 15);
  return sliced.length < t.length ? (sliced + "…") : sliced;
}

// chat boş mu?
function hasAnyUserMessage(chatId){
  const h = loadChat(chatId) || [];
  return h.some(m => String(m.role||"") === "user" && cleanText(m.content||""));
}

function readCurrent(){
  const v = String(localStorage.getItem(CURRENT_KEY()) || "").trim();
  return v || null;
}
function writeCurrent(id){
  if(!id) return;
  localStorage.setItem(CURRENT_KEY(), String(id));
  emitUpdated();
}

export const ChatStore = {
  currentId: null,

  init(){
    const index = loadIndex().filter(c => !c.deleted_at);

    if(index.length === 0){
      this.newChat();
      return;
    }

    const stored = readCurrent();
    if(stored && index.some(c => c.id === stored && !c.deleted_at)){
      this.currentId = stored;
      return;
    }

    const sorted = index.sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at));
    this.currentId = sorted[0].id;
    writeCurrent(this.currentId);
  },

  setCurrent(id){
    if(!id) return;
    const index = loadIndex().filter(c => !c.deleted_at);
    const exists = index.some(c => c.id === id);
    if(exists){
      this.currentId = id;
      writeCurrent(id);
    }
  },

  list(){
    return loadIndex()
      .filter(c => !c.deleted_at)
      .filter(c => !!cleanText(c.title || "") && hasAnyUserMessage(c.id))
      .sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0,10);
  },

  getCurrentServerId() {
    if(!this.currentId) return null;
    const index = loadIndex();
    const chat = index.find(c => c.id === this.currentId);
    return chat ? (chat.server_id || null) : null;
  },

  setServerId(serverId) {
    if(!this.currentId || !serverId) return;
    const index = loadIndex();
    const i = index.findIndex(c => c.id === this.currentId);
    if(i >= 0) {
      if(index[i].server_id !== serverId) {
        index[i].server_id = serverId;
        saveIndex(index);
      }
    }
  },

  newChat(){
    const id = uid();
    const index = loadIndex();

    index.unshift({
      id,
      server_id: null,
      title: "",                 // ✅ “Yeni sohbet” yok
      created_at: now(),
      updated_at: now(),
      deleted_at: null
    });

    saveIndex(index.slice(0,10));
    saveChat(id, []);
    this.currentId = id;
    writeCurrent(id);
  },

  renameChat(id, newTitle){
    const t = cleanText(newTitle);
    if(!id) return false;
    if(!t) return false;

    const clipped = t.slice(0, 15) + (t.length > 15 ? "…" : "");
    const index = loadIndex();
    const i = index.findIndex(c => c.id === id);
    if(i < 0) return false;

    index[i] = { ...index[i], title: clipped, updated_at: now() };
    saveIndex(index.slice(0,10));
    return true;
  },

  // ✅ force param: UI zaten onayladıysa true geçer
  deleteChat(id, force = false){
    if(!id) return;

    if(!force){
      // UI tarafında confirm yapılacak, burada hiçbir şey yapma
      return;
    }

    const index = loadIndex().map(c=>{
      if(c.id === id) return { ...c, deleted_at: now() };
      return c;
    });
    saveIndex(index);

    if(this.currentId === id){
      const alive = index.filter(x => !x.deleted_at).sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at));
      if(alive.length){
        this.currentId = alive[0].id;
        writeCurrent(this.currentId);
      }else{
        this.newChat();
      }
    }
  },

  history(){
    if(!this.currentId) this.init();
    return loadChat(this.currentId);
  },

  _maybeSetTitleOnFirstUserMessage(text){
    const index = loadIndex();
    const i = index.findIndex(c => c.id === this.currentId);
    if(i < 0) return;

    const cur = index[i];
    if(cleanText(cur.title || "")) return;

    const title = makeTitleFromText(text);
    if(!title) return;

    index[i] = { ...cur, title, updated_at: now() };
    saveIndex(index.slice(0,10));
  },

  add(role, content){
    if(!this.currentId) this.init();

    const h = loadChat(this.currentId);
    const item = { role, content: String(content||""), at: now() };
    h.push(item);
    saveChat(this.currentId, h);

    if(role === "user"){
      this._maybeSetTitleOnFirstUserMessage(content);
    }

    const index = loadIndex().map(c=>{
      if(c.id === this.currentId) return { ...c, updated_at: now() };
      return c;
    });
    saveIndex(index.slice(0,10));
    writeCurrent(this.currentId);
  },

  clearCurrent(){
    if(!this.currentId) return;
    saveChat(this.currentId, []);
  },

  getLastForApi(limit = 30){
    if(!this.currentId) this.init();
    const h = loadChat(this.currentId) || [];
    return h.slice(-limit).map(m => ({
      role: m.role,
      content: String(m.content || "")
    }));
  },

  debug(){
    if(!this.currentId) this.init();
    const index = loadIndex();
    const h = loadChat(this.currentId);
    return {
      currentId: this.currentId,
      chats: index.filter(c=>!c.deleted_at).length,
      currentLen: (h||[]).length,
      last: (h||[]).slice(-3)
    };
  }
};
