const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend desde la raíz
app.use(express.static(path.join(__dirname, '..')));

app.post('/api/run-scraper', (req, res) => {
    console.log('📡 Petición recibida: Iniciando Scraper...');

    // Iniciar el scraper como un proceso hijo
    const scraperProcess = spawn('node', ['scraper.js'], {
        cwd: __dirname
    });

    // Configurar Server-Sent Events (SSE) para enviar logs en tiempo real
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    scraperProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        res.write(`data: ${JSON.stringify({ type: 'log', message })}\n\n`);
    });

    scraperProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    });

    scraperProcess.on('close', (code) => {
        res.write(`data: ${JSON.stringify({ type: 'done', code })}\n\n`);
        res.end();
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor de control iniciado en http://localhost:${PORT}`);
    console.log(`💡 Ahora puedes usar el botón en el index.html`);
});
