// FILE: /js/chat_store.js
// FINAL++ (CURRENT CHAT PERSIST + UI EVENT + NO OVERRIDE)
// ✅ Seçilen sohbet kalıcı (menüden tıkla → chat açılınca doğru sohbet gelir)
// ✅ init() artık currentId'yi ezmez
// ✅ UI event: caynana:chats-updated (menü anında güncellenir)

const CHAT_PREFIX = "caynana_chat_";

function safeJson(s, fb){ try { return JSON.parse(s || ""); } catch { return fb; } }

function getUserKey(){
  const u = safeJson(localStorage.getItem("caynana_user_v1"), {});
  const uid = String(u.user_id || u.id || u.email || "").trim().toLowerCase();
  return uid || "guest";
}
function INDEX_KEY(){ return `caynana_chat_index::${getUserKey()}`; }
function CURRENT_KEY(){ return `caynana_chat_current::${getUserKey()}`; }

function uid(){
  return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function now(){ return new Date().toISOString(); }

function emitUpdated(){
  try { window.dispatchEvent(new CustomEvent("caynana:chats-updated")); } catch {}
}

function loadIndex(){
  return safeJson(localStorage.getItem(INDEX_KEY()), []);
}
function saveIndex(list){
  localStorage.setItem(INDEX_KEY(), JSON.stringify(list));
  emitUpdated();
}
function loadChat(id){
  return safeJson(localStorage.getItem(CHAT_PREFIX + id), []);
}
function saveChat(id, history){
  localStorage.setItem(CHAT_PREFIX + id, JSON.stringify(history));
  emitUpdated();
}

function cleanText(s=""){
  return String(s||"").replace(/\s+/g," ").trim();
}
function makeTitleFromText(text){
  const t = cleanText(text);
  if(!t) return "";
  const sliced = t.slice(0, 15);
  return sliced.length < t.length ? (sliced + "…") : sliced;
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

    // index yoksa yeni aç
    if(index.length === 0){
      this.newChat();
      return;
    }

    // 1) önce stored current varsa onu kullan
    const stored = readCurrent();
    if(stored && index.some(c => c.id === stored && !c.deleted_at)){
      this.currentId = stored;
      return;
    }

    // 2) yoksa en günceli seç
    const sorted = index.sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at));
    this.currentId = sorted[0].id;
    writeCurrent(this.currentId);
  },

  setCurrent(id){
    if(!id) return;
    const index = loadIndex().filter(c => !c.deleted_at);
    if(index.some(c => c.id === id)){
      this.currentId = id;
      writeCurrent(id);
    }
  },

  list(){
    return loadIndex()
      .filter(c => !c.deleted_at)
      .filter(c => !!cleanText(c.title || "")) // boş başlık gösterme
      .sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0,10);
  },

  getCurrentServerId(){
    if(!this.currentId) return null;
    const index = loadIndex();
    const chat = index.find(c => c.id === this.currentId);
    return chat ? (chat.server_id || null) : null;
  },

  setServerId(serverId){
    if(!this.currentId || !serverId) return;
    const index = loadIndex();
    const i = index.findIndex(c => c.id === this.currentId);
    if(i >= 0 && index[i].server_id !== serverId){
      index[i].server_id = serverId;
      saveIndex(index);
    }
  },

  newChat(){
    const id = uid();
    const index = loadIndex();

    index.unshift({
      id,
      server_id: null,
      title: "",            // ✅ “Yeni sohbet” yok
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
    if(!id || !t) return false;

    const clipped = t.slice(0, 15) + (t.length > 15 ? "…" : "");
    const index = loadIndex();
    const i = index.findIndex(c => c.id === id);
    if(i < 0) return false;

    index[i] = { ...index[i], title: clipped, updated_at: now() };
    saveIndex(index.slice(0,10));
    return true;
  },

  deleteChat(id){
    const index = loadIndex().map(c=>{
      if(c.id === id) return { ...c, deleted_at: now() };
      return c;
    });
    saveIndex(index);

    if(this.currentId === id){
      const alive = index
        .filter(x => !x.deleted_at)
        .sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at));
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
  }
};
