import 'dotenv/config';
import { app } from './app.js';
import { pool } from './config/db.js';

const port = Number(process.env.PORT) || 4000;

await pool.query('SELECT 1');
app.listen(port, () => console.log(`Backend đang chạy tại http://localhost:${port}`));
