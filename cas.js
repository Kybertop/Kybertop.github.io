// cas.js – hodiny + stav prestávok s typom (Teória / Prax / Prax na teórii)
(() => {
  const TIMEZONE = 'Europe/Bratislava';

  // ⬇️ Upraviť podľa potreby (24h HH:MM). Pri teórii uveďeme priamo typ.
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

  // Vygenerujeme obsah widgetu: čas hore, separator, grid Teória | Prax | Prax(na teórii)
  widget.innerHTML = `
    <div class="bw-top">
      <span id="bwTime" class="bw-time">--:--:--</span>
    </div>
    <div class="bw-sep" role="presentation"></div>
    <div class="bw-grid2">
      <div class="bw-card" data-key="teoria">
        <div class="bw-title">Teória</div>
        <span class="bw-badge off"><span class="dot"></span><span class="txt">Nie je prestávka</span></span>
      </div>
      <div class="bw-card" data-key="prax">
        <div class="bw-title">Prax</div>
        <span class="bw-badge off"><span class="dot"></span><span class="txt">Nie je prestávka</span></span>
      </div>
      <div class="bw-card" data-key="prax_teoria">
        <div class="bw-title">Prax (na teórii)</div>
        <span class="bw-badge off"><span class="dot"></span><span class="txt">Nie je prestávka</span></span>
      </div>
    </div>
  `;

  const bwTime = document.getElementById('bwTime');

  // formátovače času
  const fmtClock = new Intl.DateTimeFormat('sk-SK', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const fmtHM = new Intl.DateTimeFormat('sk-SK', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false
  });

  // helpers
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const minutesNowTZ = () => {
    const parts = fmtHM.formatToParts(new Date());
    const h = Number(parts.find(p => p.type === 'hour').value);
    const m = Number(parts.find(p => p.type === 'minute').value);
    return h * 60 + m;
  };

  // vráti label pre aktuálny interval alebo null
  const currentLabel = (ranges) => {
    const now = minutesNowTZ();
    for (const r of ranges) {
      const s = toMin(r.start), e = toMin(r.end);
      if (now >= s && now < e) return r.label || 'Prestávka';
    }
    return null;
  };

  // dostane "kľúč" (teoria/prax/prax_teoria) a nastaví badge
  function setBadge(key, label) {
    const b = widget.querySelector(`.bw-card[data-key="${key}"] .bw-badge`);
    if (!b) return;
    const txt = b.querySelector('.txt');
    const isOn = !!label;

    b.classList.toggle('on',  isOn);
    b.classList.toggle('off', !isOn);
    txt.textContent = isOn ? label : 'Nie je prestávka';
  }

  function tick() {
    // hodiny
    bwTime.textContent = fmtClock.format(new Date());

    // stavy
    setBadge('teoria',      currentLabel(SCHEDULES.teoria));
    setBadge('prax',        currentLabel(SCHEDULES.prax));
    setBadge('prax_teoria', currentLabel(SCHEDULES.prax_teoria));
  }

  tick();
  setInterval(tick, 1000);
})();
