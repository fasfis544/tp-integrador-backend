import { money, escapeHtml, readStorage, writeStorage, requestJson } from './ui.js';

const productsContainer = document.querySelector('.productos-container');
const cartContainer = document.querySelector('.productos-carrito');
const catalogStatus = document.getElementById('catalogo-estado');
const purchaseStatus = document.getElementById('compra-estado');
const search = document.querySelector('.barra-busqueda');
const emptyButton = document.querySelector('.btn-vaciar');
const buyButton = document.querySelector('.btn-comprar');
let productos = [];
let carrito = [];
let categoria = 'Todos';
let notificationTimeout;

try { document.getElementById('nombre-usuario').textContent = localStorage.getItem('usuario') || 'deportista'; } catch { /* Nombre opcional. */ }
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function renderProducts() {
    const query = normalize(search.value.trim());
    const filtered = productos.filter(product => (categoria === 'Todos' || product.categoria === categoria) && normalize(`${product.nombre} ${product.marca}`).includes(query));
    productsContainer.innerHTML = filtered.map(product => `
        <article class="producto-card">
            <div class="product-photo"><img src="${escapeHtml(product.imagen)}" alt="${escapeHtml(product.nombre)}" width="600" height="420"><span>${escapeHtml(product.categoria)}</span></div>
            <div class="product-info"><p class="product-brand">${escapeHtml(product.marca)}</p><h3>${escapeHtml(product.nombre)}</h3><div class="product-bottom"><strong>${money(product.precio)}</strong><button class="btn-agregar-carrito" type="button" data-id="${product.id}" aria-label="Agregar ${escapeHtml(product.nombre)} al carrito">Agregar <span aria-hidden="true">+</span></button></div></div>
        </article>`).join('');
    document.querySelector('.result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'producto' : 'productos'}`;
    catalogStatus.hidden = filtered.length > 0;
    catalogStatus.textContent = productos.length === 0 ? 'Todavía no hay productos disponibles.' : 'No encontramos productos con esos filtros.';
}

function renderCart() {
    const count = carrito.reduce((total, item) => total + item.cantidad, 0);
    const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    document.getElementById('acumulador-prods').textContent = count;
    document.getElementById('resumen-cantidad').textContent = count;
    document.querySelector('.precio-total').textContent = money(total);
    emptyButton.disabled = buyButton.disabled = count === 0;
    cartContainer.innerHTML = carrito.length ? carrito.map(item => `
        <article class="producto-carrito"><img src="${escapeHtml(item.imagen)}" alt="${escapeHtml(item.nombre)}" width="96" height="96"><div class="cart-item-info"><p class="product-brand">${escapeHtml(item.marca)}</p><h3>${escapeHtml(item.nombre)}</h3><p>${money(item.precio)}</p><div class="quantity-control"><button type="button" data-action="menos" data-id="${item.id}" aria-label="Reducir cantidad de ${escapeHtml(item.nombre)}">−</button><span class="cantidad" aria-label="Cantidad">${item.cantidad}</span><button type="button" data-action="mas" data-id="${item.id}" aria-label="Aumentar cantidad de ${escapeHtml(item.nombre)}" ${item.cantidad >= 99 ? 'disabled' : ''}>+</button></div></div><div class="cart-item-end"><strong>${money(item.precio * item.cantidad)}</strong><button class="remove-button" type="button" data-action="eliminar" data-id="${item.id}" aria-label="Eliminar ${escapeHtml(item.nombre)} del carrito">Eliminar</button></div></article>`).join('') : '<div class="empty-cart"><span aria-hidden="true">↗</span><h3>Tu próxima aventura está por empezar</h3><p>Agregá productos de la colección para armar tu equipo.</p><a href="#catalogo">Explorar productos →</a></div>';
}

function saveCart() {
    writeStorage('carrito', carrito.map(({ id, cantidad }) => ({ id, cantidad })));
    purchaseStatus.hidden = true;
    renderCart();
}

function notify(message) {
    const notification = document.getElementById('tienda-notificacion');
    notification.textContent = message;
    notification.hidden = false;
    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => { notification.hidden = true; }, 2200);
}

async function loadProducts() {
    catalogStatus.hidden = false;
    catalogStatus.textContent = 'Cargando productos…';
    try {
        const data = await requestJson('/api/productos');
        productos = data.payload;
        const stored = readStorage('carrito', []);
        const restoredIds = new Set();
        carrito = (Array.isArray(stored) ? stored : []).flatMap(item => {
            if (!item || !Number.isSafeInteger(item.id) || restoredIds.has(item.id)) return [];
            const product = productos.find(product => product.id === item.id);
            if (!product || !Number.isInteger(item.cantidad) || item.cantidad < 1) return [];
            restoredIds.add(item.id);
            return [{ ...product, cantidad: Math.min(item.cantidad, 99) }];
        });
        saveCart();
        renderProducts();
    } catch {
        catalogStatus.textContent = 'No pudimos cargar el catálogo. Revisá la conexión e intentá nuevamente. ';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'button button-quiet';
        retry.textContent = 'Reintentar';
        retry.addEventListener('click', loadProducts);
        catalogStatus.append(retry);
    }
}

productsContainer.addEventListener('click', event => {
    const button = event.target.closest('[data-id]');
    if (!button) return;
    const product = productos.find(product => product.id === Number(button.dataset.id));
    if (!product) return;
    const item = carrito.find(item => item.id === product.id);
    if (item?.cantidad >= 99) return notify('El máximo es de 99 unidades por producto.');
    if (item) item.cantidad++;
    else carrito.push({ ...product, cantidad: 1 });
    saveCart();
    notify(`${product.nombre} se agregó al carrito.`);
});

cartContainer.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const item = carrito.find(item => item.id === Number(button.dataset.id));
    if (!item) return;
    if (button.dataset.action === 'mas' && item.cantidad < 99) item.cantidad++;
    if (button.dataset.action === 'menos') item.cantidad--;
    if (button.dataset.action === 'eliminar' || item.cantidad === 0) carrito = carrito.filter(product => product.id !== item.id);
    saveCart();
});

emptyButton.addEventListener('click', () => { carrito = []; saveCart(); });
search.addEventListener('input', renderProducts);
document.querySelectorAll('.btn-categoria').forEach(button => {
    button.addEventListener('click', () => {
        categoria = button.dataset.categoria;
        document.querySelectorAll('.btn-categoria').forEach(item => {
            item.classList.toggle('selected', item === button);
            item.setAttribute('aria-pressed', String(item === button));
        });
        renderProducts();
    });
});

buyButton.addEventListener('click', () => {
    if (!carrito.length) return;
    const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    carrito = [];
    saveCart();
    purchaseStatus.textContent = `¡Simulación completada! Total: ${money(total)}. No se realizó ningún cobro ni se generó un pedido.`;
    purchaseStatus.className = 'status-message success';
    purchaseStatus.hidden = false;
});

renderCart();
loadProducts();
