// js/memory_profile.js
const MEM_KEY = "caynana_memory_profile_v1";

function safeJson(s, fb={}){ try { return JSON.parse(s||""); } catch { return fb; } }

export function getMemoryProfile(){
  return safeJson(localStorage.getItem(MEM_KEY), {});
}

export function setMemoryProfile(patch={}){
  const cur = getMemoryProfile();
  const next = { ...cur, ...patch, updated_at: new Date().toISOString() };
  localStorage.setItem(MEM_KEY, JSON.stringify(next));
  return next;
}

export function clearMemoryProfile(){
  localStorage.removeItem(MEM_KEY);
}
