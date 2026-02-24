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

// ── Cargar y mostrar datos ──
async function loadData(filterDates) {
    const grid = document.getElementById('agenda-grid');
    grid.innerHTML = '<div class="empty-state"><h2>⏳ Cargando...</h2></div>';

    try {
        const response = await fetch('json/agenda_resultado.json');
        if (!response.ok) throw new Error('Archivo no encontrado.');

        let data = await response.json();

        // Filtrar por fechas si hay días seleccionados en el calendario
        if (filterDates && filterDates.length > 0) {

            // Convertir claves del calendario "YYYY-MM-DD" a objetos {dia, mes, anio}
            const selSet = filterDates.map(fd => {
                const parts = fd.split('-');
                return { anio: parseInt(parts[0]), mes: parseInt(parts[1]), dia: parseInt(parts[2]) };
            });

            data = data.filter(item => {
                if (!item.fecha) return false;
                // La fecha en el JSON puede ser "DD/MM/YYYY", "DD-MM-YYYY", o similar
                // Extraemos todos los números que encontremos
                const nums = item.fecha.match(/\d+/g);
                if (!nums || nums.length < 2) return false;
                // Asumimos formato DD/MM/YYYY → nums[0]=dia, nums[1]=mes, nums[2]=año
                const itemDia = parseInt(nums[0]);
                const itemMes = parseInt(nums[1]);
                const itemAnio = nums[2] ? parseInt(nums[2]) : null;

                return selSet.some(s =>
                    s.dia === itemDia && s.mes === itemMes &&
                    (itemAnio === null || s.anio === itemAnio)
                );
            });

            if (data.length === 0) {
                showEmptyState(
                    '📭 Sin actividades en esas fechas',
                    'No hay tareas registradas para los días seleccionados.'
                );
                return;
            }
        }

        if (data.length === 0) {
            showEmptyState('📭 Agenda vacía', 'Ejecuta el scraper para cargar la agenda real de Edukar360.');
            return;
        }

        grid.innerHTML = '';
        data.forEach((item, index) => {
            const color = categoryColors[item.categoria] || '#6366f1';
            const delay = index * 0.1;
            const card = document.createElement('div');
            card.className = 'card';
            card.style.setProperty('--cat-color', color);
            card.style.animationDelay = delay + 's';
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
        showEmptyState('Error al cargar datos', 'Ejecuta el scraper primero.');
    }
}

function showEmptyState(title, message) {
    const grid = document.getElementById('agenda-grid');
    grid.innerHTML = `
        <div class="empty-state">
            <h2>${title}</h2>
            <p>${message || ''}</p>
        </div>
    `;
}

// ── Mini Calendario ──
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

var calYear = new Date().getFullYear();
var calMonth = new Date().getMonth(); // 0-11
var selDays = new Set();

function buildCalendar() {
    var grid = document.getElementById('cal-grid');
    var label = document.getElementById('cal-month-label');
    if (!grid || !label) { return; }

    label.textContent = MESES[calMonth] + ' ' + calYear;
    grid.innerHTML = '';

    var firstDow = new Date(calYear, calMonth, 1).getDay();
    var offset = (firstDow === 0) ? 6 : firstDow - 1;
    var total = new Date(calYear, calMonth + 1, 0).getDate();
    var todayD = new Date().getDate();
    var todayM = new Date().getMonth();
    var todayY = new Date().getFullYear();

    for (var i = 0; i < offset; i++) {
        var blank = document.createElement('div');
        blank.className = 'cal-day empty';
        grid.appendChild(blank);
    }

    for (var d = 1; d <= total; d++) {
        var cell = document.createElement('div');
        cell.className = 'cal-day';
        cell.textContent = d;

        var key = calYear + '-'
            + String(calMonth + 1).padStart(2, '0') + '-'
            + String(d).padStart(2, '0');

        if (selDays.has(key)) cell.classList.add('selected');
        if (d === todayD && calMonth === todayM && calYear === todayY)
            cell.classList.add('today');

        (function (k, el) {
            el.addEventListener('click', function () {
                if (selDays.has(k)) {
                    selDays.delete(k);
                    el.classList.remove('selected');
                } else {
                    selDays.add(k);
                    el.classList.add('selected');
                }
                refreshLabel();
            });
        })(key, cell);

        grid.appendChild(cell);
    }
    refreshLabel();
}

function refreshLabel() {
    var lbl = document.getElementById('selected-dates-label');
    if (!lbl) return;
    lbl.textContent = selDays.size === 0
        ? 'Ningún día seleccionado'
        : '📅 ' + selDays.size + ' día(s) seleccionado(s)';
}

function loadDataForDates() {
    loadData(selDays.size > 0 ? Array.from(selDays) : null);
}

// ── Login + Init ──
document.addEventListener('DOMContentLoaded', function () {
    buildCalendar();

    var btnPrev = document.getElementById('cal-prev');
    var btnNext = document.getElementById('cal-next');

    if (btnPrev) btnPrev.addEventListener('click', function () {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        buildCalendar();
    });
    if (btnNext) btnNext.addEventListener('click', function () {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        buildCalendar();
    });

    var loginForm = document.getElementById('login-form');
    var loginOverlay = document.getElementById('login-overlay');
    if (loginForm) {
        loginForm.onsubmit = function (e) {
            e.preventDefault();
            var user = document.getElementById('student-user').value;
            var pass = document.getElementById('student-pass').value;
            if (user && pass) {
                loginOverlay.classList.add('hidden');
                loadData(null);
            }
        };
    }
});
