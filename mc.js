'use strict';
// Standalone Minecraft client logic. Include this AFTER app.js:
// <script src="mc.js"></script>
(() => {
  const HOST = 'energo.ddns.net';
  let timer = null;
  const $  = (s, r=document) => r.querySelector(s);

  // ---------- utils ----------
  function fetchWithTimeout(url, {ms=9000, ...opts}={}){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort('timeout'), ms);
    return fetch(url, {signal: ctrl.signal, cache:'no-store', ...opts})
      .finally(()=>clearTimeout(t));
  }
  async function getJSON(url, opts){ const r = await fetchWithTimeout(url, opts); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }

  // Resolve Mojang UUID by name (cache 7d)
  const _cache = JSON.parse(localStorage.getItem('energo_uuid_cache')||'{}');
  const _save  = ()=>{ try{ localStorage.setItem('energo_uuid_cache', JSON.stringify(_cache)); }catch(_){}};
  async function resolveUUID(name){
    const k = (name||'').toLowerCase(); if(!k) return null;
    const hit = _cache[k]; const now = Date.now();
    if(hit && now-hit.ts < 7*24*60*60*1000) return hit.uuid || null;
    // PlayerDB first (CORS ok)
    try{
      const d = await getJSON(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(name)}`);
      const uuid = d?.data?.player?.raw_id || d?.data?.player?.id?.replace(/-/g,'') || null;
      if(uuid){ _cache[k] = {uuid, ts:now}; _save(); return uuid; }
    }catch(_){}
    // Mojang
    try{
      const d2 = await getJSON(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`);
      const id = d2?.id || null; if(id){ _cache[k] = {uuid:id, ts:now}; _save(); return id; }
    }catch(_){}
    _cache[k] = {uuid:null, ts:now}; _save(); return null;
  }

  // ---------- data ----------
  async function fetchStatus_any(){
    // Run both in parallel, take first successful
    const a = getJSON(`https://api.mcstatus.io/v2/status/java/${HOST}`)
      .then(d=>({src:'mcstatus', d}));
    const b = getJSON(`https://api.mcsrvstat.us/2/${HOST}`)
      .then(d=>({src:'mcsrv', d}));
    try {
      const {src, d} = await Promise.any([a, b]);
      if(src==='mcstatus') return d;
      // normalize mcsrvstat to mcstatus shape
      return {
        online: !!d.online,
        players: { online: d.players?.online||0, max: d.players?.max||0, list: (d.players?.list||[]).map(n=>({name:n, uuid:null})) },
        motd: { clean: Array.isArray(d.motd?.clean) ? d.motd.clean.join('\n') : (d.motd?.clean||'') },
        version: { name_clean: d.version || '' }
      };
    } catch (err){
      // If both failed, throw one of them
      const d = await getJSON(`https://api.mcsrvstat.us/2/${HOST}`);
      return {
        online: !!d.online,
        players: { online: d.players?.online||0, max: d.players?.max||0, list: (d.players?.list||[]).map(n=>({name:n, uuid:null})) },
        motd: { clean: Array.isArray(d.motd?.clean) ? d.motd.clean.join('\n') : (d.motd?.clean||'') },
        version: { name_clean: d.version || '' }
      };
    }
  }

  async function fetchPlayers_only(){
    try{
      const d = await getJSON(`https://api.mcstatus.io/v2/players/java/${HOST}`);
      let list = d?.players?.list || d?.players?.sample || d?.online || [];
      if(Array.isArray(list) && list.length){
        return list.map(p => (typeof p==='string') ? { name:p, uuid:null } : { name:p.name_clean||p.name||p.name_raw||'', uuid:p.uuid||null });
      }
    }catch(_){}
    try{
      const d2 = await getJSON(`https://api.mcsrvstat.us/2/${HOST}`);
      const list2 = d2.players?.list || [];
      if(Array.isArray(list2) && list2.length){
        return list2.map(n=>({ name:n, uuid:null }));
      }
    }catch(_){}
    return [];
  }

  // ---------- render ----------
  async function render(){
    const st = $('#mcStatusText'), grid = $('#mcPlayers'), empty = $('#mcPlayersEmpty');
    if(!st || !grid || !empty) return;
    st.textContent = 'Načítavam stav servera…';
    grid.innerHTML = ''; empty.classList.add('hide');

    try{
      const data = await fetchStatus_any();
      const online = !!data?.online || (data?.players?.online ?? 0) >= 0;
      const count  = data?.players?.online ?? 0;
      const max    = data?.players?.max    ?? 0;
      const ver    = data?.version?.name_clean || '';

      st.innerHTML = online ? `<span class="mc-badge">🟢 Online</span> <span class="muted">Hráči: ${count}/${max}${ver?' • '+ver:''}</span>`
                            : `<span class="mc-badge">🔴 Offline</span>`;

      let players = (data.players?.list || data.players?.sample || []);
      if((!players || !players.length) && online && count>0){
        players = await fetchPlayers_only();
      }

      const title = document.querySelector('#minecraft .section-title h3');
      if(title) title.textContent = `Online hráči${count?` (${count})`:''}`;

      if(players && players.length){
        for (const p of players){
          const name = p.name || p.name_clean || p.name_raw || '';
          let uuid = p.uuid || null;
          // initial avatar by name
          let avatar = uuid
            ? `https://crafatar.com/avatars/${uuid}?size=40&overlay`
            : `https://mc-heads.net/avatar/${encodeURIComponent(name)}/40`;
          const item = document.createElement('div');
          item.className = 'mc-player';
          const imgId = `a_${Math.random().toString(36).slice(2)}`;
          item.innerHTML = `<img id="${imgId}" src="${avatar}" alt="" loading="lazy"><div>${name}</div>`;
          grid.appendChild(item);
          // if no uuid (offline-mode list), try resolve real premium uuid and swap
          if (!uuid){
            resolveUUID(name).then(u=>{
              if(u){ const im = document.getElementById(imgId); if(im) im.src = `https://crafatar.com/avatars/${u}?size=40&overlay&d=mm#${Date.now()}`; }
            });
          }
        }
      } else {
        empty.textContent = online ? 'Hráči sú online, ale zoznam je skrytý.' : 'Nikto nie je online.';
        empty.classList.remove('hide');
      }
    }catch(err){
      console.error('MC fetch error:', err);
      st.textContent = 'Nepodarilo sa načítať dáta o serveri.';
      empty.classList.remove('hide');
    }
  }

  function start(){
    stop(); render(); timer = setInterval(render, 30000);
    $('#mcRefresh')?.addEventListener('click', render);
    $('#mcCopy')?.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText('energo.ddns.net');
        const b=$('#mcCopy'); if(b){ const t=b.textContent; b.textContent='Skopírované'; setTimeout(()=>b.textContent=t,1200); } }catch(_){}
    });
  }
  function stop(){ if(timer){ clearInterval(timer); timer=null; } }
  function nav(){ const h = location.hash || '#home'; if (h==='#minecraft') start(); else stop(); }
  window.addEventListener('hashchange', nav); document.addEventListener('DOMContentLoaded', nav); nav();
})();