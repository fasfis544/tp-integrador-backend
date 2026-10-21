import app from './src/app.js';
import environments from './src/api/config/environments.js';
import connection from './src/api/database/db.js';

const server = app.listen(environments.port, () => {
    console.log(`SportsWear: http://localhost:${environments.port}`);
});

async function shutdown() {
    server.close(async () => {
        await connection.end();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
