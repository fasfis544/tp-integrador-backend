import { test, expect } from '@playwright/test';
import { addProduct } from './helpers.js';

test.beforeEach(async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.__errors = errors;
});
test.afterEach(async ({ page }) => { expect(page.__errors).toEqual([]); });

async function openStore(page) {
    await page.goto('/tienda');
    await expect(page.locator('.producto-card')).toHaveCount(6);
}

test('inicio valida el nombre y permite entrar a la tienda', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Entrar a la tienda' }).click();
    await expect(page).toHaveURL('/');
    await page.getByLabel('Tu nombre').fill('  Alex  ');
    await page.getByRole('button', { name: 'Entrar a la tienda' }).click();
    await expect(page).toHaveURL('/tienda');
    await expect(page.locator('#nombre-usuario')).toHaveText('Alex');
    await expect(page.locator('.producto-card')).toHaveCount(6);
});

test('combina filtros por categoría y búsqueda, incluyendo estado sin resultados', async ({ page }) => {
    await openStore(page);
    await page.getByRole('button', { name: 'Calzado', exact: true }).click();
    await expect(page.locator('.producto-card')).toHaveCount(2);
    await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('nike');
    await expect(page.locator('.producto-card')).toHaveCount(1);
    await page.getByRole('searchbox').fill('producto inexistente');
    await expect(page.locator('.producto-card')).toHaveCount(0);
    await expect(page.locator('#catalogo-estado')).toContainText('No encontramos');
    await page.getByRole('searchbox').fill('');
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await expect(page.locator('.producto-card')).toHaveCount(6);
});

test('carrito suma, resta, elimina y restaura cantidades y total al recargar', async ({ page }) => {
    await openStore(page);
    await page.getByRole('button', { name: 'Agregar Zapatillas Running Air al carrito', exact: true }).click();
    await page.getByRole('button', { name: 'Agregar Zapatillas Running Air al carrito', exact: true }).click();
    await expect(page.locator('#acumulador-prods')).toHaveText('2');
    await expect(page.locator('.precio-total')).toContainText('179.980,00');
    await page.reload();
    await expect(page.locator('.producto-carrito')).toHaveCount(1);
    await expect(page.locator('.cantidad')).toHaveText('2');
    await page.getByRole('button', { name: 'Reducir cantidad de Zapatillas Running Air' }).click();
    await expect(page.locator('.precio-total')).toContainText('89.990,00');
    await page.getByRole('button', { name: 'Aumentar cantidad de Zapatillas Running Air' }).click();
    await expect(page.locator('.cantidad')).toHaveText('2');
    await page.getByRole('button', { name: 'Eliminar Zapatillas Running Air del carrito' }).click();
    await expect(page.locator('#acumulador-prods')).toHaveText('0');
    await expect(page.getByRole('button', { name: 'Simular compra' })).toBeDisabled();
});

test('carrito resta hasta cero, se vacía y simula una compra sin cobros', async ({ page }) => {
    await openStore(page);
    const add = page.getByRole('button', { name: 'Agregar Remera Essential al carrito' });
    await add.click();
    await page.getByRole('button', { name: 'Reducir cantidad de Remera Essential' }).click();
    await expect(page.locator('.producto-carrito')).toHaveCount(0);
    await add.click();
    await page.getByRole('button', { name: 'Vaciar carrito' }).click();
    await expect(page.locator('#resumen-cantidad')).toHaveText('0');
    await add.click();
    await page.getByRole('button', { name: 'Simular compra' }).click();
    await expect(page.locator('#compra-estado')).toContainText('Simulación completada');
    await expect(page.locator('#compra-estado')).toContainText('24.990,00');
    await expect(page.locator('#compra-estado')).toContainText('No se realizó ningún cobro');
    await expect(page.locator('.producto-carrito')).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('carrito')))).toEqual([]);
});

test('tolera localStorage corrupto y descarta productos inexistentes o cantidades inválidas', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('carrito', '{json roto'));
    await openStore(page);
    await expect(page.locator('#acumulador-prods')).toHaveText('0');
    await page.evaluate(() => localStorage.setItem('carrito', JSON.stringify([null, { id: 999999, cantidad: 4 }, { id: 1, cantidad: -1 }, { id: 2, cantidad: 3 }, { id: 2, cantidad: 2 }])));
    await page.reload();
    await expect(page.locator('#acumulador-prods')).toHaveText('3');
    await expect(page.locator('.producto-carrito')).toHaveCount(1);
});

