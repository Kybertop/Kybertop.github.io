'use strict';
/* Minecraft: status + players + Recommended Mods (Sodium + Simple Voice Chat) */
(function(){
  const HOST = 'energo.ddns.net';
  const DAY  = new Date().toISOString().slice(0,10);
  const REFRESH_MS = 30_000;            // auto-refresh interval (ms)
  let refreshTimer = null;

  const $  = (s, r=document) => r.querySelector(s);

  async function json(url){
    const r = await fetch(url, { cache:'no-store' });
    if (!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }
  async function statusAny(){
    try { return await json(`https://api.mcstatus.io/v2/status/java/${HOST}`); } catch(_){}
    const d = await json(`https://api.mcsrvstat.us/2/${HOST}`);
    return { online: !!d.online, players:{online:d.players?.online||0,max:d.players?.max||0,list:(d.players?.list||[]).map(n=>({name:n}))}, version:{name_clean:d.version||''} };
  }
  async function playersOnly(){
    try{
      const d = await json(`https://api.mcstatus.io/v2/players/java/${HOST}`);
      return d?.players?.list || d?.players?.sample || [];
    }catch(_){ return []; }
  }
  const avatar = (name, uuid)=> uuid
    ? `https://mc-heads.net/avatar/${encodeURIComponent(name)}/40#${DAY}`
    : `https://mc-heads.net/avatar/${encodeURIComponent(name)}/40#${DAY}`;

  function ensureModsCard(){
    const mcPage = document.querySelector('#minecraft');
    if (!mcPage) return;
    const columns = mcPage.querySelector('.columns') || mcPage;
    if (document.getElementById('mcModsCard')) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'mcModsCard';
    card.innerHTML = `
      <div class="section-title"><h3 style="margin:0">Odporúčané módy</h3></div>
      <div class="mods-grid">
        <a class="mod" href="https://modrinth.com/mod/sodium" target="_blank" rel="noopener">
          <div class="mod-title">Sodium</div>
          <div class="mod-desc">Rýchlejší rendering (vyššie FPS).</div>
        </a>
        <a class="mod" href="https://modrinth.com/mod/simple-voice-chat" target="_blank" rel="noopener">
          <div class="mod-title">Simple Voice Chat</div>
          <div class="mod-desc">Hlasový chat priamo v hre (Fabric/Forge/Quilt).</div>
        </a>
      </div>`;
    columns.appendChild(card);
  }

  async function render(){
    const st = $('#mcStatusText'), grid = $('#mcPlayers'), empty = $('#mcPlayersEmpty');
    if(!st || !grid || !empty) return;
    st.textContent = 'Načítavam stav servera…'; grid.innerHTML = ''; empty.classList.add('hide');
    try{
      const d = await statusAny();
      const online = !!d.online; const c=d.players?.online||0, m=d.players?.max||0, ver=d.version?.name_clean||'';
      st.innerHTML = online ? `<span class="mc-badge">🟢 Online</span> <span class="muted">Hráči: ${c}/${m}${ver?' • '+ver:''}</span>` : `<span class="mc-badge">🔴 Offline</span>`;
      let list = d.players?.list || [];
      if (!list.length && online && c>0) list = await playersOnly();

      const seen = new Set(); const uniq = [];
      for (const p of list){
        const name = (p.name || p.name_clean || p.name_raw || p).toString();
        const key = name.toLowerCase();
        if (!seen.has(key)){ seen.add(key); uniq.push({ name, uuid: p.uuid }); }
      }

      if (uniq.length){
        for (const {name, uuid} of uniq){
          const item = document.createElement('div');
          item.className='mc-player';
          item.innerHTML = `<img src="${avatar(name, uuid)}" alt="" loading="lazy"><div>${name}</div>`;
          grid.appendChild(item);
        }
      } else {
        empty.classList.remove('hide');
      }
    }catch(e){ st.textContent='Nepodarilo sa načítať dáta o serveri.'; empty.classList.remove('hide'); }
  }

  // --- auto-refresh iba na karte #minecraft ---
  const onMinecraft = () => (location.hash || '#home') === '#minecraft';
  function startAuto(){ stopAuto(); refreshTimer = setInterval(() => { if (onMinecraft()) render(); }, REFRESH_MS); }
  function stopAuto(){ if (refreshTimer){ clearInterval(refreshTimer); refreshTimer = null; } }

  function start(){ ensureModsCard(); render(); startAuto(); }
  function nav(){
    if (onMinecraft()) start();
    else stopAuto();
  }

  document.addEventListener('DOMContentLoaded', nav);
  window.addEventListener('hashchange', nav);

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('mcRefresh')?.addEventListener('click', render);
    document.getElementById('mcCopy')?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText('energo.ddns.net:443'); }catch(_){}});
  });
})();
