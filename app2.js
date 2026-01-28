// Slovenské názvy dní
const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
const shortDayNames = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];

// Stav aplikácie
let selectedDay = null;
let orders = [];

// Auto-refresh interval
let refreshInterval = null;
const REFRESH_INTERVAL = 10000; // 10 sekúnd

// ==================== INICIALIZÁCIA ====================

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initNavigation();
    initDaySelector();
    initForm();
    initImageZoomDrag();
    initOrdersView();
    await loadOrders();
    startAutoRefresh();
});

// ==================== THEME ====================

function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    });
}

// ==================== GOOGLE SHEETS API ====================

async function loadOrders() {
    const container = document.getElementById('orders-list');
    
    // Zobraz loading len ak je prázdne
    if (orders.length === 0 && container) {
        container.innerHTML = '<div class="empty-state"><p>Načítavam...</p></div>';
    }
    
    try {
        const response = await fetch(`${CONFIG.API_URL}?action=get`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            orders = data;
        } else if (data.error) {
            console.error('API error:', data.error);
            loadFromLocalStorage();
        }
    } catch (error) {
        console.error('Chyba pri načítaní:', error);
        loadFromLocalStorage();
    }
    
    renderOrders();
}

async function addOrder(order) {
    try {
        const response = await fetch(`${CONFIG.API_URL}?action=add&data=${encodeURIComponent(JSON.stringify(order))}`);
        const result = await response.json();
        
        if (result.success) {
            orders.push(order);
            return true;
        } else {
            console.error('API error:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Chyba pri ukladaní:', error);
        return false;
    }
}

async function updateOrderInSheet(order) {
    try {
        const response = await fetch(`${CONFIG.API_URL}?action=update&data=${encodeURIComponent(JSON.stringify(order))}`);
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Chyba pri aktualizácii:', error);
        return false;
    }
}

async function deleteOrderFromSheet(id) {
    try {
        const response = await fetch(`${CONFIG.API_URL}?action=delete&id=${id}`);
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Chyba pri mazaní:', error);
        return false;
    }
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem('lunch_orders');
    orders = stored ? JSON.parse(stored) : [];
}

// ==================== AUTO REFRESH ====================

function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(async () => {
        await loadOrders();
    }, REFRESH_INTERVAL);
}

// ==================== NAVIGÁCIA ====================

function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    
    // Načítaj uložený view
    const savedView = localStorage.getItem('activeView') || 'reservation';
    switchView(savedView);
    
    navBtns.forEach(btn => {
        if (btn.dataset.view === savedView) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            switchView(view);
            localStorage.setItem('activeView', view);
        });
    });
}

