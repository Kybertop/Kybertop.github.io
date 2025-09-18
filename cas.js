// cas.js – hodiny + stav prestávok (Prax / Prax na teórii / Teória)
(() => {
  const TIMEZONE = 'Europe/Bratislava';

  // ⬇️ Sem upravuj časy (24h HH:MM). Môžeš pridávať/mazať intervaly.
  const SCHEDULES = {
    prax: [
      ['09:05','09:20'],
      ['12:45','13:15'], // obedová
    ],
    prax_teoria: [
      ['09:20','09:35'],
      ['12:45','13:15'], // obedová
    ],
    teoria: [
      ['07:50','07:55'],
      ['08:40','08:45'],
      ['09:30','09:45'], // dlhá
      ['10:30','10:35'],
      ['11:20','11:25'],
      ['12:10','12:40'], // obedová
      ['13:25','13:30'],
      ['14:35','14:40'],
      ['15:45','15:50'],
    ],
  };

  const widget = document.getElementById('breakWidget');
  if (!widget) return;

  // pôvodný jeden badge schováme (ak existuje)
  const oldBadge = document.getElementById('bwLabel'); if (oldBadge) oldBadge.style.display = 'none';

  // čas
  const bwTime = document.getElementById('bwTime');
  const fmtClock = new Intl.DateTimeFormat('sk-SK', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const fmtHM = new Intl.DateTimeFormat('sk-SK', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false
  });

  // vytvoríme grid troch „kariet“
  const grid = document.createElement('div');
  grid.id = 'bwGrid';
  grid.className = 'bw-grid';
  grid.innerHTML = `
    <div class="bw-card" data-key="prax">
      <div class="bw-title">Prax</div>
      <span class="bw-badge off"><span class="dot"></span>Prestávka</span>
    </div>
    <div class="bw-card" data-key="prax_teoria">
      <div class="bw-title">Prax (na teórii)</div>
      <span class="bw-badge off"><span class="dot"></span>Prestávka</span>
    </div>
    <div class="bw-card wide" data-key="teoria">
      <div class="bw-title">Teória</div>
      <span class="bw-badge off"><span class="dot"></span>Prestávka</span>
    </div>
  `;
  widget.appendChild(grid);

  const card = (key) => grid.querySelector(`.bw-card[data-key="${key}"] .bw-badge`);

  const toMin = (hhmm) => { const [h,m] = hhmm.split(':').map(Number); return h*60+m; };
  const minutesNowTZ = () => {
    const parts = fmtHM.formatToParts(new Date());
    const h = Number(parts.find(p=>p.type==='hour').value);
    const m = Number(parts.find(p=>p.type==='minute').value);
    return h*60 + m;
  };

  const inAnyBreak = (list) => {
    const now = minutesNowTZ();
    return list.some(([s,e]) => now >= toMin(s) && now < toMin(e));
  };

  function tick(){
    if (bwTime) bwTime.textContent = fmtClock.format(new Date());

    const states = {
      prax:        inAnyBreak(SCHEDULES.prax),
      prax_teoria: inAnyBreak(SCHEDULES.prax_teoria),
      teoria:      inAnyBreak(SCHEDULES.teoria),
    };

    for (const [k,on] of Object.entries(states)) {
      const badge = card(k);
      if (!badge) continue;
      badge.classList.toggle('on',  on);
      badge.classList.toggle('off', !on);
      // text ostáva stále "Prestávka" – farba bodky hovorí, či práve je (zelená) alebo nie (červená)
    }
  }

  tick();
  setInterval(tick, 1000);
})();