test('carrito actualiza precios desde la API y limita cantidades restauradas a 99', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('carrito', JSON.stringify([{ id: 1, cantidad: 1000, precio: 1, nombre: 'Precio manipulado' }])));
    await openStore(page);
    await expect(page.locator('.cantidad')).toHaveText('99');
    await expect(page.locator('.producto-carrito h3')).toHaveText('Zapatillas Running Air');
    await expect(page.getByRole('button', { name: 'Aumentar cantidad de Zapatillas Running Air' })).toBeDisabled();
    await expect(page.locator('.precio-total')).toContainText('8.909.010,00');
});

test('modo oscuro persiste entre páginas y recargas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
    await expect(page.locator('body')).toHaveClass('dark-mode');
    await openStore(page);
    await expect(page.locator('body')).toHaveClass('dark-mode');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Activar modo claro' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Activar modo claro' }).click();
    await expect(page.locator('body')).not.toHaveClass('dark-mode');
});

test('el catálogo muestra error recuperable y permite reintentar', async ({ page }) => {
    await page.route('**/api/productos', route => route.fulfill({ status: 503, json: { error: 'No disponible' } }));
    await page.goto('/tienda');
    await expect(page.locator('#catalogo-estado')).toContainText('No pudimos cargar');
    await page.unroute('**/api/productos');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('.producto-card')).toHaveCount(6);
});

test('catálogo vacío y una imagen faltante tienen estados visibles', async ({ page }) => {
    await page.route('**/api/productos', route => route.fulfill({ json: { payload: [] } }));
    await page.goto('/tienda');
    await expect(page.locator('#catalogo-estado')).toHaveText('Todavía no hay productos disponibles.');
    await page.unroute('**/api/productos');
    await page.route('**/assets/products/running.jpg', route => route.fulfill({ status: 404 }));
    await openStore(page);
    await expect(page.locator('.producto-card img').first()).toHaveAttribute('src', '/assets/products/fallback.svg');
});

