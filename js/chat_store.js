// js/chat_store.js

const INDEX_KEY = "caynana_chat_index";
const CHAT_PREFIX = "caynana_chat_";

function uid(){
  return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function now(){ return new Date().toISOString(); }

function loadIndex(){
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || "[]"); }
  catch { return []; }
}
function saveIndex(list){
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}
function loadChat(id){
  try { return JSON.parse(localStorage.getItem(CHAT_PREFIX + id) || "[]"); }
  catch { return []; }
}
function saveChat(id, history){
  localStorage.setItem(CHAT_PREFIX + id, JSON.stringify(history));
}

function cleanText(s=""){
  return String(s||"").replace(/\s+/g," ").trim();
}

function makeTitleFromText(text){
  const t = cleanText(text);
  if(!t) return "Yeni sohbet";
  const words = t.split(" ").slice(0,6).join(" ");
  return words.length > 42 ? words.slice(0,42) + "…" : words;
}

export const ChatStore = {
  currentId: null,

  init(){
    const index = loadIndex().filter(c => !c.deleted_at);
    if(index.length === 0){
      this.newChat();
      return;
    }
    const sorted = index.sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at));
    this.currentId = sorted[0].id;
  },

  list(){
    return loadIndex()
      .filter(c => !c.deleted_at)
      .sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0,10);
  },

  // Şu anki sohbetin Server ID'sini getir (Varsa)
  getCurrentServerId() {
    if(!this.currentId) return null;
    const index = loadIndex();
    const chat = index.find(c => c.id === this.currentId);
    return chat ? (chat.server_id || null) : null;
  },

  // Server ID'yi kaydet (Backend'den cevap gelince burası çalışacak)
  setServerId(serverId) {
    if(!this.currentId || !serverId) return;
    const index = loadIndex();
    const i = index.findIndex(c => c.id === this.currentId);
    if(i >= 0) {
        // Eğer zaten varsa değiştirme, yoksa ekle
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
      server_id: null, // Yeni sohbette server ID henüz yok
      title: "Yeni sohbet",
      created_at: now(),
      updated_at: now(),
      deleted_at: null
    });

    saveIndex(index.slice(0,10));
    saveChat(id, []);
    this.currentId = id;
  },

  deleteChat(id){
    const index = loadIndex().map(c=>{
      if(c.id === id) return { ...c, deleted_at: now() };
      return c;
    });
    saveIndex(index);

    if(this.currentId === id){
      const alive = index.filter(x => !x.deleted_at).sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at));
      if(alive.length){
        this.currentId = alive[0].id;
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
    if(cur.title && cur.title !== "Yeni sohbet") return;

    const title = makeTitleFromText(text);
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
  },

  clearCurrent(){
    if(!this.currentId) return;
    saveChat(this.currentId, []);
  }
};
