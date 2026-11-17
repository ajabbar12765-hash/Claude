// Creates or updates the database tables. Usage: DATABASE_URL=... npm run migrate
import { store } from '../api/_lib/store.js';
if (!process.env.DATABASE_URL) { console.error('Set DATABASE_URL first'); process.exit(1); }
await store();
console.log('Database is up to date');
process.exit(0);
