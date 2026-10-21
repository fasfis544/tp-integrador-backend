import { dropTestDatabase } from '../scripts/database.js';

export default async function teardown() {
    await dropTestDatabase(process.env.SPORTSWEAR_TEST_DB);
}
