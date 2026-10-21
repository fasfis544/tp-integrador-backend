import { money, escapeHtml, requestJson } from './ui.js';

const mode = document.getElementById('contenido').dataset.action;
const lookupForm = document.getElementById('getProduct-form');
const productForm = document.getElementById('producto-form');
const detail = document.getElementById('producto-detalle');
const editPanel = document.getElementById('editar-panel');
const status = document.getElementById('form-estado');
const saveStatus = document.getElementById('guardar-estado') || status;
let currentProduct;

function showStatus(element, message, success = false) {
    element.textContent = message;
    element.className = `status-message ${success ? 'success' : 'error'}`;
    element.hidden = false;
}

function renderProduct(product) {
    detail.innerHTML = `<article class="dashboard-card detail-card"><img src="${escapeHtml(product.imagen)}" alt="${escapeHtml(product.nombre)}" width="180" height="180"><div><span class="eyebrow">PRODUCTO #${product.id}</span><h2>${escapeHtml(product.nombre)}</h2><p>${escapeHtml(product.marca)} · ${escapeHtml(product.categoria)}</p><strong class="detail-price">${money(product.precio)}</strong><span class="state-badge ${product.activo ? 'active' : ''}">${product.activo ? 'Activo' : 'Inactivo'}</span>${mode === 'eliminar' ? '<button class="button button-danger" type="button" id="eliminar-producto">Eliminar definitivamente</button>' : ''}</div></article>`;
    document.getElementById('eliminar-producto')?.addEventListener('click', deleteProduct);
}

lookupForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = lookupForm.querySelector('button');
    button.disabled = true;
    detail.replaceChildren();
    currentProduct = null;
    if (editPanel) editPanel.hidden = true;
    status.hidden = saveStatus.hidden = true;
    try {
        const data = await requestJson(`/api/productos/${encodeURIComponent(lookupForm.elements.idProd.value)}`);
        currentProduct = data.payload[0];
        renderProduct(currentProduct);
        if (editPanel) {
            for (const [name, value] of Object.entries(currentProduct)) {
                const field = productForm.elements.namedItem(name);
                if (field) field.value = value;
            }
            editPanel.hidden = false;
        }
    } catch (error) {
        showStatus(status, error.message);
    } finally {
        button.disabled = false;
    }
});

productForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = productForm.querySelector('button[type="submit"]');
    button.disabled = true;
    saveStatus.hidden = true;
    const data = Object.fromEntries(new FormData(productForm));
    try {
        const result = await requestJson('/api/productos', {
            method: mode === 'crear' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        showStatus(saveStatus, mode === 'crear' ? `${result.message}. ID asignado: ${result.productoId}.` : result.message, true);
        if (mode === 'crear') productForm.reset();
        else {
            currentProduct = { ...data, id: Number(data.id), activo: Number(data.activo) };
            renderProduct(currentProduct);
        }
    } catch (error) {
        showStatus(saveStatus, error.message);
    } finally {
        button.disabled = false;
    }
});

async function deleteProduct() {
    if (!currentProduct || !confirm(`¿Eliminar "${currentProduct.nombre}"? Esta acción no se puede deshacer.`)) return;
    const button = document.getElementById('eliminar-producto');
    button.disabled = true;
    try {
        const result = await requestJson(`/api/productos/${currentProduct.id}`, { method: 'DELETE' });
        detail.replaceChildren();
        currentProduct = null;
        showStatus(status, result.message, true);
    } catch (error) {
        showStatus(status, error.message);
        button.disabled = false;
    }
}

if (lookupForm) {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id && /^\d+$/.test(id)) {
        lookupForm.elements.idProd.value = id;
        lookupForm.requestSubmit();
    }
}
