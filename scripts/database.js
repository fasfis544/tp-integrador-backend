import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import environments from '../src/api/config/environments.js';

export function databaseIdentifier(name) {
    if (!/^[a-zA-Z0-9_]{1,64}$/.test(name || '')) throw new Error('DB_NAME solo puede contener letras, números y guiones bajos (máximo 64).');
    return `\`${name}\``;
}

export async function createDatabase(name, { seed = true } = {}) {
    const database = databaseIdentifier(name);
    const { host, port, user, password } = environments.database;
    const connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.query(`USE ${database}`);
        await connection.query(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));
        const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM productos');
        if (seed && total === 0) {
            await connection.query(await readFile(new URL('../database/seed.sql', import.meta.url), 'utf8'));
            console.log('Se cargaron 6 productos de demostración.');
        } else {
            console.log('Se conservaron los productos existentes.');
        }
    } finally {
        await connection.end();
    }
}

export async function dropTestDatabase(name) {
    if (!/^sportswear_test_\d+$/.test(name)) throw new Error('Solo se pueden eliminar bases temporales de pruebas.');
    const { host, port, user, password } = environments.database;
    const connection = await mysql.createConnection({ host, port, user, password });
    try {
        await connection.query(`DROP DATABASE IF EXISTS ${databaseIdentifier(name)}`);
    } finally {
        await connection.end();
    }
}
