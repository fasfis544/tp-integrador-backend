import dotenv from 'dotenv';
//centraliza la configuracion de entorn (puerto y base de datos)
dotenv.config({ quiet: true });

export default {
    port: process.env.PORT || 3000,
    database: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    }
}
