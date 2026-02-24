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
   Para descargar las dependencias (dentro de la carpeta `json`):
   ```bash
   cd json
   npm install
   cd ..
   ```

## 🛠️ Configuración
1. Edita el archivo `.env` dentro de la carpeta **`CL/`**.
2. Ingresa tus usuarios (opcional):
   ```env
   USER_PADRE=tu_usuario_dni
   USER_ALUMNO=tu_usuario_estudiante
   ```
   *Nota: Por seguridad, las contraseñas NO se guardan. El script te las pedirá según el portal que elijas.*

## 🏃‍♂️ Ejecución
Para iniciar el scraping, ejecuta desde la raíz:
```bash
node js/scraper.js
```
El script te preguntará si deseas ingresar al portal de **Padres** o de **Estudiantes**.

## 📂 Salida
Los datos se guardarán en `json/agenda_resultado.json`.
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
