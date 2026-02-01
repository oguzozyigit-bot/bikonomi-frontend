// FILE: /js/teacher_duo.js
// Duo Practice: 10 tur, sırayla tek hak, doğruysa puan.
// 180° görünüm: alt panel rotate edildi.

const $ = (id)=>document.getElementById(id);
const LOCALE = "en-US";

const WORDS = ["apple","water","bread","menu","price","yes","no","hello","goodbye","thank you","please","help","toilet","the bill","hot","cold","today"];

function norm(s){ return String(s||"").toLowerCase().trim().replace(/[.,!?;:]/g,"").replace(/\s+/g," "); }
function similarity(a,b){
  a=norm(a); b=norm(b);
  if(a===b) return 1;
  const m=a.length,n=b.length;
  const dp=[...Array(m+1)].map(()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i;
  for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
    const c=a[i-1]===b[j-1]?0:1;
    dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+c);
  }
  return 1-dp[m][n]/Math.max(m,n);
}
function makeRec(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = LOCALE;
  r.interimResults = false;
  r.continuous = false;
  return r;
}

let turn = "A";
let scoreA = 0, scoreB = 0;
let round = 0;
let curWord = "";

function pickWord(){
  curWord = WORDS[Math.floor(Math.random()*WORDS.length)];
  $("wordA").textContent = curWord;
  $("wordB").textContent = curWord;
}

function setHints(){
  $("hintA").textContent = (turn==="A") ? `Sıran sende. Tek hak. (${round+1}/10)` : "Sıra karşı tarafta.";
  $("hintB").textContent = (turn==="B") ? `Sıran sende. Tek hak. (${round+1}/10)` : "Sıra karşı tarafta.";
}

function updateScores(){
  $("scoreA").textContent = String(scoreA);
  $("scoreB").textContent = String(scoreB);
}

function nextTurn(){
  round++;
  if(round >= 10){
    const winner = scoreA===scoreB ? "Berabere" : (scoreA>scoreB ? "Oyuncu A kazandı" : "Oyuncu B kazandı");
    alert(`Bitti evladım 😄\nSkor A:${scoreA} B:${scoreB}\n${winner}`);
    round = 0; scoreA=0; scoreB=0;
  }
  turn = (turn==="A") ? "B" : "A";
  pickWord();
  setHints();
  updateScores();
}

function listenFor(player){
  if(player !== turn) return;

  const rec = makeRec();
  if(!rec){ alert("Bu cihaz konuşmayı yazıya çevirmiyor."); return; }

  rec.onresult = (e)=>{
    const said = e.results?.[0]?.[0]?.transcript || "";
    const sc = similarity(curWord, said);
    const ok = sc >= 0.92;

    if(ok){
      if(player==="A") scoreA++; else scoreB++;
    }
    updateScores();
    nextTurn();
  };

  rec.onerror = ()=> nextTurn();
  try{ rec.start(); } catch { nextTurn(); }
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn").addEventListener("click", ()=> history.length>1 ? history.back() : location.href="/pages/chat.html");

  pickWord();
  setHints();
  updateScores();

  $("micA").addEventListener("click", ()=> listenFor("A"));
  $("micB").addEventListener("click", ()=> listenFor("B"));
});
