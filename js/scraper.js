const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', 'CL', '.env') });

/**
 * Función para solicitar entrada por consola
 */
function askQuestion(query, silent = false) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => {
        if (silent) {
            // Truco para ocultar la contraseña en la terminal
            process.stdout.write(query);
            const stdin = process.openStdin();
            process.stdin.on('data', char => {
                char = char + '';
                switch (char) {
                    case '\n':
                    case '\r':
                    case '\u0004':
                        stdin.pause();
                        break;
                    default:
                        process.stdout.clearLine();
                        readline.cursorTo(process.stdout, 0);
                        process.stdout.write(query + Array(rl.line.length + 1).join('*'));
                        break;
                }
            });
        }

        rl.question(query, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Edukar360 Agenda Scraper
 */
async function runScraper() {
    console.log('🚀 Iniciando Scraper de Edukar360...');

    // 0. Obtener Credenciales de forma interactiva
    let user = process.env.USER_EDUKAR;
    if (!user || user === 'your_username') {
        user = await askQuestion('👤 Ingrese su usuario de Edukar360: ');
    } else {
        console.log(`👤 Usando usuario: ${user}`);
    }

    // Siempre pedir la contraseña y no guardarla
    const pass = await askQuestion('🔑 Ingrese su contraseña: ');

    if (!user || !pass) {
        console.error('❌ Error: Usuario y contraseña son obligatorios.');
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        console.log('🔗 Navegando a la página de login...');
        await page.goto('https://novus.edukar360.com/extranet/portalpad/login', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('🔑 Ingresando credenciales en el portal...');
        await page.waitForSelector('input', { timeout: 10000 });

        await page.type('input[type="text"]', user);
        await page.type('input[type="password"]', pass);

        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);

        if (page.url().includes('login')) {
            throw new Error('No se pudo iniciar sesión. Verifique sus credenciales.');
        }

        console.log('✅ Login exitoso.');

        console.log('📅 Buscando sección de Agenda...');
        const agendaLink = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links.find(l => l.innerText.toLowerCase().includes('agenda'))?.href;
        });

        if (agendaLink) {
            await page.goto(agendaLink, { waitUntil: 'networkidle2' });
        } else {
            console.log('⚠️ No se encontró link directo a "Agenda", buscando en el menú...');
        }

        // Función para extraer datos de la página actual
        async function extractTableData() {
            return await page.evaluate(() => {
                const items = [];
                const categories = ['tarea', 'agenda', 'deberes', 'lecciones', 'examen', 'aporte', 'taller', 'proyecto'];
                const rows = document.querySelectorAll('tr, .agenda-item, .card, .list-group-item, .event-container');
                const dateRegex = /(\d{1,2})[\/\- ]?(\d{1,2}|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[\/\- ]?(\d{2,4})?/i;

                rows.forEach(row => {
                    const text = row.innerText.trim();
                    const lowerText = text.toLowerCase();
                    const matchedCategory = categories.find(cat => lowerText.includes(cat));

                    if (matchedCategory) {
                        const dateMatch = text.match(dateRegex);
                        let detectedDate = new Date().toLocaleDateString();
                        if (dateMatch) detectedDate = dateMatch[0];

                        items.push({
                            categoria: matchedCategory.toUpperCase(),
                            resumen: text.split('\n')[0].substring(0, 100),
                            detalle: text,
                            fecha: detectedDate,
                            timestamp: Date.now()
                        });
                    }
                });
                return items;
            });
        }

        let allAgendaData = await extractTableData();

        // 5. Intentar navegar a días/meses futuros si existe un botón de "Siguiente" o "Próximo"
        console.log('⏭️ Buscando controles para fechas futuras...');
        const hasNextButton = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button, a, .fc-next-button'))
                .find(el => el.innerText.toLowerCase().includes('sig') || el.classList.contains('fc-next-button'));
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });

        if (hasNextButton) {
            console.log('⏳ Cargando mes/semana siguiente...');
            await new Promise(r => setTimeout(r, 3000)); // Esperar carga
            const futureData = await extractTableData();
            allAgendaData = [...allAgendaData, ...futureData];
            console.log(`➕ Se agregaron ${futureData.length} elementos de fechas futuras.`);
        }

        console.log(`📊 Total recolectado: ${allAgendaData.length} elementos.`);

        const projectRoot = path.join(__dirname, '..');
        const jsonDir = path.join(projectRoot, 'json');
        if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir);

        const outputPath = path.join(jsonDir, 'agenda_resultado.json');
        fs.writeFileSync(outputPath, JSON.stringify(allAgendaData, null, 2));
        console.log(`💾 Resultados guardados en: ${outputPath}`);

        console.table(allAgendaData.map(i => ({ Categoria: i.categoria, Resumen: i.resumen.substring(0, 50) })));

    } catch (error) {
        console.error('❌ Error durante el proceso:', error.message);
        await page.screenshot({ path: 'error_screenshot.png' });
        console.log('📸 Screenshot del error guardada como error_screenshot.png');
    } finally {
        console.log('🏁 Cerrando navegador.');
        await browser.close();
    }
}

runScraper();
