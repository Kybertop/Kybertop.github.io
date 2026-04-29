function buildTicker() {
  const items = MODELS.map(m => `<span>${m.name}</span><span class="ticker-sep">///</span>`).join('');
  const t = document.getElementById('ticker-content');
  t.innerHTML = items.repeat(4);
}

function colorZoneDots(arr, max = 6) {
  if (!arr || !arr.length) return '';
  return arr.slice(0, max).map(c =>
    `<span class="color-dot" style="background:${COLORS[c]};" title="${c}"></span>`
  ).join('') + (arr.length > max ? `<span class="color-label">+${arr.length - max}</span>` : '');
}

function buildCard(m) {
  const zones = [m.colors, m.colors2, m.colors3].filter(z => z && z.length);
  const dotsHTML = zones.map((z, i) =>
    (i > 0 ? `<span class="color-zone-sep">/</span>` : '') + colorZoneDots(z)
  ).join('');

  const previewInner = m.image
    ? `<img class="card-preview-img" src="${m.image}" alt="${m.name}">`
    : `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.12;width:60px;height:60px"><rect x="10" y="10" width="60" height="60" stroke="#888" stroke-width="1.5"/><line x1="10" y1="10" x2="70" y2="70" stroke="#888" stroke-width="1"/><line x1="70" y1="10" x2="10" y2="70" stroke="#888" stroke-width="1"/></svg>`;

  return `
  <div class="model-card" data-id="${m.id}">
    <div class="card-preview">
      ${previewInner}
      <div class="card-arrow">&#x2192;</div>
    </div>
    <div class="card-body">
      <h3 class="card-name">${m.name}</h3>
      <p class="card-desc">${m.desc}</p>
      <div class="card-meta">
        <div class="meta-item">
          <div class="meta-label">Cena</div>
          <div class="meta-value price">${m.price}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Cas</div>
          <div class="meta-value time">${m.time}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Velkost</div>
          <div class="meta-value">${m.size}</div>
        </div>
      </div>
    </div>
    <div class="card-colors">
      ${dotsHTML}
    </div>
  </div>`;
}

function renderCards() {
  const grid = document.getElementById('catalog-grid');
  grid.innerHTML = MODELS.map(buildCard).join('');
  document.getElementById('visible-count').textContent = MODELS.length;

  grid.querySelectorAll('.model-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      openModal(MODELS.find(m => m.id === id));
    });
  });
}

function openModal(m) {
  document.getElementById('modal-title').textContent = m.name.toUpperCase();
  document.getElementById('modal-desc').textContent = m.desc;
  document.getElementById('modal-preview-inner').innerHTML = m.image
    ? `<img src="${m.image}" alt="${m.name}" style="width:100%;height:100%;object-fit:cover;">`
    : '';

  document.getElementById('modal-specs').innerHTML = `
    <div class="spec-item"><div class="spec-label">Cena</div><div class="spec-value hl">${m.price}</div></div>
    <div class="spec-item"><div class="spec-label">Cas tlace</div><div class="spec-value hl-o">${m.time}</div></div>
    <div class="spec-item"><div class="spec-label">Velkost</div><div class="spec-value hl-b">${m.size}</div></div>
    <div class="spec-item"><div class="spec-label">Material</div><div class="spec-value">${m.material}</div></div>
  `;

  const colorZones = [
    { label: 'Farba 1', arr: m.colors },
    { label: 'Farba 2', arr: m.colors2 },
    { label: 'Farba 3', arr: m.colors3 },
  ].filter(z => z.arr && z.arr.length);

  document.getElementById('modal-colors').innerHTML = colorZones.map((z, i) => `
    <div class="modal-color-zone">
      <div class="modal-zone-header">
        <span class="modal-zone-num">${i + 1}</span>
        <span class="modal-zone-label">${z.label}</span>
      </div>
      <div class="modal-zone-chips">
        ${z.arr.map(c => `<div class="modal-color-chip"><div class="chip-dot" style="background:${COLORS[c]};"></div>${c}</div>`).join('')}
      </div>
    </div>
  `).join('');

  document.getElementById('modal-email-btn').href =
    `mailto:pato@hesko.cc?subject=Objednavka: ${m.name}&body=Ahoj, mám záujem o model "${m.name}". `;

  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('model-count').textContent = MODELS.length;
buildTicker();
renderCards();
