'use strict';

// ====== PLAIN WEBHOOKS (no encryption) ======
const WEBHOOKS = {
  '1.C': 'https://discord.com/api/webhooks/1415263808267616266/twNqjeXQNEa5btUiJmkaWPw7whZrDnn-Y_wpp_8dw-bp7VoaSOoVO2Tk4AdUEdfK_Bob',
  '2.C': 'https://discord.com/api/webhooks/1415263725228916736/_ROdIcf8GRQbd_RhEgHtFUyGXjDyDJ4RtdCCvyrAnc6WGKodPIn1LfLEAzOBfLqI3Igw',
  '3.C': 'https://discord.com/api/webhooks/1415263510807707698/EG2VwOZl0QB9PspZ2-6s4plzCedz9UhLu80t6hjs7llzp-iWzOdCLJ5_5Ee0zcNnGCHw',
  '2.G': 'https://discord.com/api/webhooks/1415263909690216478/7wiamXx6uKt8ACkZ7hczpUVGI76gGk38k6Em3N0-mhukseBy5noEPATg6l6y70z91DDH'
};

document.addEventListener('DOMContentLoaded', () => {
  // ===== Utils
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== Router (hash)
  const pages = $$('[data-page]');
  const tabs = $$('[data-route]');
  const mainEl = $('main');

  function showPage(id){
    pages.forEach(p => p.classList.toggle('hide', p.id !== id));
    tabs.forEach(t => t.setAttribute('aria-current', t.getAttribute('href') === '#' + id ? 'page' : 'false'));
    window.scrollTo({ top: 0 });
    if (mainEl) mainEl.scrollTo({ top: 0 });
  }
  function initRoute(){ const hash = (location.hash || '#home').replace('#',''); showPage(hash); }
  window.addEventListener('hashchange', initRoute);
  initRoute();

  // ===== Success modal (centered)
  function ensureSuccessModal(){
    if ($('#sentDialog')) return;
    const style = document.createElement('style');
    style.textContent = `
      dialog#sentDialog{border:none;border-radius:16px;padding:0;background:transparent}
      dialog#sentDialog::backdrop{background:rgba(0,0,0,.55);backdrop-filter:blur(2px)}
      .sent-card{background:linear-gradient(180deg,#111113,#0f0f11);border:1px solid var(--border, #1e1f22);border-radius:16px;padding:22px 22px 16px;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:420px;display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center}
      .sent-icon{width:24px;height:24px;color:var(--accent, #e11d2e);margin:2px auto 4px auto;display:block}
      .sent-title{margin:0 0 6px;font-weight:800}
      .sent-text{margin:0;color:var(--muted,#b6b6bb)}
      .sent-actions{display:flex;justify-content:center;margin-top:12px}
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
    $('#sentCloseBtn', d).addEventListener('click', ()=> d.close());
  }
  function showSuccessModal(){ ensureSuccessModal(); const d = $('#sentDialog'); if (!d.open) d.showModal(); setTimeout(()=>{ if(d.open) d.close(); }, 2200); }

  // ===== Notes (external loader + grouping)
  let NOTES_DATA = []; // loaded from notes.json or notes.js
  const selDept = $('#dept');
  const selClass = $('#klass');
  const inputQ = $('#query');
  const btnClear = $('#clear');
  const wrap = $('#notesWrap');
  const empty = $('#emptyState');

  function saveState(){
    try{ localStorage.setItem('energo_filters', JSON.stringify({dept: selDept?.value || '', klass: selClass?.value || '', q: inputQ?.value || ''})); }catch(_){}
  }
  function loadState(){
    try{
      const s = JSON.parse(localStorage.getItem('energo_filters')||'{}');
      if (s.dept && selDept) selDept.value = s.dept;
      if (s.klass && selClass) selClass.value = s.klass;
      if (s.q && inputQ) inputQ.value = s.q;
    }catch(_){}
  }

  async function loadNotes(){
    // Try notes.json first (works on server)
    try {
      if (empty) { empty.classList.remove('hide'); empty.textContent = 'Načítavam poznámky…'; }
      const res = await fetch('notes.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid format');
      NOTES_DATA = data;
      window.__NOTES_SOURCE = 'notes.json';
      console.info('Energo: loaded notes from notes.json, items:', NOTES_DATA.length);
    } catch (err) {
      console.warn('notes.json zlyhalo, skúsim notes.js', err);
      // Fallback notes.js (works aj pri file://)
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'notes.js?v=' + Date.now();
          s.defer = true;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
        if (Array.isArray(window.NOTES_DATA)) {
          NOTES_DATA = window.NOTES_DATA;
          window.__NOTES_SOURCE = 'notes.js';
          console.info('Energo: loaded notes from notes.js, items:', NOTES_DATA.length);
        } else {
          throw new Error('notes.js neobsahuje window.NOTES_DATA');
        }
      } catch (e) {
        console.error('Načítanie poznámok zlyhalo', e);
        if (empty) { empty.classList.remove('hide'); empty.textContent = 'Nepodarilo sa načítať poznámky.'; }
      }
    } finally {
      if (empty) { empty.textContent = ''; empty.classList.add('hide'); }
      renderNotes();
    }
  }

  function renderNotes(){
    if (!wrap) return;
    let list = Array.isArray(NOTES_DATA) ? [...NOTES_DATA] : [];
    const q = (inputQ?.value || '').trim().toLowerCase();
    const d = selDept?.value || ''; const c = selClass?.value || '';
    if(d) list = list.filter(n => n.dept === d);
    if(c) list = list.filter(n => n.class === c);
    if(q) list = list.filter(n => (n.title + " " + (n.tags||[]).join(' ')).toLowerCase().includes(q));

    wrap.innerHTML = '';
    if (empty) empty.classList.toggle('hide', list.length !== 0);
    if(!list.length) return;

    // Group by class
    const order = ['1.C','2.C','3.C','2.G'];
    const groups = {};
    list.forEach(n => { (groups[n.class] ||= []).push(n); });

    const classes = Object.keys(groups).sort((a,b)=>{
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    const frag = document.createDocumentFragment();
    classes.forEach((klass, idx) => {
      const section = document.createElement('section');
      section.className = 'group';
      section.innerHTML = `<h3 class="group-title">${klass} <span class="count">(${groups[klass].length})</span></h3>`;

      const grid = document.createElement('div');
      grid.className = 'notes-grid';

      groups[klass].forEach(n => {
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
        grid.appendChild(card);
      });

      section.appendChild(grid);
      frag.appendChild(section);
      if (idx !== classes.length - 1) {
        const sep = document.createElement('div');
        sep.className = 'group-sep';
        frag.appendChild(sep);
      }
    });

    wrap.appendChild(frag);
  }

  // Bind filters
  selDept?.addEventListener('input', ()=>{ saveState(); renderNotes(); });
  selClass?.addEventListener('input', ()=>{ saveState(); renderNotes(); });
  inputQ?.addEventListener('input', ()=>{ saveState(); renderNotes(); });
  btnClear?.addEventListener('click', ()=>{
    if (selDept) selDept.value='';
    if (selClass) selClass.value='';
    if (inputQ) inputQ.value='';
    const toggles = $$('.toggle'); toggles.forEach(b=>b.setAttribute('aria-pressed','false')); if (toggles[0]) toggles[0].setAttribute('aria-pressed','true');
    saveState(); renderNotes();
  });

  // Toggle buttons
  $$('.toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.toggle').forEach(b=>b.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      if (selDept) selDept.value = btn.dataset.dept || '';
      saveState(); renderNotes();
    });
  });

  // Home quick chips
  $$('.chip[data-jump]').forEach(el=>{
    el.addEventListener('click', ()=>{
      try {
        const cfg = JSON.parse(el.dataset.jump);
        if (selDept) selDept.value = cfg.dept || '';
        if (selClass) selClass.value = cfg.class || '';
        if (inputQ) inputQ.value = '';
        $$('.toggle').forEach(b=>b.setAttribute('aria-pressed','false'));
        const tgt = $$('.toggle').find(b=>b.dataset.dept===cfg.dept);
        (tgt || $$('.toggle')[0])?.setAttribute('aria-pressed','true');
        saveState(); renderNotes(); location.hash = '#notes';
      } catch(_){}
    });
  });

  loadState();
  loadNotes();

  // ===== Upload dialog / webhook
  const dialog = $('#uploadDialog');
  $('#btnUpload')?.addEventListener('click', ()=> dialog?.showModal());
  $('#cancelUpload')?.addEventListener('click', ()=> dialog?.close());

  const form = $('#uploadForm');
  const uClass = $('#uClass');
  const uName = $('#uName');
  const uSurname = $('#uSurname');
  const uNote = $('#uNote');
  const payload = $('#payload');
  const uFile = $('#uFile');

  form?.addEventListener('submit', (e)=>{
    const cls = uClass?.value || '';
    const wh = WEBHOOKS[cls];
    if(!cls || !wh){
      e.preventDefault();
      alert('Vyber triedu (alebo chýba webhook).');
      return;
    }
    form.action = wh + '?wait=true';

    // Avoid refresh re-POST
    const frame = $('#uploadTarget');
    frame?.addEventListener('load', () => { setTimeout(() => { frame.src = 'about:blank'; }, 200); }, { once: true });

    const now = new Date();
    const dateStr = now.toLocaleString('sk-SK', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    const content = `Žiak: **${uName?.value || ''} ${uSurname?.value || ''}** (${cls})\nDátum: ${dateStr}${uNote?.value?`\nPoznámka: ${uNote.value}`:''}`;

    const filename = (uFile && uFile.files && uFile.files[0] && uFile.files[0].name) ? uFile.files[0].name : 'subor';
    if (payload) payload.value = JSON.stringify({ content, attachments: [{ id: 0, filename }] });

    // Fallback plain 'content'
    let contentField = $('#contentField');
    if (!contentField && form) {
      contentField = document.createElement('input');
      contentField.type = 'hidden';
      contentField.name = 'content';
      contentField.id = 'contentField';
      form.appendChild(contentField);
    }
    if (contentField) contentField.value = content;

    setTimeout(()=>{
      dialog?.close();
      if (uClass) uClass.value=''; if (uName) uName.value=''; if (uSurname) uSurname.value=''; if (uNote) uNote.value='';
      if (uFile) uFile.value='';
      showSuccessModal();
    }, 400);
  });
});
