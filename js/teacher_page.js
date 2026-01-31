// FILE: /js/teacher_page.js
// Teacher Mode (A1) – strict: doğru söylemeden geçiş YOK
// TTS: normal -> slow -> syllable
// STT: Web Speech API
// Daily quota: 60 min (localStorage)

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2100);
}

function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

function todayKey(){
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yy}-${mm}-${dd}`;
}

/* ------------------------------
   Daily quota (60 min)
--------------------------------*/
const QUOTA_SEC = 60 * 60;
function quotaStoreKey(){ return `caynana_teacher_seconds_${todayKey()}`; }

function getUsedSec(){
  const v = parseInt(localStorage.getItem(quotaStoreKey()) || "0", 10);
  return isNaN(v) ? 0 : Math.max(0, v);
}
function addUsedSec(sec){
  const cur = getUsedSec();
  localStorage.setItem(quotaStoreKey(), String(cur + Math.max(0, sec)));
}

/* ------------------------------
   Lesson Data (A1 starter)
   - word -> sentence -> mini-dialog
   Strict mode: expected exact-ish
--------------------------------*/
const LESSONS = {
  en: [
    { type:"word", tr:"Elma", target:"apple", slow:"ap-ple", syll:"ap … ple" },
    { type:"word", tr:"Su", target:"water", slow:"wa-ter", syll:"wa … ter" },
    { type:"word", tr:"Ekmek", target:"bread", slow:"bre-ad", syll:"bread" },
    { type:"word", tr:"Teşekkürler", target:"thank you", slow:"thank you", syll:"thank … you" },
    { type:"word", tr:"Lütfen", target:"please", slow:"please", syll:"please" },

    { type:"sent", tr:"Nasılsın?", target:"how are you", slow:"how are you", syll:"how … are … you" },
    { type:"sent", tr:"İyiyim.", target:"i am fine", slow:"i am fine", syll:"i … am … fine" },
    { type:"sent", tr:"Bunu istiyorum.", target:"i want this", slow:"i want this", syll:"i … want … this" },
    { type:"sent", tr:"Fiyatı ne?", target:"how much is it", slow:"how much is it", syll:"how … much … is … it" },
    { type:"sent", tr:"Menü lütfen.", target:"the menu please", slow:"the menu please", syll:"the … menu … please" },

    { type:"dlg", tr:"Selam.", target:"hello", slow:"hello", syll:"hel … lo" },
    { type:"dlg", tr:"Teşekkür ederim.", target:"thank you", slow:"thank you", syll:"thank … you" },
    { type:"dlg", tr:"Güle güle.", target:"goodbye", slow:"good-bye", syll:"good … bye" },
    { type:"dlg", tr:"Evet.", target:"yes", slow:"yes", syll:"yes" },
    { type:"dlg", tr:"Hayır.", target:"no", slow:"no", syll:"no" },
  ],
  de: [
    { type:"word", tr:"Elma", target:"apfel", slow:"ap-fel", syll:"ap … fel" },
    { type:"word", tr:"Su", target:"wasser", slow:"was-ser", syll:"was … ser" },
    { type:"word", tr:"Ekmek", target:"brot", slow:"brot", syll:"brot" },
    { type:"word", tr:"Teşekkürler", target:"danke", slow:"dan-ke", syll:"dan … ke" },
    { type:"word", tr:"Lütfen", target:"bitte", slow:"bit-te", syll:"bit … te" },

    { type:"sent", tr:"Nasılsın?", target:"wie geht es dir", slow:"wie geht es dir", syll:"wie … geht … es … dir" },
    { type:"sent", tr:"İyiyim.", target:"mir geht es gut", slow:"mir geht es gut", syll:"mir … geht … es … gut" },
    { type:"sent", tr:"Bunu istiyorum.", target:"ich möchte das", slow:"ich möchte das", syll:"ich … möch-te … das" },
    { type:"sent", tr:"Fiyatı ne?", target:"wie viel kostet das", slow:"wie viel kostet das", syll:"wie … viel … kos-tet … das" },
    { type:"sent", tr:"Menü lütfen.", target:"die speisekarte bitte", slow:"die speisekarte bitte", syll:"die … spei-se-kar-te … bit-te" },

    { type:"dlg", tr:"Selam.", target:"hallo", slow:"hal-lo", syll:"hal … lo" },
    { type:"dlg", tr:"Teşekkür ederim.", target:"danke", slow:"dan-ke", syll:"dan … ke" },
    { type:"dlg", tr:"Güle güle.", target:"tschüss", slow:"tschüss", syll:"tschüss" },
    { type:"dlg", tr:"Evet.", target:"ja", slow:"ja", syll:"ja" },
    { type:"dlg", tr:"Hayır.", target:"nein", slow:"nein", syll:"nein" },
  ],
  fr: [
    { type:"word", tr:"Elma", target:"pomme", slow:"pom-me", syll:"pom … me" },
    { type:"word", tr:"Su", target:"eau", slow:"eau", syll:"eau" },
    { type:"word", tr:"Ekmek", target:"pain", slow:"pain", syll:"pain" },
    { type:"word", tr:"Teşekkürler", target:"merci", slow:"mer-ci", syll:"mer … ci" },
    { type:"word", tr:"Lütfen", target:"s'il vous plaît", slow:"s'il vous plaît", syll:"s'il … vous … plaît" },

    { type:"sent", tr:"Nasılsın?", target:"comment ça va", slow:"comment ça va", syll:"com-ment … ça … va" },
    { type:"sent", tr:"İyiyim.", target:"je vais bien", slow:"je vais bien", syll:"je … vais … bien" },
    { type:"sent", tr:"Bunu istiyorum.", target:"je veux ça", slow:"je veux ça", syll:"je … veux … ça" },
    { type:"sent", tr:"Fiyatı ne?", target:"c'est combien", slow:"c'est combien", syll:"c'est … com-bien" },
    { type:"sent", tr:"Menü lütfen.", target:"le menu s'il vous plaît", slow:"le menu s'il vous plaît", syll:"le … me-nu … s'il … vous … plaît" },

    { type:"dlg", tr:"Selam.", target:"bonjour", slow:"bon-jour", syll:"bon … jour" },
    { type:"dlg", tr:"Teşekkür ederim.", target:"merci", slow:"mer-ci", syll:"mer … ci" },
    { type:"dlg", tr:"Güle güle.", target:"au revoir", slow:"au revoir", syll:"au … re-voir" },
    { type:"dlg", tr:"Evet.", target:"oui", slow:"oui", syll:"oui" },
    { type:"dlg", tr:"Hayır.", target:"non", slow:"non", syll:"non" },
  ],
  it: [
    { type:"word", tr:"Elma", target:"mela", slow:"me-la", syll:"me … la" },
    { type:"word", tr:"Su", target:"acqua", slow:"ac-qua", syll:"ac … qua" },
    { type:"word", tr:"Ekmek", target:"pane", slow:"pa-ne", syll:"pa … ne" },
    { type:"word", tr:"Teşekkürler", target:"grazie", slow:"gra-zie", syll:"gra … zie" },
    { type:"word", tr:"Lütfen", target:"per favore", slow:"per fa-vo-re", syll:"per … fa-vo-re" },

    { type:"sent", tr:"Nasılsın?", target:"come stai", slow:"co-me stai", syll:"co … me … stai" },
    { type:"sent", tr:"İyiyim.", target:"sto bene", slow:"sto be-ne", syll:"sto … be-ne" },
    { type:"sent", tr:"Bunu istiyorum.", target:"voglio questo", slow:"vo-glio que-sto", syll:"vo … glio … que-sto" },
    { type:"sent", tr:"Fiyatı ne?", target:"quanto costa", slow:"quan-to co-sta", syll:"quan-to … co-sta" },
    { type:"sent", tr:"Menü lütfen.", target:"il menu per favore", slow:"il me-nu per fa-vo-re", syll:"il … me-nu … per … fa-vo-re" },

    { type:"dlg", tr:"Selam.", target:"ciao", slow:"ciao", syll:"ci … ao" },
    { type:"dlg", tr:"Teşekkür ederim.", target:"grazie", slow:"gra-zie", syll:"gra … zie" },
    { type:"dlg", tr:"Güle güle.", target:"arrivederci", slow:"ar-ri-ve-der-ci", syll:"ar … ri … ve … der … ci" },
    { type:"dlg", tr:"Evet.", target:"sì", slow:"sì", syll:"sì" },
    { type:"dlg", tr:"Hayır.", target:"no", slow:"no", syll:"no" },
  ],
};

/* ------------------------------
   Speech (TTS + STT)
--------------------------------*/
function speak(text, lang, rate=1.0){
  return new Promise((resolve)=>{
    if(!("speechSynthesis" in window)){
      toast("Ses motoru yok (speechSynthesis).");
      resolve(false);
      return;
    }
    try{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text||""));
      u.lang = ({en:"en-US",de:"de-DE",fr:"fr-FR",it:"it-IT"}[lang] || "en-US");
      u.rate = rate;
      u.pitch = 1.0;
      u.onend = ()=> resolve(true);
      u.onerror = ()=> resolve(false);
      window.speechSynthesis.speak(u);
    }catch{
      resolve(false);
    }
  });
}

function makeRecognizer(lang){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = ({en:"en-US",de:"de-DE",fr:"fr-FR",it:"it-IT"}[lang] || "en-US");
  rec.interimResults = false;
  rec.continuous = false;
  return rec;
}

function normalize(s){
  return String(s||"")
    .toLowerCase()
    .trim()
    .replace(/[’']/g,"'")
    .replace(/[.,!?;:]/g,"")
    .replace(/\s+/g," ");
}

// basit benzerlik: 0..1
function similarity(a,b){
  a = normalize(a); b = normalize(b);
  if(!a || !b) return 0;
  if(a === b) return 1;
  // Levenshtein-lite
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i-1][j]+1,
        dp[i][j-1]+1,
        dp[i-1][j-1]+cost
      );
    }
  }
  const dist = dp[m][n];
  const maxLen = Math.max(m,n);
  return 1 - (dist / maxLen);
}

/* ------------------------------
   State
--------------------------------*/
let currentLang = "en";
let idx = 0;
let listening = false;
let listenStartTs = 0;

function lessonList(){
  return LESSONS[currentLang] || LESSONS.en;
}
function currentItem(){
  return lessonList()[idx];
}
function totalSteps(){
  return lessonList().length;
}

function updateUI(){
  const item = currentItem();
  const step = idx + 1;
  $("stepInfo").textContent = `${step}/${totalSteps()}`;

  const pct = Math.round((step-1) / totalSteps() * 100);
  $("progBar").style.width = `${pct}%`;

  const usedMin = Math.floor(getUsedSec()/60);
  $("timeInfo").textContent = `${usedMin} dk`;

  $("lvl").textContent = "A1";

  // teacher text: hedef + türkçe açıklama
  $("teacherText").textContent = item?.target || "—";
  $("teacherSub").textContent = item?.tr ? `Türkçesi: ${item.tr}. Şimdi doğru söyle.` : "Şimdi doğru söyle.";

  // student prompt
  $("studentPrompt").textContent = "Dinleyeceğim. Mikrofona bas ve söyle.";
  $("statusBadge").textContent = "Dinlemeye hazır";

  // tick reset
  $("tick").classList.remove("ok");
  $("tick").textContent = "—";

  // next locked
  $("btnNext").disabled = true;
}

async function teacherSpeakFull(){
  const item = currentItem();
  if(!item) return;

  // teacher says: normal -> slow -> syllable
  await speak(item.target, currentLang, 1.0);
  await speak(item.target, currentLang, 0.78);
  await speak(item.syll || item.slow || item.target, currentLang, 0.62);
}

async function teacherSpeakSlow(){
  const item = currentItem();
  if(!item) return;
  await speak(item.target, currentLang, 0.78);
  await speak(item.syll || item.slow || item.target, currentLang, 0.62);
}

/* strict check */
function isCorrect(expected, heard){
  const exp = normalize(expected);
  const got = normalize(heard);

  // SİSTEM: tam doğruya çok yakın şart
  // kelime: 0.92, cümle: 0.88
  const item = currentItem();
  const thr = (item?.type === "word") ? 0.92 : 0.88;

  const score = similarity(exp, got);
  return { ok: score >= thr, score };
}

async function listenStudent(){
  if(listening) return;

  // daily quota
  const used = getUsedSec();
  if(used >= QUOTA_SEC){
    toast("Bugünlük 1 saat doldu evladım. Yarın devam.");
    return;
  }

  const item = currentItem();
  if(!item) return;

  const rec = makeRecognizer(currentLang);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor (SpeechRecognition yok).");
    return;
  }

  listening = true;
  $("studentPanel").classList.add("listening");
  $("teacherPanel").classList.remove("listening");
  $("dot").parentElement?.classList?.add?.("listening");
  $("statusBadge").textContent = "Dinliyorum…";
  $("tick").classList.remove("ok");
  $("tick").textContent = "—";

  listenStartTs = Date.now();

  rec.onresult = async (e)=>{
    const heard = e.results?.[0]?.[0]?.transcript || "";
    const durSec = Math.max(1, Math.round((Date.now() - listenStartTs)/1000));
    addUsedSec(durSec);

    const { ok, score } = isCorrect(item.target, heard);

    if(ok){
      $("tick").classList.add("ok");
      $("tick").textContent = "✅";
      $("statusBadge").textContent = "Doğru!";
      await speak("Good!", currentLang, 1.0).catch(()=>{});
      // geçiş kilidi aç
      $("btnNext").disabled = false;
      toast(`Doğru! (Skor ${Math.round(score*100)}%)`);
    }else{
      $("tick").classList.remove("ok");
      $("tick").textContent = "❌";
      $("statusBadge").textContent = "Olmadı, tekrar.";
      toast(`Anlamadım. Bir daha. (Skor ${Math.round(score*100)}%)`);

      // öğretmen yeniden anlatır: normal -> yavaş -> hece
      await teacherSpeakFull();

      // otomatik tekrar dinleme
      listening = false;
      $("studentPanel").classList.remove("listening");
      setTimeout(()=>listenStudent(), 180);
      return;
    }

    listening = false;
    $("studentPanel").classList.remove("listening");
    $("dot").parentElement?.classList?.remove?.("listening");
    updateUI(); // timeInfo güncellensin ama step değişmesin
    // tick kalsın
    $("tick").classList.add("ok");
    $("tick").textContent = "✅";
    $("btnNext").disabled = false;
  };

  rec.onerror = ()=>{
    listening = false;
    $("studentPanel").classList.remove("listening");
    $("statusBadge").textContent = "Mikrofon hatası";
    toast("Mikrofon izin/HTTPS sorunu olabilir.");
  };

  rec.onend = ()=>{
    // bazen hiç sonuç dönmeden biter
    if(listening){
      const durSec = Math.max(1, Math.round((Date.now() - listenStartTs)/1000));
      addUsedSec(durSec);
      listening = false;
      $("studentPanel").classList.remove("listening");
      $("statusBadge").textContent = "Tekrar dene";
      toast("Bir şey duymadım. Tekrar söyle.");
    }
  };

  try{
    rec.start();
  }catch{
    listening = false;
    $("studentPanel").classList.remove("listening");
    toast("Mikrofon açılamadı.");
  }
}

function stopListening(){
  listening = false;
  $("studentPanel").classList.remove("listening");
  $("statusBadge").textContent = "Durduruldu";
  toast("Tamam, durdurdum.");
  try{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    // aktif instance'ı tutmadık; basitçe synth cancel yeterli
    window.speechSynthesis?.cancel?.();
  }catch{}
}

async function goNext(){
  if($("btnNext").disabled) return;
  const next = idx + 1;
  if(next >= totalSteps()){
    toast("Bugünlük ders bitti evladım. Yarın devam.");
    idx = 0;
    updateUI();
    await speak("Great job!", currentLang, 1.0);
    return;
  }
  idx = next;
  updateUI();
  await teacherSpeakFull();
}

function bind(){
  $("langSel").addEventListener("change", async ()=>{
    currentLang = $("langSel").value || "en";
    idx = 0;
    updateUI();
    await teacherSpeakFull();
  });

  $("btnSpeak").addEventListener("click", teacherSpeakFull);
  $("btnRepeatSlow").addEventListener("click", teacherSpeakSlow);

  $("btnListen").addEventListener("click", listenStudent);
  $("btnStop").addEventListener("click", stopListening);
  $("btnNext").addEventListener("click", goNext);

  // initial
  updateUI();
  teacherSpeakFull();
}

document.addEventListener("DOMContentLoaded", bind);
