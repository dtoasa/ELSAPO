const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
// ── CONFIGURACIÓN DE RUTAS DE SEGURIDAD ──
// Ahora buscamos los secretos en la carpeta "NO SUBIR" para mayor seguridad
const ROOT_DIR = path.join(__dirname, '..');
const NO_SUBIR_DIR = path.join(ROOT_DIR, 'NO SUBIR');

const envPath = fs.existsSync(path.join(NO_SUBIR_DIR, '.env'))
    ? path.join(NO_SUBIR_DIR, '.env')
    : path.join(__dirname, '.env');

const serviceAccountPath = fs.existsSync(path.join(NO_SUBIR_DIR, 'service-account.json'))
    ? path.join(NO_SUBIR_DIR, 'service-account.json')
    : path.join(__dirname, 'service-account.json');

require('dotenv').config({ path: envPath });

// ── CONFIGURACIÓN DE FIREBASE ──
let db = null;

if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
}

async function syncToFirebase(allTasks) {
    if (!db) return;
    console.log('📤 Enviando datos a Firebase...');
    let addedCount = 0;
    for (const task of allTasks) {
        const dateParts = task.fecha.split('/');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        const taskTitle = `[${task.categoria}] ${task.resumen}`;

        const existing = await db.collection('school_tasks')
            .where('title', '==', taskTitle)
            .where('deadline', '==', formattedDate)
            .get();

        if (existing.empty) {
            await db.collection('school_tasks').add({
                title: taskTitle,
                desc: task.detalle,
                subject: task.categoria,
                deadline: formattedDate,
                assignee: 'all',
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: 'scraper_systematic_v4',
                source: 'Edukar360'
            });
            addedCount++;
        }
    }
    console.log(`✅ ¡Sincronizado! ${addedCount} tareas nuevas.`);
}

async function runScraper() {
    console.log('🚀 Iniciando Scraper (MODO EXPLORACIÓN DÍA POR DÍA)...');

    const user = process.env.USER_ALUMNO;
    const pass = process.env.PASS_ALUMNO;
    const loginUrl = 'https://novus.edukar360.com/extranet/portalestu/login';

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    try {
        console.log(`🔗 Navegando a: ${loginUrl}`);
        await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

        console.log('🔑 Iniciando sesión...');
        await page.fill('input[type="text"]', user);
        await page.fill('input[type="password"]', pass);
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForURL(/portalestu|dashboard|index/i, { timeout: 30000 }).catch(() => { })
        ]);

        console.log('✅ Acceso exitoso. Entrando a Agenda por menú...');
        await page.waitForTimeout(4000);

        const agendaLoc = page.locator('a, li, span, .nav-link').filter({ hasText: /Agenda|Deberes|Actividades/i }).first();
        if (await agendaLoc.isVisible()) {
            await agendaLoc.click();
        } else {
            console.log('⚠️ Forzando navegación directa...');
            await page.goto('https://novus.edukar360.com/extranet/portalestu/agenda/index', { waitUntil: 'networkidle' }).catch(() => { });
        }

        console.log('⏳ Esperando carga completa de los días (15s)...');
        await page.waitForTimeout(15000);

        // Detectar frame del calendario
        let frame = page;
        for (const f of page.frames()) {
            if (await f.$('.fc-daygrid-day, .fc-day, td.fc-day')) {
                frame = f;
                console.log('🎯 Capa de calendario localizada.');
                break;
            }
        }

        const results = [];
        // SELECCIONAMOS TODOS LOS DÍAS DEL MES (LAS CELDAS DEL CALENDARIO)
        const dayLocators = frame.locator('.fc-daygrid-day, .fc-day, td.fc-day');
        const count = await dayLocators.count();
        console.log(`🔍 Escaneando sistemáticamente ${count} celdas del calendario...`);

        for (let i = 0; i < count; i++) {
            const cell = dayLocators.nth(i);
            const cellText = await cell.innerText();

            // Si la celda no tiene número o texto, la saltamos
            if (!cellText.trim()) continue;

            try {
                // Extraer el número de día
                const dayMatch = cellText.match(/^\d{1,2}/);
                if (!dayMatch) continue;
                const dayNum = dayMatch[0].padStart(2, '0');

                // ¿Tiene algo escrito o hay marcadores que no sean el número?
                // Reemplazamos el número de día para ver si queda texto extra o iconos
                const pureText = cellText.replace(/^\d+/, '').trim();
                const hasIconOrEvent = await cell.locator('.fc-event, .fc-daygrid-event, [style*="background-color"], i, b, span:not(.fc-daygrid-day-number)').count() > 0;

                if (pureText.length > 2 || hasIconOrEvent) {
                    console.log(`� Investigando día ${dayNum} (Detectado contenido)...`);
                    await cell.scrollIntoViewIfNeeded();

                    // Hacer clic en la celda para abrir la ventana
                    await cell.click({ force: true, timeout: 5000 });
                    await page.waitForTimeout(3000);

                    // Extraer los eventos del popup
                    const modalInfo = await frame.evaluate(() => {
                        const modal = document.querySelector('.modal-content, .fc-popover, #detalle-actividad, .panel-detalle, .popover-content, .agenda-detalle, .modal-body');
                        return modal ? modal.innerText.trim() : null;
                    });

                    if (modalInfo) {
                        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
                        const year = new Date().getFullYear();
                        const fecha = `${dayNum}/${month}/${year}`;

                        results.push({
                            categoria: modalInfo.toUpperCase().includes('TAREA') ? "TAREA" : "AGENDA",
                            resumen: modalInfo.split('\n')[0].substring(0, 80),
                            detalle: modalInfo,
                            fecha: fecha
                        });
                        console.log(`   ✅ Tarea capturada del día ${dayNum}.`);
                    }

                    // Cerrar ventana
                    const closeBtn = frame.locator('.btn-close, .close, .fc-popover-close, .modal-header .close').first();
                    if (await closeBtn.isVisible()) {
                        await closeBtn.click();
                    } else {
                        await page.keyboard.press('Escape');
                    }
                    await page.waitForTimeout(1000);
                }
            } catch (e) {
                await page.keyboard.press('Escape');
            }
        }

        if (results.length > 0) {
            console.log(`\n✨ Scraping finalizado: ${results.length} actividades encontradas.`);
            const jsDir = path.join(__dirname, 'js');
            if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir);
            fs.writeFileSync(path.join(jsDir, 'agenda_data.js'), `var agendaData = ${JSON.stringify(results, null, 2)};`);
            await syncToFirebase(results);
        } else {
            console.log('\n❌ No se extrajeron actividades. Asegúrate de estar en el mes correcto.');
        }

        console.log('👀 Cerrando en 30 segundos...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('❌ Error Crítico:', error.message);
    } finally {
        await browser.close();
    }
}

runScraper();
