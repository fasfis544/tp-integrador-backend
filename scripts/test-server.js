import { createDatabase } from './database.js';

if (!/^sportswear_test_\d+$/.test(process.env.DB_NAME || '')) {
    throw new Error('Las pruebas requieren una base temporal sportswear_test_<id>.');
}
await createDatabase(process.env.DB_NAME);
await import('../index.js');
