const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', 'CL', '.env') });

/**
 * Función para solicitar entrada por consola
 */
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => {
        rl.question(query, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Edukar360 Agenda Scraper (Padres y Estudiantes)
 */
async function runScraper() {
    console.log('🚀 Iniciando Scraper de Edukar360...');

    // Detectar entorno de GitHub Actions o CI
    const isAutomated = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';

    // 1. Seleccionar Portal
    let choice = process.env.SCRAPE_MODE; // '1' para padre, '2' para alumno
    if (!isAutomated && !choice) {
        console.log('\n--- SELECCIÓN DE PORTAL ---');
        console.log('1. Portal de Padres (portalpad)');
        console.log('2. Portal de Estudiantes (portalestu)');
        choice = await askQuestion('\nSeleccione una opción (1 o 2): ');
    } else if (!choice) {
        choice = '2'; // Por defecto alumno en automatización si no se especifica
    }

    let loginUrl, userEnv, passEnv;
    if (choice === '2') {
        loginUrl = 'https://novus.edukar360.com/extranet/portalestu/login';
        userEnv = process.env.USER_ALUMNO;
        passEnv = process.env.PASS_ALUMNO;
        console.log('🎓 Modo: Estudiante seleccionado.');
    } else {
        loginUrl = 'https://novus.edukar360.com/extranet/portalpad/login';
        userEnv = process.env.USER_PADRE;
        passEnv = process.env.PASS_PADRE;
        console.log('👨‍👩‍👧 Modo: Padre seleccionado.');
    }

    // 2. Obtener Credenciales
    let user = userEnv;
    if (!isAutomated && (!user || user.includes('tu_usuario'))) {
        user = await askQuestion('👤 Ingrese su usuario (DNI o Código): ');
    }

    let pass = passEnv;
    if (!isAutomated && !pass) {
        pass = await askQuestion('🔑 Ingrese su contraseña: ');
    }

    if (!user || !pass) {
        console.error('❌ Error: Usuario y contraseña son obligatorios.');
        if (isAutomated) console.error('Asegúrese de configurar USER_ALUMNO/PASS_ALUMNO en GitHub Secrets.');
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: isAutomated ? true : false,
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        console.log(`🔗 Navegando a: ${loginUrl}`);
        await page.goto(loginUrl, {
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

        // 3. Navegar a la Agenda
        console.log('📅 Buscando sección de Agenda/Tareas...');
        const agendaLink = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            // Busca 'agenda' o 'tareas' que son comunes en ambos portales
            return links.find(l => {
                const text = l.innerText.toLowerCase();
                return text.includes('agenda') || text.includes('tarea');
            })?.href;
        });

        if (agendaLink) {
            console.log(`🔗 Redirigiendo a: ${agendaLink}`);
            await page.goto(agendaLink, { waitUntil: 'networkidle2' });
        } else {
            console.log('⚠️ No se encontró link directo, explorando página principal...');
        }

        // 4. Extracción de Datos (Función Modular)
        async function extractTableData() {
            return await page.evaluate(() => {
                const items = [];
                const categories = ['tarea', 'agenda', 'deberes', 'lecciones', 'examen', 'aporte', 'taller', 'proyecto'];
                // Selectores amplios para capturar en ambos portales
                const selectors = 'tr, .agenda-item, .card, .list-group-item, .event-container, .tarea-item';
                const rows = document.querySelectorAll(selectors);
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

        // 5. Navegación a Futuro
        console.log('⏭️ Buscando fechas futuras...');
        const hasNextButton = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button, a, .fc-next-button'))
                .find(el => {
                    const t = el.innerText.toLowerCase();
                    return t.includes('sig') || el.classList.contains('fc-next-button');
                });
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });

        if (hasNextButton) {
            console.log('⏳ Cargando periodo siguiente...');
            await new Promise(r => setTimeout(r, 3000));
            const futureData = await extractTableData();
            allAgendaData = [...allAgendaData, ...futureData];
            console.log(`➕ Se agregaron ${futureData.length} elementos adicionales.`);
        }

        // 6. Guardar Resultados
        const projectRoot = path.join(__dirname, '..');
        const jsonDir = path.join(projectRoot, 'json');
        if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir);

        // Guardar como JSON (para APIs y GitHub Actions)
        const outputPath = path.join(jsonDir, 'agenda_resultado.json');
        fs.writeFileSync(outputPath, JSON.stringify(allAgendaData, null, 2));

        // Guardar como JS (para el visualizador local)
        const jsContent = '// Generado automáticamente por el scraper\nvar agendaData = ' + JSON.stringify(allAgendaData, null, 2) + ';\n';
        const jsPath = path.join(jsonDir, 'agenda_data.js');
        fs.writeFileSync(jsPath, jsContent);

        console.log(`\n💾 Resultados guardados en: ${outputPath}`);
        console.log(`💾 Datos JS guardados en: ${jsPath}`);
        console.table(allAgendaData.map(i => ({ Categoria: i.categoria, Resumen: i.resumen.substring(0, 40) })));

    } catch (error) {
        console.error('❌ Error:', error.message);
        const screenshotPath = path.join(__dirname, '..', 'error_screenshot.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot del error en: ${screenshotPath}`);
    } finally {
        await browser.close();
        console.log('🏁 Proceso finalizado.');
    }
}

runScraper();