function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${view}-view`).classList.add('active');
    
    if (view === 'orders') {
        renderOrders();
    }
}

// ==================== VÝBER DŇA ====================

function getAvailableDays() {
    const days = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDayOfWeek = now.getDay();
    
    const monday = new Date(now);
    const diff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(date.getDate() + i);
        
        const dayOfWeek = date.getDay();
        const isToday = date.toDateString() === now.toDateString();
        const isPast = date < now && !isToday;
        const isTodayAfterNoon = isToday && currentHour >= 12;
        const isDisabled = isPast || isTodayAfterNoon;
        
        days.push({
            date: date,
            dayOfWeek: dayOfWeek,
            name: dayNames[dayOfWeek],
            shortName: shortDayNames[dayOfWeek],
            dateStr: formatDate(date),
            fullDateStr: formatFullDate(date),
            isDisabled: isDisabled,
            isToday: isToday
        });
    }
    
    return days;
}

function formatDate(date) {
    return `${date.getDate()}.${date.getMonth() + 1}.`;
}

function formatFullDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function initDaySelector() {
    const container = document.getElementById('day-selector');
    const days = getAvailableDays();
    
    container.innerHTML = '';
    
    days.forEach((day) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'day-btn';
        btn.disabled = day.isDisabled;
        btn.dataset.date = day.fullDateStr;
        
        btn.innerHTML = `
            <span class="day-name">${day.name}</span>
            <span class="day-date">${day.dateStr}</span>
        `;
        
        btn.addEventListener('click', () => selectDay(btn, day));
        
        if (!day.isDisabled && selectedDay === null) {
            selectDay(btn, day);
        }
        
        container.appendChild(btn);
    });
}

function selectDay(btn, day) {
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedDay = day;
}

// ==================== FORMULÁR ====================

function initForm() {
    const form = document.getElementById('reservation-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitReservation();
    });
}

async function submitReservation() {
    if (!selectedDay) {
        showToast('Vyberte deň rezervácie', 'error');
        return;
    }
    
    const form = document.getElementById('reservation-form');
    const submitBtn = document.getElementById('submit-btn');
    const formData = new FormData(form);
    
    const soup = formData.get('soup') || 'Bez'; // Default "Bez polievky" ak nie je vybraná
    const menu = formData.get('menu');
    const firstName = formData.get('firstName').trim();
    const lastName = formData.get('lastName').trim();
    const pickupTime = formData.get('pickupTime');
    const note = formData.get('note').trim();
    
    if (!menu || !firstName || !lastName || !pickupTime) {
        showToast('Vyplňte všetky povinné polia', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ukladám...';
    
    const order = {
        id: Date.now(),
        date: selectedDay.fullDateStr,
        dayName: selectedDay.name,
        firstName: firstName,
        lastName: lastName,
        soup: soup,
        menu: menu,
        pickupTime: pickupTime,
        note: note,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    const success = await addOrder(order);
    
    submitBtn.disabled = false;
    submitBtn.textContent = 'Odoslať rezerváciu';
    
    if (success) {
        form.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        document.getElementById('note').value = '';
        showToast(`Rezervácia na ${selectedDay.name} ${selectedDay.dateStr} bola odoslaná`, 'success');
        renderOrders();
    } else {
        showToast('Chyba pri odosielaní rezervácie', 'error');
    }
}

// ==================== IMAGE ZOOM & DRAG ====================

function initImageZoomDrag() {
    const container = document.getElementById('menu-container');
    const image = document.getElementById('menu-image');
    
    if (!container || !image) return;
    
    let scale = 1;
    let panning = false;
    let pointX = 0;
    let pointY = 0;
    let startX = 0;
    let startY = 0;
    
    function setTransform() {
        image.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    }
    
    // Mouse wheel zoom
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const xs = (e.clientX - container.getBoundingClientRect().left - pointX) / scale;
        const ys = (e.clientY - container.getBoundingClientRect().top - pointY) / scale;
        
        const delta = -e.deltaY;
        if (delta > 0) {
            scale *= 1.1;
        } else {
            scale /= 1.1;
        }
        
        // Limit scale
        scale = Math.min(Math.max(0.5, scale), 4);
        
        pointX = e.clientX - container.getBoundingClientRect().left - xs * scale;
        pointY = e.clientY - container.getBoundingClientRect().top - ys * scale;
        
        setTransform();
    });
    
    // Mouse drag - len pri držaní ľavého tlačidla
    container.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Len ľavé tlačidlo
        e.preventDefault();
        panning = true;
        startX = e.clientX - pointX;
        startY = e.clientY - pointY;
        container.style.cursor = 'grabbing';
    });
    
    container.addEventListener('mouseup', () => {
        panning = false;
        container.style.cursor = 'grab';
    });
    
    container.addEventListener('mouseleave', () => {
        panning = false;
        container.style.cursor = 'grab';
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!panning) return;
        e.preventDefault();
        pointX = e.clientX - startX;
        pointY = e.clientY - startY;
        setTransform();
    });
    
    // Touch support
    let lastTouchDist = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            panning = true;
            startX = e.touches[0].clientX - pointX;
            startY = e.touches[0].clientY - pointY;
        } else if (e.touches.length === 2) {
            panning = false;
            lastTouchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    });
    
    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        
        if (e.touches.length === 1 && panning) {
            pointX = e.touches[0].clientX - startX;
            pointY = e.touches[0].clientY - startY;
            setTransform();
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            scale *= dist / lastTouchDist;
            scale = Math.min(Math.max(0.5, scale), 4);
            lastTouchDist = dist;
            setTransform();
        }
    });
    
    container.addEventListener('touchend', () => {
        panning = false;
    });
    
    // Double click to reset
    container.addEventListener('dblclick', () => {
        scale = 1;
        pointX = 0;
        pointY = 0;
        setTransform();
    });
}

// ==================== OBJEDNÁVKY ====================

function initOrdersView() {
    updateDayFilter();
}

function updateDayFilter() {
    const select = document.getElementById('filter-day');
    const days = getAvailableDays();
    
    select.innerHTML = '<option value="all">Všetky</option>';
    
    days.forEach(day => {
        const option = document.createElement('option');
        option.value = day.fullDateStr;
        option.textContent = `${day.name} ${day.dateStr}`;
        select.appendChild(option);
    });
    
    select.addEventListener('change', renderOrders);
}

function renderOrders() {
    const container = document.getElementById('orders-list');
    const filterValue = document.getElementById('filter-day').value;
    
    console.log('Všetky objednávky:', orders);
    
    let filteredOrders = [...orders];
    
    if (filterValue !== 'all') {
        filteredOrders = filteredOrders.filter(o => o.date === filterValue);
    }
    
    filteredOrders.sort((a, b) => {
        if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
        }
        return (a.pickupTime || '').localeCompare(b.pickupTime || '');
    });
    
    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Žiadne objednávky</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredOrders.map(order => {
        const soupText = order.soup === 'Bez' ? 'Bez polievky' : `Polievka ${order.soup}`;
        // Extrahuj len čas HH:MM
        let pickupTime = order.pickupTime || '';
        if (pickupTime.includes('T')) {
            // Ak je to ISO timestamp, extrahuj čas
            pickupTime = pickupTime.split('T')[1]?.substring(0, 5) || pickupTime;
        } else if (pickupTime.length > 5) {
            pickupTime = pickupTime.substring(0, 5);
        }
        
        return `
            <div class="order-card ${order.completed ? 'completed' : ''}" data-id="${order.id}">
                <div class="order-info">
                    <div class="order-day-badge">${order.dayName || ''} ${order.date ? formatDateFromStr(order.date) : ''}</div>
                    <div class="order-name">${escapeHtml(order.firstName || '')} ${escapeHtml(order.lastName || '')}</div>
                    <div class="order-details">${soupText} • Menu ${order.menu}</div>
                    ${order.note ? `<div class="order-note">Poznámka: ${escapeHtml(order.note)}</div>` : ''}
                    <div class="order-time">Vyzdvihnutie: ${pickupTime}</div>
                </div>
                <div class="order-actions">
                    <button class="action-btn complete" title="${order.completed ? 'Zrušiť vyzdvihnutie' : 'Označiť ako vyzdvihnuté'}" onclick="toggleComplete(${order.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                    <button class="action-btn delete" title="Vymazať" onclick="deleteOrder(${order.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function formatDateFromStr(dateStr) {
    const parts = dateStr.split('-');
    return `${parseInt(parts[2])}.${parseInt(parts[1])}.`;
}

async function toggleComplete(id) {
    const order = orders.find(o => o.id === id);
    if (order) {
        order.completed = !order.completed;
        const success = await updateOrderInSheet(order);
        if (success) {
            renderOrders();
        } else {
            order.completed = !order.completed; // Revert
            showToast('Chyba pri aktualizácii', 'error');
        }
    }
}

async function deleteOrder(id) {
    if (confirm('Naozaj chcete vymazať túto objednávku?')) {
        const success = await deleteOrderFromSheet(id);
        if (success) {
            orders = orders.filter(o => o.id !== id);
            renderOrders();
            showToast('Objednávka bola vymazaná', 'success');
        } else {
            showToast('Chyba pri mazaní', 'error');
        }
    }
}

// ==================== POMOCNÉ FUNKCIE ====================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
