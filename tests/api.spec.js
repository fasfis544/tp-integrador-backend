import { test, expect } from '@playwright/test';
import { sampleProduct, addProduct } from './helpers.js';
import { spawn } from 'node:child_process';

test('health comprueba una conexión MySQL real', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toEqual({ status: 'ok', database: 'connected' });
});

test('GET lista los seis productos activos y consulta por ID', async ({ request }) => {
    const response = await request.get('/api/productos');
    expect(response.status()).toBe(200);
    const { payload } = await response.json();
    expect(payload).toHaveLength(6);
    expect(payload.every(product => product.activo === 1 && product.precio > 0)).toBeTruthy();
    const detail = await request.get(`/api/productos/${payload[0].id}`);
    expect((await detail.json()).payload[0]).toEqual(payload[0]);
});

test('CRUD completo: crea, edita, oculta, reactiva y elimina', async ({ request }) => {
    const id = await addProduct(request);
    try {
        const update = await request.put('/api/productos', { data: { ...sampleProduct, id, precio: 2500.25, activo: 0 } });
        expect(update.status()).toBe(200);
        const detail = (await (await request.get(`/api/productos/${id}`)).json()).payload[0];
        expect(detail).toMatchObject({ id, precio: 2500.25, activo: 0 });
        const catalog = (await (await request.get('/api/productos')).json()).payload;
        expect(catalog.some(product => product.id === id)).toBeFalsy();
        expect(await (await request.get('/dashboard')).text()).toContain(sampleProduct.nombre);
        const activate = await request.put('/api/productos', { data: { ...sampleProduct, id } });
        expect(activate.ok()).toBeTruthy();
        expect((await (await request.get('/api/productos')).json()).payload.some(product => product.id === id)).toBeTruthy();
    } finally {
        expect((await request.delete(`/api/productos/${id}`)).status()).toBe(200);
    }
    expect((await request.get(`/api/productos/${id}`)).status()).toBe(404);
});

for (const id of ['abc', '0', '-1', '1.5', '1e2', '9007199254740992', '1 OR 1=1']) {
    test(`rechaza ID inválido: ${id}`, async ({ request }) => {
        expect((await request.get(`/api/productos/${encodeURIComponent(id)}`)).status()).toBe(400);
        expect((await request.delete(`/api/productos/${encodeURIComponent(id)}`)).status()).toBe(400);
    });
}

test('devuelve 404 al consultar, modificar o eliminar un producto inexistente', async ({ request }) => {
    expect((await request.get('/api/productos/99999999')).status()).toBe(404);
    expect((await request.put('/api/productos', { data: { ...sampleProduct, id: 99999999 } })).status()).toBe(404);
    expect((await request.delete('/api/productos/99999999')).status()).toBe(404);
});

const invalidProducts = [
    ['nombre vacío', { nombre: '   ' }],
    ['marca ausente', { marca: null }],
    ['precio negativo', { precio: -10 }],
    ['precio cero', { precio: 0 }],
    ['precio no numérico', { precio: 'abc' }],
    ['demasiados decimales', { precio: '1.234' }],
    ['precio booleano', { precio: true }],
    ['precio fuera de rango', { precio: 100000000 }],
    ['categoría inexistente', { categoria: 'Otra' }],
    ['estado inválido', { activo: 'sí' }],
    ['imagen javascript', { imagen: 'javascript:alert(1)' }],
    ['imagen relativa a otro dominio', { imagen: '//example.com/a.jpg' }],
    ['nombre demasiado largo', { nombre: 'a'.repeat(121) }]
];
for (const [name, overrides] of invalidProducts) {
    test(`valida datos: ${name}`, async ({ request }) => {
        expect((await request.post('/api/productos', { data: { ...sampleProduct, ...overrides } })).status()).toBe(400);
        expect((await request.put('/api/productos', { data: { ...sampleProduct, id: 1, ...overrides } })).status()).toBe(400);
    });
}

test('valida cuerpo ausente, ID de actualización y JSON malformado', async ({ request }) => {
    expect((await request.post('/api/productos')).status()).toBe(400);
    expect((await request.put('/api/productos', { data: sampleProduct })).status()).toBe(400);
    const response = await request.post('/api/productos', { data: '{bad json', headers: { 'Content-Type': 'application/json' } });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('JSON válido');
});

test('limita el tamaño del cuerpo de la solicitud', async ({ request }) => {
    const response = await request.post('/api/productos', { data: { ...sampleProduct, nombre: 'x'.repeat(110000) } });
    expect(response.status()).toBe(413);
});

test('las consultas parametrizadas conservan texto SQL como datos', async ({ request }) => {
    const nombre = "Zapatillas'); DROP TABLE productos; --";
    const id = await addProduct(request, { nombre });
    try {
        expect((await (await request.get(`/api/productos/${id}`)).json()).payload[0].nombre).toBe(nombre);
        expect((await request.get('/api/productos')).status()).toBe(200);
    } finally { await request.delete(`/api/productos/${id}`); }
});

test('sirve todas las vistas y responde 404 en rutas desconocidas', async ({ request }) => {
    for (const path of ['/', '/tienda', '/dashboard', '/dashboard/consultar', '/dashboard/crear', '/dashboard/actualizar', '/dashboard/eliminar']) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(200);
        expect(await response.text()).toContain('lang="es"');
    }
    expect((await request.get('/no-existe')).status()).toBe(404);
    const response = await request.get('/api/no-existe');
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: 'Ruta no encontrada' });
});

test('una base inaccesible devuelve 503/500 sin bloquear el dashboard ni filtrar credenciales', async ({ request }) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', `
        import app from './src/app.js';
        const server = app.listen(0, '127.0.0.1', () => console.log('SPORTSWEAR_TEST_PORT=' + server.address().port));
    `], { env: { ...process.env, DB_HOST: '127.0.0.1', DB_PORT: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const exited = new Promise(resolve => child.once('exit', resolve));
    try {
        const port = await new Promise((resolve, reject) => {
            let output = '';
            child.once('error', reject);
            child.stdout.on('data', data => {
                output += data.toString();
                const match = output.match(/SPORTSWEAR_TEST_PORT=(\d+)/);
                if (match) resolve(Number(match[1]));
            });
            child.once('exit', () => reject(new Error('El servidor de prueba no pudo iniciarse.')));
        });
        const base = `http://127.0.0.1:${port}`;
        expect((await request.get(`${base}/health`)).status()).toBe(503);
        const api = await request.get(`${base}/api/productos`);
        expect(api.status()).toBe(500);
        expect(await api.json()).toEqual({ error: 'Error al obtener los productos' });
        const dashboard = await request.get(`${base}/dashboard`);
        expect(dashboard.status()).toBe(500);
        expect(await dashboard.text()).toContain('Revisá la conexión a MySQL');
        expect(await dashboard.text()).not.toContain('DB_PASSWORD');
    } finally {
        child.kill();
        await exited;
    }
});
