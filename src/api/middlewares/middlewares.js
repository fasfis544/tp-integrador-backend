const isValidId = (id) => /^\d+$/.test(String(id)) && Number.isSafeInteger(Number(id)) && Number(id) > 0;

const validateId = (req, res, next) => {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    next();
};

const validateProduct = (req, res, next) => {
    const { nombre, marca, precio, imagen, categoria, activo, id } = req.body || {};
    if (req.method === 'PUT' && !isValidId(id)) {
        return res.status(400).json({ message: 'ID inválido' });
    }
    if (![nombre, marca, imagen, categoria].every(value => typeof value === 'string' && value.trim())) {
        return res.status(400).json({ message: 'Completá nombre, marca, imagen y categoría' });
    }
    if (nombre.trim().length > 120 || marca.trim().length > 80 || imagen.length > 2048) {
        return res.status(400).json({ message: 'Uno de los campos supera la longitud permitida' });
    }
    if (!['Calzado', 'Indumentaria', 'Accesorios'].includes(categoria)) {
        return res.status(400).json({ message: 'Categoría inválida' });
    }
    if (!['number', 'string'].includes(typeof precio) || !/^\d+(\.\d{1,2})?$/.test(String(precio)) || Number(precio) <= 0 || Number(precio) > 99999999.99) {
        return res.status(400).json({ message: 'El precio debe ser positivo y tener hasta dos decimales' });
    }
    if (![0, 1, '0', '1', true, false].includes(activo)) {
        return res.status(400).json({ message: 'El estado activo debe ser 0 o 1' });
    }
    const localImage = /^\/(?!\/)[a-zA-Z0-9/_\-.]+$/.test(imagen);
    let remoteImage = false;
    try { remoteImage = ['http:', 'https:'].includes(new URL(imagen).protocol); } catch { /* Puede ser una ruta local. */ }
    if (!localImage && !remoteImage) return res.status(400).json({ message: 'Usá una URL HTTP(S) o una ruta local para la imagen' });
    req.body = { ...req.body, nombre: nombre.trim(), marca: marca.trim(), precio: Number(precio), activo: Number(activo) };
    next();
};

export { validateId, validateProduct };
