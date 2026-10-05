import pg from 'pg';

// NUMERIC tra ve dang chuoi de khong mat do chinh xac tien te; doi sang so khi can tinh toan.
export const pool = new pg.Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

// Ket noi ranh bi DB ngat (restart Postgres, DROP DATABASE...) phat su kien 'error' tren pool;
// khong bat thi Node se crash ca server. Pool tu tao ket noi moi o lan query sau.
pool.on('error', (err) => console.error('Kết nối DB bị ngắt:', err.message));

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
