export const sampleProduct = {
    nombre: 'Producto de prueba',
    marca: 'SportsWear Test',
    precio: 1234.56,
    categoria: 'Calzado',
    activo: 1,
    imagen: '/assets/products/running.jpg'
};

export async function addProduct(request, overrides = {}) {
    const response = await request.post('/api/productos', { data: { ...sampleProduct, ...overrides } });
    if (response.status() !== 201) throw new Error(`No se pudo crear fixture: ${await response.text()}`);
    return (await response.json()).productoId;
}
