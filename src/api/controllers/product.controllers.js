import { selectAllProducts, selectProductById, postProduct, modifyProduct, deleteProductById} from '../models/product.models.js'; // Importamos la funcion para obtener todos los productos

export const getAllProducts = async (req, res) => {

    try {
        const [ rows ] = await selectAllProducts(); // Llamamos a la funcion para obtener todos los productos

        res.status(200).json({
            payload: rows,
            message: rows.length === 0 ? "No hay productos disponibles" : "Productos obtenidos correctamente"
        });

    } catch (error) {
        console.log("Error al obtener los productos:", error);
        res.status(500).json({
            error: "Error al obtener los productos"
        });
    }
};

export const getProductById = async (req, res) => {

    try {  
        const [ rows ] = await selectProductById(req.params.id); // Llamamos a la funcion para obtener el producto por ID, le pasamos como argumento el ID 

        // verificacion de si se encontro el producto
        if (rows.length === 0) {
            return res.status(404).json({
                error: "Producto no encontrado"
            });
        }
        res.status(200).json({
            payload: rows // devolvemos el producto encontrado
        });

    } catch (error) {
        console.log("Error al obtener el producto:", error);
        res.status(500).json({
            error: "Error al obtener el producto"
        });
    }
};

export const createProduct = async (req, res) => {
    try {

        let { nombre, marca, precio, imagen, categoria, activo } = req.body; // obtenemos los datos del producto desde el cuerpo de la solicitud
        if (!nombre || !marca || !precio || !imagen || !categoria || activo === undefined) {
            return res.status(400).json({
                message: "Faltan datos obligatorios"
            });
        };

        const [ rows ] = await postProduct(nombre, marca, precio, categoria, activo, imagen); // Llamamos a la funcion para crear el producto

        res.status(201).json({
            message: "Producto creado correctamente",
            productoId: rows.insertId, // devolvemos el ID del producto creado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Error al crear el producto",
            error: 'No se pudo guardar el producto'
        });
    }
};

export const updateProduct = async (req, res) => {
    try {
        let { id, nombre, marca, precio, imagen, categoria, activo } = req.body; // obtenemos los datos del producto desde el cuerpo de la solicitud

        if(!id || !nombre || !marca || !precio || !imagen || !categoria || activo === undefined) {
            return res.status(400).json({
                message: "Faltan datos obligatorios"
            });
        }

        const [ rows ] = await modifyProduct(nombre, marca, precio, categoria, activo, imagen, id); // Llamamos a la funcion para modificar el producto


        if(rows.affectedRows === 0) {
            return res.status(404).json({
                message: "Producto no encontrado"
            });
        }

        res.status(200).json({
            message: "Producto actualizado correctamente"
        });

    } catch (error) {
        console.log("Error al actualizar el producto:", error);
        res.status(500).json({
            message: "Error al actualizar el producto"
        });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        let { id } = req.params;

        if(!id) {
            return res.status(400).json({
                message: "Falta el ID del producto a eliminar"
            });
        }

        const [ result ] = await deleteProductById(id); // Llamamos a la funcion para eliminar el producto por ID

        if(result.affectedRows === 0) {
            return res.status(404).json({
                message: "Producto no encontrado"
            });
        };

        res.status(200).json({
            message: "Producto eliminado correctamente"
        });

    } catch (error) {
        console.log("Error al eliminar el producto:", error);
        res.status(500).json({
            message: "Error al eliminar el producto"
        });
    }
};
