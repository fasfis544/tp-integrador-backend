# Verificación de la integración

## Resultado local

- **46 pruebas automatizadas aprobadas**, sin reintentos.
- **11 capturas de página completa** generadas con el recorrido automatizado.
- `npm audit`: **0 vulnerabilidades reportadas** al momento de la verificación.
- Datos de desarrollo: seis productos de demostración; las pruebas no modifican este catálogo.
- Las bases `sportswear_test_<id>` se eliminan al terminar cada ejecución normal.

Entorno verificado: Windows, Node.js **24.19.0**, MySQL **9.7.2** y Chromium instalado por Playwright. El workflow para Linux/MySQL 8.4 queda incluido, pero su resultado remoto solo estará disponible tras ejecutarlo en GitHub.

## Aislamiento de datos

La conexión original no estaba disponible en el puerto configurado. Para esta validación se inició **otra instancia MySQL local en el puerto 3307**, con datos de demostración, sin cambiar el servicio MySQL existente en 3306. El `.env` local apunta a la instancia de demostración y no se publica.

La instancia usada durante la sesión es de desarrollo y debe estar encendida para usar la app. En otro equipo, o si esa instancia se detiene, configurá una instancia MySQL disponible siguiendo el README y ejecutá `npm run db:setup`. No se incluye una base de datos embebida ni un servicio MySQL instalado automáticamente por npm.

Las pruebas y las capturas usan una **base adicional temporal** dentro de la instancia seleccionada por `DB_HOST` y `DB_PORT`. El servidor de pruebas solo acepta nombres con el patrón `sportswear_test_<id>` y la limpieza no permite eliminar otras bases.

## Cobertura

| Área | Comprobaciones |
| --- | --- |
| API / MySQL | Listado, consulta por ID, creación, edición, baja, activación y desactivación |
| Validaciones | Campos requeridos, longitud, precios, decimales, categorías, imágenes, estado e IDs |
| Errores | 400, 404, 413, 500, health 503 y dashboard sin base disponible |
| Seguridad básica | SQL como texto, HTML escapado y errores sin credenciales |
| Inicio | Nombre requerido, normalización y entrada a tienda |
| Catálogo | Filtros combinados, búsqueda, vacío, reintento y fallback de imagen |
| Carrito | Agregar, aumentar, reducir, eliminar, vaciar, total y compra de demostración |
| Persistencia | Recarga, datos corruptos, productos inactivos, precios del servidor y límite de 99 unidades |
| Navegador | Modo oscuro persistente, localStorage bloqueado y ausencia de excepciones JS en los recorridos |
| Dashboard | CRUD mediante formularios, precarga, cancelación y mensajes de error |
| Móvil | Recorridos a 390 px y comprobación de desbordes horizontales |

Parte de las pruebas de estados vacíos, reintento e imagen rota intercepta respuestas de red para reproducir esas condiciones. Las pruebas CRUD y los recorridos normales usan la API y MySQL reales. La indisponibilidad de MySQL también se prueba con un proceso de servidor separado y una conexión inválida, no solo con una respuesta simulada.

## Reproducción

Con Node.js, MySQL y `.env` configurados:

```bash
npm ci
npx playwright install chromium
npm test
npm run screenshots
npm audit
```

El reporte HTML se abre con `npm run test:report`. Las trazas y capturas de fallos quedan en `test-results/`; los reportes no se versionan. Las capturas del portafolio sí se versionan en `docs/capturas/`.

Esta validación no equivale a una auditoría de seguridad ni garantiza compatibilidad con todos los dispositivos. No se probaron pagos reales, usuarios autenticados ni pedidos porque esas funciones no existen en esta demo.
