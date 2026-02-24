# 🎓 Edukar360 Scraper Premium

Este es un scraper automatizado diseñado para extraer información académica del portal **Edukar360**.

## ✨ Características
- **Categorización Automática**: Filtra específicamente por Tareas, Agenda, Deberes, Lecciones, Exámenes, Aportes, Talleres y Proyectos.
- **Robustez**: Manejo de errores con capturas de pantalla automáticas en caso de fallo.
- **Seguridad**: Uso de variables de entorno para proteger las credenciales.
- **Exportación**: Genera un archivo `agenda_resultado.json` con toda la data limpia.

## 🚀 Requisitos
1. **Node.js**: Asegúrate de tener Node.js instalado.
2. **Dependencias**:
   ```bash
   npm install puppeteer dotenv
   ```

## 🛠️ Configuración
1. Edita el archivo `.env` en la raíz del proyecto.
2. Ingresa tu usuario y contraseña:
   ```env
   USER_EDUKAR=tu_usuario
   PASS_EDUKAR=tu_password
   ```

## 🏃‍♂️ Ejecución
Para iniciar el scraping, ejecuta:
```bash
node scraper.js
```

## 📂 Salida
Los datos se guardarán en `agenda_resultado.json` con el siguiente formato:
```json
[
  {
    "categoria": "TAREA",
    "resumen": "Título de la tarea...",
    "detalle": "Texto completo contenido en el elemento...",
    "fecha": "24/02/2026",
    "timestamp": 1740412674000
  }
]
```

---
*Nota: Dado que el DOM de los portales educativos puede cambiar, es posible que se requieran ajustes menores en los selectores de `scraper.js`.*