test('todas las imágenes de la demo cargan correctamente', async ({ page }) => {
    await openStore(page);
    await expect.poll(async () => page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBeTruthy();
});

test('formularios permiten crear, consultar, modificar y eliminar un producto real', async ({ page, request }) => {
    let id;
    try {
        await page.goto('/dashboard/crear');
        await page.getByLabel('Nombre', { exact: true }).fill('Remera prueba navegador');
        await page.getByLabel('Marca', { exact: true }).fill('SportsWear');
        await page.getByLabel('Precio (ARS)').fill('1234.56');
        await page.getByLabel('Categoría', { exact: true }).selectOption('Indumentaria');
        await page.getByLabel('Imagen', { exact: true }).fill('/assets/products/remera.jpg');
        const created = page.waitForResponse(response => response.url().endsWith('/api/productos') && response.request().method() === 'POST');
        await page.getByRole('button', { name: 'Crear producto' }).click();
        id = (await (await created).json()).productoId;
        await expect(page.locator('#form-estado')).toContainText(`ID asignado: ${id}`);
        await page.goto(`/dashboard/consultar?id=${id}`);
        await expect(page.locator('#producto-detalle h2')).toHaveText('Remera prueba navegador');
        await page.goto(`/dashboard/actualizar?id=${id}`);
        await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Remera prueba navegador');
        await page.getByLabel('Precio (ARS)').fill('2222.50');
        await page.getByLabel('Estado', { exact: true }).selectOption('0');
        await page.getByRole('button', { name: 'Guardar cambios' }).click();
        await expect(page.locator('#guardar-estado')).toContainText('actualizado correctamente');
        const detail = (await (await request.get(`/api/productos/${id}`)).json()).payload[0];
        expect(detail).toMatchObject({ precio: 2222.5, activo: 0 });
        await page.goto('/dashboard');
        await expect(page.getByRole('row').filter({ hasText: 'Remera prueba navegador' })).toContainText('Inactivo');
        await page.goto(`/dashboard/eliminar?id=${id}`);
        await expect(page.locator('#producto-detalle h2')).toHaveText('Remera prueba navegador');
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Eliminar definitivamente' }).click();
        await expect(page.locator('#form-estado')).toHaveText('Producto eliminado correctamente');
        expect((await request.get(`/api/productos/${id}`)).status()).toBe(404);
    } finally { if (id) await request.delete(`/api/productos/${id}`); }
});

test('cancelar eliminación conserva el producto y consultar un ID ausente limpia datos anteriores', async ({ page }) => {
    await page.goto('/dashboard/eliminar?id=1');
    await expect(page.locator('#producto-detalle h2')).toBeVisible();
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Eliminar definitivamente' }).click();
    await expect(page.locator('#producto-detalle h2')).toBeVisible();
    await page.getByLabel('ID del producto').fill('99999999');
    await page.getByRole('button', { name: 'Buscar producto' }).click();
    await expect(page.locator('#form-estado')).toHaveText('Producto no encontrado');
    await expect(page.locator('#producto-detalle')).toBeEmpty();
});

test('los errores del servidor se muestran en el formulario sin borrar lo ingresado', async ({ page }) => {
    await page.goto('/dashboard/crear');
    await page.getByLabel('Nombre', { exact: true }).fill('Producto válido');
    await page.getByLabel('Marca', { exact: true }).fill('SportsWear');
    await page.getByLabel('Precio (ARS)').fill('100');
    await page.getByLabel('Imagen', { exact: true }).fill('javascript:alert(1)');
    await page.getByRole('button', { name: 'Crear producto' }).click();
    await expect(page.locator('#form-estado')).toContainText('URL HTTP(S)');
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Producto válido');
});

test('nombres con HTML se muestran como texto, sin ejecutar código', async ({ page, request }) => {
    const name = '<img src=x onerror="window.xssExecuted=true">';
    const id = await addProduct(request, { nombre: name });
    try {
        await page.goto('/tienda');
        await expect(page.locator('.producto-card h3').filter({ hasText: name })).toHaveCount(1);
        expect(await page.evaluate(() => window.xssExecuted)).toBeUndefined();
        await page.goto(`/dashboard/consultar?id=${id}`);
        await expect(page.locator('#producto-detalle h2')).toHaveText(name);
        expect(await page.evaluate(() => window.xssExecuted)).toBeUndefined();
        await page.goto('/dashboard');
        await expect(page.locator('.table-product strong').filter({ hasText: name })).toHaveCount(1);
        expect(await page.evaluate(() => window.xssExecuted)).toBeUndefined();
    } finally { await request.delete(`/api/productos/${id}`); }
});

test('la app permite navegar y comprar en móvil sin desbordes horizontales', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/tienda', '/dashboard', '/dashboard/crear', '/dashboard/actualizar?id=1', '/dashboard/eliminar?id=1']) {
        await page.goto(path);
        if (path.includes('?id=')) await expect(page.locator('#producto-detalle h2')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBeTruthy();
    }
    await openStore(page);
    await page.getByRole('button', { name: 'Agregar Remera Essential al carrito' }).click();
    await expect(page.locator('#acumulador-prods')).toHaveText('1');
    await page.getByRole('button', { name: 'Simular compra' }).click();
    await expect(page.locator('#compra-estado')).toBeVisible();
});

test('la tienda funciona si el navegador bloquea localStorage', async ({ page }) => {
    await page.addInitScript(() => {
        Storage.prototype.getItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
        Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
    });
    await page.goto('/');
    await page.getByLabel('Tu nombre').fill('Alex');
    await page.getByRole('button', { name: 'Entrar a la tienda' }).click();
    await expect(page.locator('.producto-card')).toHaveCount(6);
    await page.getByRole('button', { name: 'Agregar Remera Essential al carrito' }).click();
    await expect(page.locator('#acumulador-prods')).toHaveText('1');
    await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
    await expect(page.locator('body')).toHaveClass('dark-mode');
});

test('al recargar se retiran del carrito los productos desactivados', async ({ page, request }) => {
    const id = await addProduct(request, { nombre: 'Producto temporal del carrito' });
    try {
        await page.goto('/tienda');
        await page.getByRole('button', { name: 'Agregar Producto temporal del carrito al carrito' }).click();
        await expect(page.locator('#acumulador-prods')).toHaveText('1');
        const product = (await (await request.get(`/api/productos/${id}`)).json()).payload[0];
        expect((await request.put('/api/productos', { data: { ...product, activo: 0 } })).ok()).toBeTruthy();
        await page.reload();
        await expect(page.locator('.producto-card')).toHaveCount(6);
        await expect(page.locator('#acumulador-prods')).toHaveText('0');
        await expect(page.locator('.producto-carrito')).toHaveCount(0);
    } finally { await request.delete(`/api/productos/${id}`); }
});
