import environments from '../src/api/config/environments.js';
import { createDatabase } from './database.js';

try {
    await createDatabase(environments.database.name);
    console.log('Base de datos lista. Ejecutá npm start.');
} catch (error) {
    console.error(`No se pudo preparar MySQL: ${error.code || error.message}. Revisá las variables DB_* de .env.`);
    process.exitCode = 1;
}
