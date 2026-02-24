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

// Manejo del Login y Carga Inicial
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginOverlay = document.getElementById('login-overlay');

    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();

            // Simulación de validación
            const user = document.getElementById('student-user').value;
            const pass = document.getElementById('student-pass').value;

            if (user && pass) {
                loginOverlay.classList.add('hidden');
                loadData(); // Cargar la agenda una vez "autenticado"
            }
        };
    }
});
