// ===== Demo dáta (uprav podľa potreby) =====
// dept: 'MPS' => C triedy, dept: 'TITT' => G triedy
const NOTES_DATA = [
  { title: 'Rysovanie', dept: 'MPS', class: '1.C', file: 'https://cdn.discordapp.com/attachments/1415296683822026964/1415296697592053820/PlosneMeranieOrysovanie.docx?ex=68c2b143&is=68c15fc3&hm=465d52757442c2098e2c42d2c719ef609765454b6b86eb581c3a796c0f543259&', size: '420 kB', tags: ['rysovanie'] },
];

// ===== Router (hash) & nav – vždy zobrazi len aktuálnu sekciu =====
const pages = document.querySelectorAll('[data-page]');
const tabs = document.querySelectorAll('[data-route]');
const mainEl = document.querySelector('main');
function showPage(id){
  pages.forEach(p => p.classList.toggle('hide', p.id !== id));
  tabs.forEach(t => t.setAttribute('aria-current', t.getAttribute('href') === '#' + id ? 'page' : 'false'));
  window.scrollTo({ top: 0 });
  if (mainEl) mainEl.scrollTo({ top: 0 });
}
function initRoute(){
  const hash = (location.hash || '#home').replace('#','');
  showPage(hash);
}
window.addEventListener('hashchange', initRoute);
initRoute();

document.getElementById('year').textContent = new Date().getFullYear();

// ===== Notes rendering & filters =====
const selDept = document.getElementById('dept');
const selClass = document.getElementById('klass');
const inputQ = document.getElementById('query');
const btnClear = document.getElementById('clear');
const wrap = document.getElementById('notesWrap');
const empty = document.getElementById('emptyState');

// Toggle buttons for dept
const toggles = document.querySelectorAll('.toggle');
toggles.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    toggles.forEach(b=>b.setAttribute('aria-pressed','false'));
    btn.setAttribute('aria-pressed','true');
    selDept.value = btn.dataset.dept;
    saveState();
    renderNotes();
  });
});

