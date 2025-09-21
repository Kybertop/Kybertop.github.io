'use strict';

/* ====== DISCORD WEBHOOKY (so šifrovaním) ====== */
const WEBHOOKS = {
  '1.C': '68747470733A2F2F646973636F72642E636F6D2F6170692F776562686F6F6B732F313431373631383333393635313635333732332F734F3265696A5556566931304B3539356B544C4376787269546A61454B3473714473414B465A544D47386E4F57426976684665495633685931397574667267774A705070',
  '2.C': '68747470733A2F2F646973636F72642E636F6D2F6170692F776562686F6F6B732F313431373631383334363234303737303136332F50774A52315A30766159594B6D58484653313078704361425761424D335350732D37626D7949524148384A35325947465F53746A724154335356637A5030662D6C534736',
  '3.C': '68747470733A2F2F646973636F72642E636F6D2F6170692F776562686F6F6B732F313431373631383335303031353531323632392F7544385150737A4559774B4A4354576D333142675855645249306D7266654B6868735865556F614B676A526C76684F39354F352D674939474A5A30432D464E684C485676',
  '2.G': '68747470733A2F2F646973636F72642E636F6D2F6170692F776562686F6F6B732F313431373631383335373437323938353139352F57373237477A6465714F6F386C674A6F41306C596B6E71576E4F665461706C3237486539586F444E54307A725A75762D473944434767636B4C75715249596F5469544171'
};

const BOT_NAME = 'Energo';

