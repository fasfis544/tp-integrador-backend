import express from 'express';
import { productRoutes, viewRoutes } from './api/routes/index.js';
import { join, __dirname } from './api/utils/index.js';
import connection from './api/database/db.js';

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'src/views'));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(join(__dirname, 'src/public')));
app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

app.get('/', (req, res) => res.render('inicio', { tittle: 'Tu próximo movimiento' }));
app.get('/tienda', (req, res) => res.render('tienda', { tittle: 'Tienda deportiva' }));
app.get('/vistas/inicio.html', (req, res) => res.redirect('/'));
app.get('/vistas/ecommerce.html', (req, res) => res.redirect('/tienda'));
app.get('/health', async (req, res) => {
    try {
        await connection.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch {
        res.status(503).json({ status: 'error', database: 'unavailable' });
    }
});

app.use('/api/productos', productRoutes);
app.use('/dashboard', viewRoutes);
app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ruta no encontrada' });
    res.status(404).render('error', { tittle: 'Página no encontrada', message: 'La página que buscás no existe.' });
});
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const invalidJson = error.type === 'entity.parse.failed';
    const status = invalidJson ? 400 : error.status === 413 ? 413 : 500;
    const message = invalidJson ? 'El cuerpo debe ser JSON válido' : status === 413 ? 'Solicitud demasiado grande' : 'No pudimos completar la solicitud. Revisá la conexión a MySQL.';
    if (status === 500) console.error(error.message);
    if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
    res.status(status).render('error', { tittle: 'Ocurrió un error', message });
});

export default app;
