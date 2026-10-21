import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('genera capturas completas del portafolio con datos MySQL de demostración', async ({ page }) => {
    await mkdir('docs/capturas', { recursive: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function capture(name) {
        await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
            document.querySelector('#tienda-notificacion')?.setAttribute('hidden', '');
            window.scrollTo(0, 0);
        });
        await page.screenshot({ path: `docs/capturas/${name}.png`, fullPage: true, animations: 'disabled' });
    }

    await page.goto('/');
    await capture('01-inicio');
    await page.getByLabel('Tu nombre').fill('Alex');
    await page.getByRole('button', { name: 'Entrar a la tienda' }).click();
    await expect(page.locator('.producto-card')).toHaveCount(6);
    await capture('02-tienda');
    await page.getByRole('button', { name: 'Agregar Zapatillas Running Air al carrito' }).click();
    await page.getByRole('button', { name: 'Agregar Remera Essential al carrito' }).click();
    await page.getByRole('button', { name: 'Aumentar cantidad de Zapatillas Running Air' }).click();
    await capture('03-carrito');
    await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
    await capture('04-modo-oscuro');
    await page.getByRole('button', { name: 'Activar modo claro' }).click();

    await page.goto('/dashboard');
    await capture('05-dashboard');
    await page.goto('/dashboard/consultar?id=1');
    await expect(page.locator('#producto-detalle h2')).toBeVisible();
    await capture('06-consultar');
    await page.goto('/dashboard/crear');
    await page.getByLabel('Nombre', { exact: true }).fill('Remera Performance');
    await page.getByLabel('Marca', { exact: true }).fill('SportsWear');
    await page.getByLabel('Precio (ARS)').fill('29990');
    await page.getByLabel('Categoría', { exact: true }).selectOption('Indumentaria');
    await page.getByLabel('Imagen', { exact: true }).fill('/assets/products/remera.jpg');
    await capture('07-crear');
    await page.goto('/dashboard/actualizar?id=1');
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Zapatillas Running Air');
    await capture('08-modificar');
    await page.goto('/dashboard/eliminar?id=1');
    await expect(page.locator('#producto-detalle h2')).toBeVisible();
    await capture('09-eliminar');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tienda');
    await expect(page.locator('.producto-card')).toHaveCount(6);
    await expect(page.locator('.producto-carrito')).toHaveCount(2);
    await capture('10-tienda-movil');
    await page.goto('/dashboard');
    await capture('11-dashboard-movil');
    expect(errors).toEqual([]);
});