function renderNotes(){
  let list = [...NOTES_DATA];
  const q = inputQ.value.trim().toLowerCase();
  const d = selDept.value; const c = selClass.value;
  if(d) list = list.filter(n => n.dept === d);
  if(c) list = list.filter(n => n.class === c);
  if(q) list = list.filter(n => (n.title+" "+(n.tags||[]).join(' ')).toLowerCase().includes(q));

  wrap.innerHTML = '';
  empty.classList.toggle('hide', list.length !== 0);
  if(!list.length) return;

  const frag = document.createDocumentFragment();
  list.forEach(n => {
    const card = document.createElement('article');
    card.className = 'card note';
    card.innerHTML = `
      <h3>${n.title}</h3>
      <div class="meta">${n.dept} • ${n.class} • ${n.size || ''}</div>
      <div style="margin-bottom:10px">${(n.tags||[]).map(t=>`<span class='tag'>#${t}</span>`).join('')}</div>
      <a class="btn" href="${n.file}" download>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Stiahnuť
      </a>
    `;
    frag.appendChild(card);
  });
  wrap.appendChild(frag);
}

function saveState(){
  localStorage.setItem('energo_filters', JSON.stringify({dept: selDept.value, klass: selClass.value, q: inputQ.value}));
}
function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem('energo_filters')||'{}');
    if(s.dept){ selDept.value = s.dept; const tgt=[...toggles].find(b=>b.dataset.dept===s.dept)||toggles[0]; toggles.forEach(b=>b.setAttribute('aria-pressed','false')); tgt.setAttribute('aria-pressed','true'); }
    if(s.klass) selClass.value = s.klass;
    if(s.q) inputQ.value = s.q;
  }catch(e){}
}

[selDept, selClass, inputQ].forEach(el=> el.addEventListener('input', ()=>{ saveState(); renderNotes(); }));
btnClear.addEventListener('click', ()=>{ selDept.value=''; selClass.value=''; inputQ.value=''; toggles.forEach(b=>b.setAttribute('aria-pressed','false')); toggles[0].setAttribute('aria-pressed','true'); saveState(); renderNotes(); });

loadState();
renderNotes();

// ===== Quick chips on home =====
document.querySelectorAll('.chip[data-jump]').forEach(el=>{
  el.addEventListener('click', ()=>{
    const cfg = JSON.parse(el.dataset.jump);
    selDept.value = cfg.dept; selClass.value = cfg.class; inputQ.value = '';
    toggles.forEach(b=>b.setAttribute('aria-pressed','false'));
    const tgt = [...toggles].find(b=>b.dataset.dept===cfg.dept) || toggles[0];
    tgt.setAttribute('aria-pressed','true');
    saveState(); renderNotes(); location.hash = '#notes';
  });
});

// ===== Upload dialog / webhook =====
const dialog = document.getElementById('uploadDialog');
document.getElementById('btnUpload').addEventListener('click', ()=> dialog.showModal());
document.getElementById('cancelUpload').addEventListener('click', ()=> dialog.close());

// === Success modal (nice confirmation instead of alert) ===
function ensureSuccessModal(){
  if (document.getElementById('sentDialog')) return;
  const style = document.createElement('style');
  style.textContent = `
    dialog#sentDialog{border:none;border-radius:16px;padding:0;background:transparent}
    dialog#sentDialog::backdrop{background:rgba(0,0,0,.55);backdrop-filter:blur(2px)}
    .sent-card{background:linear-gradient(180deg,#111113,#0f0f11);border:1px solid var(--border, #1e1f22);border-radius:16px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:420px;display:flex;gap:12px;align-items:flex-start}
    .sent-icon{width:22px;height:22px;color:var(--accent, #e11d2e);flex:0 0 auto;margin-top:2px}
    .sent-title{margin:0 0 6px;font-weight:800}
    .sent-text{margin:0;color:var(--muted,#b6b6bb)}
    .sent-actions{display:flex;justify-content:flex-end;margin-top:12px}
    .sent-btn{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;border:1px solid var(--accent,#e11d2e);background:linear-gradient(180deg,var(--accent,#e11d2e), var(--accent-700,#960b17));color:#fff;font-weight:800;cursor:pointer}
  `;
  document.head.appendChild(style);
  const d = document.createElement('dialog');
  d.id = 'sentDialog';
  d.innerHTML = `
    <div class="sent-card">
      <svg class="sent-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm-1 13.17l-3.59-3.58L9 10l2 2 4-4 1.41 1.42L11 15.17z"/></svg>
      <div style="flex:1">
        <h3 class="sent-title">Správa odoslaná</h3>
        <p class="sent-text">Tvoja práca bola úspešne odoslaná.</p>
        <div class="sent-actions"><button type="button" class="sent-btn" id="sentCloseBtn">OK</button></div>
      </div>
    </div>
  `;
  document.body.appendChild(d);
  d.querySelector('#sentCloseBtn').addEventListener('click', ()=> d.close());
}
function showSuccessModal(){
  ensureSuccessModal();
  const d = document.getElementById('sentDialog');
  if (!d.open) d.showModal();
  // auto-close po 2.2s (ak si to užívateľ nezavrie sám)
  setTimeout(()=>{ if(d.open) d.close(); }, 2200);
}

// Mapovanie tried -> webhook URL (doplň svoje reálne URL z Discordu)
const WEBHOOKS = {
  '1.C': 'https://discord.com/api/webhooks/1415263808267616266/twNqjeXQNEa5btUiJmkaWPw7whZrDnn-Y_wpp_8dw-bp7VoaSOoVO2Tk4AdUEdfK_Bob',
  '2.C': 'https://discord.com/api/webhooks/1415263725228916736/_ROdIcf8GRQbd_RhEgHtFUyGXjDyDJ4RtdCCvyrAnc6WGKodPIn1LfLEAzOBfLqI3Igw ',
  '3.C': 'https://discord.com/api/webhooks/1415263510807707698/EG2VwOZl0QB9PspZ2-6s4plzCedz9UhLu80t6hjs7llzp-iWzOdCLJ5_5Ee0zcNnGCHw',
  '2.G': 'https://discord.com/api/webhooks/1415263909690216478/7wiamXx6uKt8ACkZ7hczpUVGI76gGk38k6Em3N0-mhukseBy5noEPATg6l6y70z91DDH'
};

const form = document.getElementById('uploadForm');
const uClass = document.getElementById('uClass');
const uName = document.getElementById('uName');
const uSurname = document.getElementById('uSurname');
const uNote = document.getElementById('uNote');
const payload = document.getElementById('payload');

form.addEventListener('submit', (e)=>{
  const cls = uClass.value;
  const wh = WEBHOOKS[cls];
  if(!wh){
    e.preventDefault();
    alert('Webhook pre túto triedu nie je nastavený. Doplň WEBHOOKS v app.js.');
    return;
  }
  form.action = wh;

  // Po doručení odpovede do iframe ho hneď "odpojíme", aby refresh nespôsobil re‑POST
  const frame = document.getElementById('uploadTarget');
  frame.addEventListener('load', () => {
    // Krátka pauza nech sa odošle komplet payload, potom vymažeme históriu iframe
    setTimeout(() => { frame.src = 'about:blank'; }, 200);
  }, { once: true });

  const dept = cls.includes('G') ? 'TITT' : 'MPS';
  const content = `📥 Nová odovzdaná práca\nTrieda: **${cls}** (${dept})\nŽiak: **${uName.value} ${uSurname.value}**${uNote.value?`\nPoznámka: ${uNote.value}`:''}`;
  payload.value = JSON.stringify({ username: 'Energo Upload Bot', content });

  // UX: zavri dialog po krátkej chvíli
  setTimeout(()=>{
    dialog.close();
    uClass.value=''; uName.value=''; uSurname.value=''; uNote.value='';
    document.getElementById('uFile').value='';
    alert('Odoslané. Skontroluj kanál na Discorde.');
  }, 400);
});
