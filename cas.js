// cas.js – hodiny + stav prestávok s typom + tooltip "najbližšia/končí o"
(() => {
  const TIMEZONE = 'Europe/Bratislava';

  // ⬇️ Upraviť podľa potreby (24h HH:MM)
  const SCHEDULES = {
    prax: [
      { start: '09:05', end: '09:20', label: 'Prestávka' },
      { start: '12:45', end: '13:15', label: 'Obedová prestávka' },
    ],
    prax_teoria: [
      { start: '09:20', end: '09:35', label: 'Prestávka' },
      { start: '12:45', end: '13:15', label: 'Obedová prestávka' },
    ],
    teoria: [
      { start: '07:50', end: '07:55', label: 'Krátka prestávka' },
      { start: '08:40', end: '08:45', label: 'Krátka prestávka' },
      { start: '09:30', end: '09:45', label: 'Dlhá prestávka' },
      { start: '10:30', end: '10:35', label: 'Krátka prestávka' },
      { start: '11:20', end: '11:25', label: 'Krátka prestávka' },
      { start: '12:10', end: '12:40', label: 'Obedová prestávka' },
      { start: '13:25', end: '13:30', label: 'Krátka prestávka' },
      { start: '14:35', end: '14:40', label: 'Krátka prestávka' },
      { start: '15:45', end: '15:50', label: 'Krátka prestávka' },
    ],
  };

  const widget = document.getElementById('breakWidget');
  if (!widget) return;

  widget.innerHTML = `
    <div class="bw-top">
      <span id="bwTime" class="bw-time">--:--:--</span>
    </div>
    <div class="bw-sep" role="presentation"></div>
    <div class="bw-grid2">
      <div class="bw-card" data-key="teoria">
        <div class="bw-title">Teória</div>
        <span class="bw-badge off" title="Načítavam…"><span class="dot"></span><span class="txt">Nie je prestávka</span></span>
      </div>
      <div class="bw-card" data-key="prax">
        <div class="bw-title">Prax</div>
        <span class="bw-badge off" title="Načítavam…"><span class="dot"></span><span class="txt">Nie je prestávka</span></span>
      </div>
      <div class="bw-card" data-key="prax_teoria">
        <div class="bw-title">Prax (na teórii)</div>
        <span class="bw-badge off" title="Načítavam…"><span class="dot"></span><span class="txt">Nie je prestávka</span></span>
      </div>
    </div>
  `;

  const bwTime = document.getElementById('bwTime');

  const fmtClock = new Intl.DateTimeFormat('sk-SK', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const fmtHM = new Intl.DateTimeFormat('sk-SK', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false
  });

  // helpery
  const toMin = (hhmm) => { const [h,m] = hhmm.split(':').map(Number); return h*60 + m; };
  const pad2 = (n) => n.toString().padStart(2,'0');
  const minutesNowTZ = () => {
    const parts = fmtHM.formatToParts(new Date());
    const h = Number(parts.find(p=>p.type==='hour').value);
    const m = Number(parts.find(p=>p.type==='minute').value);
    return h*60 + m;
  };
  const diffStr = (mins) => {
    if (mins <= 0) return 'o chvíľu';
    if (mins < 60) return `za ${mins} min`;
    const h = Math.floor(mins/60), m = mins%60;
    return m ? `za ${h} h ${m} min` : `za ${h} h`;
  };

  // nájde aktuálny interval (ak beží) alebo najbližší, spolu s tooltip textom
  function computeState(ranges){
    const now = minutesNowTZ();
    let current = null;
    let next = null;

    for (const r of ranges){
      const s = toMin(r.start), e = toMin(r.end);
      if (now >= s && now < e){ current = { ...r, s, e }; break; }
      if (s > now && (!next || s < next.s)) next = { ...r, s, e };
    }

    if (current){
      const left = current.e - now;
      return {
        on: true,
        label: current.label || 'Prestávka',
        tooltip: `Končí o ${current.end} (${diffStr(left)})`
      };
    }
    if (next){
      const until = next.s - now;
      return {
        on: false,
        label: 'Nie je prestávka',
        tooltip: `Najbližšia o ${next.start} (${diffStr(until)})`
      };
    }
    return { on:false, label:'Nie je prestávka', tooltip:'Dnes už bez prestávky' };
  }

  function setBadge(key, state){
    const b = widget.querySelector(`.bw-card[data-key="${key}"] .bw-badge`);
    if (!b) return;
    const txt = b.querySelector('.txt');
    const cardEl = b.closest('.bw-card');            // ⬅️ pridané
  
    b.classList.toggle('on',  state.on);
    b.classList.toggle('off', !state.on);
    txt.textContent = state.on ? state.label : 'Nie je prestávka';
    b.setAttribute('title', state.tooltip);
    b.setAttribute('aria-label', `${key}: ${txt.textContent}. ${state.tooltip}`);
  
    cardEl?.classList.toggle('on',  state.on);      // ⬅️ pridané (voliteľné zvýraznenie karty)
  }

  function tick(){
    // hodiny
    bwTime.textContent = fmtClock.format(new Date());

    // stavy + tooltipy
    setBadge('teoria',      computeState(SCHEDULES.teoria));
    setBadge('prax',        computeState(SCHEDULES.prax));
    setBadge('prax_teoria', computeState(SCHEDULES.prax_teoria));
  }

  tick();
  setInterval(tick, 1000);
})();
