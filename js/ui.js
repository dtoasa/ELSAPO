const categoryColors = {
    'TAREA': '#fbbf24',
    'AGENDA': '#60a5fa',
    'DEBERES': '#60a5fa',
    'LECCIONES': '#c084fc',
    'EXAMEN': '#f43f5e',
    'APORTE': '#34d399',
    'TALLER': '#34d399',
    'PROYECTO': '#fb7185'
};

async function loadData() {
    const grid = document.getElementById('agenda-grid');

    try {
        // Buscamos el JSON en la carpeta json/
        const response = await fetch('json/agenda_resultado.json');
        if (!response.ok) throw new Error('No se encontró el archivo de datos.');

        const data = await response.json();

        if (data.length === 0) {
            showEmptyState('No hay actividades pendientes');
            return;
        }

        grid.innerHTML = '';
        data.forEach((item, index) => {
            const color = categoryColors[item.categoria] || '#6366f1';
            const delay = index * 0.1;

            const card = document.createElement('div');
            card.className = 'card';
            card.style.setProperty('--cat-color', color);
            card.style.animationDelay = `${delay}s`;

            card.innerHTML = `
                <span class="badge" style="--cat-color: ${color}">${item.categoria}</span>
                <div class="card-resumen">${item.resumen}</div>
                <div class="card-detalle">${item.detalle}</div>
                <div class="card-footer">
                    <span>📅 ${item.fecha}</span>
                    <span># Edukar360</span>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        showEmptyState('Error al cargar datos', 'Asegúrate de que <code>data/agenda_resultado.json</code> exista y el scraper se haya ejecutado.');
    }
}

function showEmptyState(title, message = '') {
    const grid = document.getElementById('agenda-grid');
    grid.innerHTML = `
        <div class="empty-state">
            <h2>${title}</h2>
            <p>${message}</p>
        </div>
    `;
}

// ── Mini Calendario ──
let calDate = new Date();
let selectedDays = new Set();

function renderCalendar() {
    const grid = document.getElementById('cal-grid');
    const label = document.getElementById('cal-month-label');
    if (!grid || !label) return;

    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const today = new Date();

    label.textContent = calDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const offset = (firstDay === 0) ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    grid.innerHTML = '';

    for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day';
        cell.textContent = d;

        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (selectedDays.has(key)) cell.classList.add('selected');
        if (today.getDate() === d && today.getMonth() === month && today.getFullYear() === year) {
            cell.classList.add('today');
        }

        cell.addEventListener('click', () => {
            if (selectedDays.has(key)) {
                selectedDays.delete(key);
                cell.classList.remove('selected');
            } else {
                selectedDays.add(key);
                cell.classList.add('selected');
            }
            updateSelectedLabel();
        });

        grid.appendChild(cell);
    }
    updateSelectedLabel();
}

function updateSelectedLabel() {
    const label = document.getElementById('selected-dates-label');
    if (!label) return;
    if (selectedDays.size === 0) {
        label.textContent = 'Ningún día seleccionado';
    } else {
        label.textContent = `📅 ${selectedDays.size} día(s) seleccionado(s)`;
    }
}

function loadDataForDates() {
    if (selectedDays.size === 0) {
        loadData();
    } else {
        loadData([...selectedDays]);
    }
}

// ── Login + Init ──
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();

    document.getElementById('cal-prev')?.addEventListener('click', () => {
        calDate.setMonth(calDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
        calDate.setMonth(calDate.getMonth() + 1);
        renderCalendar();
    });

    const loginForm = document.getElementById('login-form');
    const loginOverlay = document.getElementById('login-overlay');

    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            const user = document.getElementById('student-user').value;
            const pass = document.getElementById('student-pass').value;
            if (user && pass) {
                loginOverlay.classList.add('hidden');
                loadData();
            }
        };
    }
});
