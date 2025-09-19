/* breaks.modal.js — klik na badge otvorí modal s rozpisom a „najbližšia prestávka“ */
(function () {
  'use strict';

  // ====== Dáta (vezmeme z existujúceho globálu, inak fallback sem) ======
  const S = (window.BREAK_SCHEDULE ?? {
    theory: [
      { start: "07:50", end: "07:55", label: "Krátka" },
      { start: "08:40", end: "08:45", label: "Krátka" },
      { start: "09:30", end: "09:45", label: "Dlhá" },
      { start: "10:30", end: "10:35", label: "Krátka" },
      { start: "11:20", end: "11:25", label: "Krátka" },
      { start: "12:10", end: "12:40", label: "Obedová" },
      { start: "13:25", end: "13:30", label: "Krátka" },
      { start: "14:35", end: "14:40", label: "Krátka" },
      { start: "15:45", end: "15:50", label: "Krátka" }
    ],
    prax: [
      { start: "09:05", end: "09:20", label: "Prestávka" },
      { start: "12:45", end: "13:15", label: "Obedová" }
    ],
    praxTheory: [
      { start: "09:20", end: "09:35", label: "Prestávka" },
      { start: "12:45", end: "13:15", label: "Obedová" }
    ]
  });

  // ====== Pomocníci ======
  const $ = (s, r = document) => r.querySelector(s);
  const mOf = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const nowMin = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const fmt = (mins) => {
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const diffToHuman = (mins) => {
    if (mins <= 0) return '0 min';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h} h ${m} min`;
    if (h) return `${h} h`;
    return `${m} min`;
  };

  function enrich(ranges) {
    return ranges.map(r => ({
      ...r,
      s: mOf(r.start),
      e: mOf(r.end)
    })).sort((a, b) => a.s - b.s);
  }

  function computeStatus(ranges) {
    const list = enrich(ranges);
    const now = nowMin();

    // je teraz?
    const current = list.find(r => now >= r.s && now < r.e) || null;

    // najbližšia nasledujúca (začiatok po „teraz“)
    const next = list.find(r => r.s > now) || null;

    let nextIn = null;
    if (!current && next) nextIn = next.s - now;

    return { list, current, next, nextIn };
  }

  // ====== Modal templating ======
  function ensureDialog() {
    let d = $('#breaksDialog');
    if (d) return d;

    d = document.createElement('dialog');
    d.id = 'breaksDialog';
    d.innerHTML = `
      <div class="brm">
        <div class="brm-head">
          <div class="brm-title">Čas</div>
          <div class="brm-clock" id="brmClock">--:--:--</div>
          <button type="button" class="btn ghost brm-close" id="brmClose">Zavrieť</button>
        </div>

        <div class="brm-grid">
          <section class="brm-col" id="brmTheory"></section>
          <section class="brm-col" id="brmPraxe"></section>
          <section class="brm-col" id="brmPraxeTheory"></section>
        </div>
      </div>
    `;
    document.body.appendChild(d);

    $('#brmClose', d)?.addEventListener('click', () => d.close());
    d.addEventListener('click', (e) => {
      if (e.target === d) d.close(); // klik mimo
    });

    return d;
  }

  function badgeHTML(text, on) {
    return `
      <span class="bw-badge ${on ? 'on' : ''}">
        <span class="dot"></span>
        <span>${text}</span>
      </span>`;
  }

  function scheduleListHTML(list, current, next) {
    return `
      <ul class="brm-list">
        ${list.map(r => {
          const state =
            current && r.s === current.s ? 'is-current' :
            (!current && next && r.s === next.s ? 'is-next' : '');
          return `
            <li class="${state}">
              <span class="time">${r.start}–${r.end}</span>
              <span class="tag">${r.label}</span>
            </li>`;
        }).join('')}
      </ul>`;
  }

  function columnHTML(title, data, opts = {}) {
    const { list, current, next, nextIn } = data;

    const on = !!current;
    const topLine = on
      ? (opts.showType && current?.label ? `${current.label} prestávka` : 'Prestávka')
      : 'Nie je prestávka';

    const nextLine = (!on && next)
      ? `<div class="brm-next">Najbližšia: <strong>${next.start}</strong> (o ${diffToHuman(nextIn)})</div>`
      : `<div class="brm-next muted">Žiadna ďalšia dnes</div>`;

    return `
      <h4 class="brm-col-title">${title}</h4>
      <div class="brm-badge-wrap">
        ${badgeHTML(topLine, on)}
      </div>
      ${on ? '' : nextLine}
      ${scheduleListHTML(list, current, next)}
    `;
  }

  // ====== Render + live clock ======
  let clockTimer = null;
  function openModal() {
    const d = ensureDialog();

    const theory = computeStatus(S.theory);
    const prax = computeStatus(S.prax);
    const praxT = computeStatus(S.praxTheory);

    $('#brmTheory', d).innerHTML = columnHTML('Teória', theory, { showType: true });
    $('#brmPraxe', d).innerHTML = columnHTML('Prax', prax);
    $('#brmPraxeTheory', d).innerHTML = columnHTML('Prax (na teórii)', praxT);

    // živé hodiny + „next time“ prepočty
    const updateClock = () => {
      const now = new Date();
      $('#brmClock', d).textContent = now.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    updateClock();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(updateClock, 1000);

    if (!d.open) d.showModal();
  }

  // ====== Hook na klik z widgetu ======
  function init() {
    const w = document.querySelector('.break-widget');
    if (!w) return;

    // klik na celý „badge“ (teória / prax / prax na teórii)
    w.addEventListener('click', (e) => {
      if (e.target.closest('.bw-badge') || e.target.closest('.bw-card')) {
        openModal();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
