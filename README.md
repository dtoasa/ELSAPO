# EduTrack + Scraper Edukar360 (Unificado)

Este proyecto une el sistema de gestión de tareas escolar con el motor de scraping de Edukar360.

## Estructura
- `/` - Contiene la aplicación web (index.html, admin.html, student.html).
- `/css/` - Estilos globales.
- `/js/` - Lógica de Firebase para el frontend.
- `/backend_scraper/` - El motor Node.js que extrae tareas de Edukar360.

## Cómo usar

### 1. Aplicación Web
Simplemente abre `index.html` en un navegador (o usa una extensión de Live Server en VS Code).
- Usa el panel de **Admin** para crear tareas manualmente.
- Usa el panel de **Estudiante** para ver tus tareas.

### 2. Scraper (Obtener tareas reales)
Para traer las tareas automáticamente de Edukar360:
1. Asegúrate de tener **Node.js** instalado.
2. Entra a la carpeta `backend_scraper`:
   ```bash
   cd backend_scraper
   ```
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Configura tus credenciales en el archivo `.env`.
5. Ejecuta el scraper:
   ```bash
   npm run scrape
   ```

Los resultados se guardarán en `backend_scraper/data/agenda_resultado.json`.

---
*Nota: Próximamente se habilitará la sincronización automática directa a la base de datos Firebase.*
