const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'CL', '.env') });

/**
 * Edukar360 Agenda Scraper
 * Extracts: Tareas, Agenda, Deberes, Lecciones, Exámenes, Aportes, Talleres, Proyectos.
 */

async function runScraper() {
    console.log('🚀 Iniciando Scraper de Edukar360...');

    // Validar credenciales
    if (!process.env.USER_EDUKAR || !process.env.PASS_EDUKAR) {
        console.error('❌ Error: Falta USER_EDUKAR o PASS_EDUKAR en el archivo .env');
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: false, // Cambiar a true si no quieres ver el navegador
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        // 1. Navegar al Login
        console.log('🔗 Navegando a la página de login...');
        await page.goto('https://novus.edukar360.com/extranet/portalpad/login', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // 2. Proceso de Login
        // Nota: Los selectores exactos pueden variar según la versión del portal.
        // Se intentan selectores comunes.
        console.log('🔑 Ingresando credenciales...');

        // Esperar a que el formulario cargue
        await page.waitForSelector('input', { timeout: 10000 });

        // Identificar campos por name, placeholder o tipo
        await page.type('input[type="text"]', process.env.USER_EDUKAR);
        await page.type('input[type="password"]', process.env.PASS_EDUKAR);

        // Hacer clic en entrar (usualmente es el primer botón de submit)
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);

        console.log('✅ Login exitoso.');

        // 3. Navegar a la Agenda
        // Edukar360 suele tener una URL específica para la agenda o un enlace en el sidebar
        console.log('📅 Buscando sección de Agenda...');

        // Si conocemos la URL directa, es más rápido:
        // await page.goto('https://novus.edukar360.com/extranet/portalpad/agenda', { waitUntil: 'networkidle2' });

        // Si no, buscamos el enlace en el menú
        const agendaLink = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links.find(l => l.innerText.toLowerCase().includes('agenda'))?.href;
        });

        if (agendaLink) {
            await page.goto(agendaLink, { waitUntil: 'networkidle2' });
        } else {
            console.log('⚠️ No se encontró link directo a "Agenda", buscando en el menú principal...');
        }

        // 4. Extracción de Datos
        console.log('🔍 Extrayendo información académica...');

        const agendaData = await page.evaluate(() => {
            const items = [];
            const categories = ['tarea', 'agenda', 'deberes', 'lecciones', 'examen', 'aporte', 'taller', 'proyecto'];

            // Buscamos en elementos que suelen contener tareas (ej: tablas, cards, list-items)
            // Esto es genérico y debe ajustarse según el DOM real
            const rows = document.querySelectorAll('tr, .agenda-item, .card, .list-group-item');

            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                const matchedCategory = categories.find(cat => text.includes(cat));

                if (matchedCategory) {
                    items.push({
                        categoria: matchedCategory.toUpperCase(),
                        resumen: row.innerText.trim().split('\n')[0], // Primera línea como título
                        detalle: row.innerText.trim(),
                        fecha: new Date().toLocaleDateString(), // Por defecto hoy
                        timestamp: Date.now()
                    });
                }
            });

            return items;
        });

        console.log(`📊 Se encontraron ${agendaData.length} elementos relevantes.`);

        // 5. Guardar resultados
        // Al estar el script en /js, el root es ..
        const projectRoot = path.join(__dirname, '..');
        const jsonDir = path.join(projectRoot, 'json');
        if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir);

        const outputPath = path.join(jsonDir, 'agenda_resultado.json');
        fs.writeFileSync(outputPath, JSON.stringify(agendaData, null, 2));
        console.log(`💾 Resultados guardados en: ${outputPath}`);

        // Mostrar un resumen en consola
        console.table(agendaData.map(i => ({ Categoria: i.categoria, Resumen: i.resumen.substring(0, 50) })));

    } catch (error) {
        console.error('❌ Error durante el proceso:', error.message);
        // Generar screenshot del error para debugging
        await page.screenshot({ path: 'error_screenshot.png' });
        console.log('📸 Screenshot del error guardada como error_screenshot.png');
    } finally {
        console.log('🏁 Cerrando navegador.');
        await browser.close();
    }
}

runScraper();
