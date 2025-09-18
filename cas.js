// cas.js – hodiny + informácia o prestávke vo footeri (nezávislé od app.js)
(() => {
  // ⬇️ sem si vieš ľahko upraviť prestávky (24h formát HH:MM)
  const BREAKS = [
    { start: '09:20', end: '09:35', label: 'Prestávka' },
    { start: '12:45', end: '13:15', label: 'Prestávka' },
  ];
  const TIMEZONE = 'Europe/Bratislava';

  const bwTime  = document.getElementById('bwTime');
  const bwLabel = document.getElementById('bwLabel');
  if (!bwTime || !bwLabel) return; // widget nie je na stránke

  const fmtClock = new Intl.DateTimeFormat('sk-SK', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const fmtHM = new Intl.DateTimeFormat('sk-SK', {
    timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false
  });

  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  function minutesNowTZ() {
    const parts = fmtHM.formatToParts(new Date());
    const h = Number(parts.find(p => p.type === 'hour').value);
    const m = Number(parts.find(p => p.type === 'minute').value);
    return h * 60 + m;
  }

  function tick() {
    bwTime.textContent = fmtClock.format(new Date());

    const nowMin = minutesNowTZ();
    let inBreak = false;
    let label = 'Mimo prestávky';
    for (const { start, end, label: l } of BREAKS) {
      const s = toMin(start), e = toMin(end);
      if (nowMin >= s && nowMin < e) { inBreak = true; label = l || 'Prestávka'; break; }
    }

    bwLabel.textContent = inBreak ? `Prebieha ${label.toLowerCase()}` : 'Mimo prestávky';
    bwLabel.classList.toggle('on',  inBreak);
    bwLabel.classList.toggle('off', !inBreak);
  }

  tick();
  setInterval(tick, 1000);
})();