document.addEventListener('DOMContentLoaded', () => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  const pages = $$('[data-page]');
  const tabs  = $$('a[data-route]');
  function showPage(id){
    const target = pages.some(p=>p.id===id) ? id : 'home';
    pages.forEach(p => p.classList.toggle('hide', p.id !== target));
    tabs.forEach(t => t.setAttribute('aria-current', t.getAttribute('href') === '#' + target ? 'page' : 'false'));
    window.scrollTo({ top: 0 });
  }
  const getId = () => (location.hash || '#home').slice(1) || 'home';
  window.addEventListener('hashchange', () => showPage(getId()));
  showPage(getId());

  const hdr = document.querySelector('header');
  const toggle = $('#menuToggle');
  const panel  = $('#mobilePanel');
  const openMenu  = ()=>{ hdr?.classList.add('nav-open');    toggle?.setAttribute('aria-expanded','true');  panel?.removeAttribute('hidden'); };
  const closeMenu = ()=>{ hdr?.classList.remove('nav-open'); toggle?.setAttribute('aria-expanded','false'); panel?.setAttribute('hidden',''); };
  toggle?.addEventListener('click', ()=> hdr?.classList.contains('nav-open') ? closeMenu() : openMenu());
  panel?.addEventListener('click', (e)=>{ if (e.target.closest('a[data-route]')) closeMenu(); });
  window.addEventListener('hashchange', closeMenu);

  let NOTES_DATA = [];
  const wrap = $('#notesWrap'), empty = $('#emptyState');
  const selDept = $('#dept'), selClass = $('#klass'), inputQ = $('#query');

  async function loadNotes(){
    try{
      if (empty){ empty.classList.remove('hide'); empty.textContent = 'Načítavam poznámky…'; }
      const res = await fetch('notes.json', {cache:'no-store'});
      if (!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Bad format');
      NOTES_DATA = data;
    }catch(_){
      try{
        await new Promise((resolve, reject)=>{
          const s = document.createElement('script'); s.src = 'notes.js?v='+Date.now(); s.defer = true;
          s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        });
        if (Array.isArray(window.NOTES_DATA)) NOTES_DATA = window.NOTES_DATA; else throw 0;
      }catch(e){
        if (empty){ empty.classList.remove('hide'); empty.textContent = 'Nepodarilo sa načítať poznámky.'; }
        return;
      }
    }finally{
      if (empty) empty.classList.add('hide');
    }
    renderNotes();
  }

  function renderNotes(){
    if (!wrap) return;
    let list = Array.isArray(NOTES_DATA) ? [...NOTES_DATA] : [];
    const q = (inputQ?.value || '').trim().toLowerCase();
    const d = selDept?.value || ''; const c = selClass?.value || '';
    if (d) list = list.filter(n => n.dept === d);
    if (c) list = list.filter(n => n.class === c);
    if (q) list = list.filter(n => (n.title + ' ' + (n.tags||[]).join(' ')).toLowerCase().includes(q));

    wrap.innerHTML = '';
    if (!list.length){ if (empty){ empty.classList.remove('hide'); empty.textContent = 'Žiadne poznámky.'; } return; }
    if (empty) empty.classList.add('hide');

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
      const grid = document.createElement('div'); grid.className = 'notes-grid';

      groups[klass].forEach(n => {
        const card = document.createElement('article');
        card.className = 'card note';
        card.innerHTML = `
          <h3>${n.title}</h3>
          <div class="meta">${n.dept} • ${n.class} • ${n.size || ''}</div>
          <div style="margin-bottom:10px">${(n.tags||[]).map(t=>`<span class='tag'>#${t}</span>`).join('')}</div>
          <a class="btn" href="${n.file}" download>Stiahnuť</a>`;
        grid.appendChild(card);
      });
      section.appendChild(grid);
      frag.appendChild(section);

      if (idx !== classes.length - 1){
        const sep = document.createElement('div'); sep.className = 'group-sep'; frag.appendChild(sep);
      }
    });
    wrap.appendChild(frag);
  }

  selDept?.addEventListener('input', renderNotes);
  selClass?.addEventListener('input', renderNotes);
  inputQ?.addEventListener('input', renderNotes);
  $('#clear')?.addEventListener('click', ()=>{
    if (selDept) selDept.value=''; if (selClass) selClass.value=''; if (inputQ) inputQ.value='';
    $$('.toggle[data-dept]').forEach(b=>b.setAttribute('aria-pressed', b.dataset.dept === '' ? 'true' : 'false'));
    renderNotes();
  });

  $$('.toggle[data-dept]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.dept || '';
      if (selDept) selDept.value = val;
      const group = btn.parentElement;
      group.querySelectorAll('.toggle').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      renderNotes();
    });
  });

  loadNotes();

  const dialog = $('#uploadDialog');
  $('#btnUpload')?.addEventListener('click', ()=> dialog?.showModal());
  $('#cancelUpload')?.addEventListener('click', ()=> dialog?.close());

  const form = $('#uploadForm');
  const uClass = $('#uClass'), uName = $('#uName'), uSurname = $('#uSurname'), uNote = $('#uNote');
  const payload = $('#payload'), uFile = $('#uFile');

  // elegantný success dialog
  function showSuccess(){
    let d = document.getElementById('sentDialog');
    if (!d){
      d = document.createElement('dialog'); d.id = 'sentDialog';
      d.innerHTML = `
        <div style="background:linear-gradient(180deg,#111113,#0f0f11);border:1px solid var(--border);border-radius:16px;padding:22px 22px 16px;max-width:420px;box-shadow:var(--shadow);text-align:center">
          <svg style="width:28px;height:28px;color:var(--accent)" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm-1 13.17l-3.59-3.58L9 10l2 2 4-4 1.41 1.42L11 15.17z"/></svg>
          <h3 style="margin:8px 0 6px">Správa odoslaná</h3>
          <p class="muted" style="margin:0">Tvoja práca bola úspešne odoslaná.</p>
          <div style="margin-top:12px"><button type="button" class="btn small" id="sentCloseBtn">OK</button></div>
        </div>`;
      document.body.appendChild(d);
      d.querySelector('#sentCloseBtn')?.addEventListener('click', ()=> d.close());
    }
    if (!d.open) d.showModal();
    setTimeout(()=>{ if(d.open) d.close(); }, 2000);
  }

  form?.addEventListener('submit', (e)=>{
    const cls = uClass?.value || ''; const wh = WEBHOOKS[cls];
    if(!cls || !wh){ e.preventDefault(); alert('Vyber triedu (alebo chýba webhook).'); return; }

    form.action = '/relay';

    const now = new Date();
    const dateStr = now.toLocaleString('sk-SK', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });

    const name = (uName?.value || '').trim();
    const surname = (uSurname?.value || '').trim();
    const note = (uNote?.value || '').trim();

    const content = `🎓 Žiak: **${name} ${surname}** (${cls})
📅 Dátum: ${dateStr}${note ? `
📝 Poznámka: ${note}` : ''}`;

    const filename = (uFile && uFile.files && uFile.files[0] && uFile.files[0].name)
      ? uFile.files[0].name : 'subor';

    if (payload) payload.value = JSON.stringify({
      username: BOT_NAME,
      content,
      attachments: [{ id: 0, filename }]
    });

    let contentField = $('#contentField');
    if (!contentField && form) {
      contentField = document.createElement('input');
      contentField.type = 'hidden'; contentField.name = 'content'; contentField.id = 'contentField';
      form.appendChild(contentField);
    }
    if (contentField) contentField.value = content;

    const frame = $('#uploadTarget');
    frame?.addEventListener('load', () => { setTimeout(() => { frame.src = 'about:blank'; }, 200); }, { once:true });

    setTimeout(()=>{
      dialog?.close();
      if (uClass) uClass.value=''; if (uName) uName.value=''; if (uSurname) uSurname.value=''; if (uNote) uNote.value='';
      if (uFile) uFile.value='';
      showSuccess();
    }, 400);
  });
});
