import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
})

const testPool = async () => {
  try {
   const test = await pool.query('SELECT NOW()');
    console.log({ message: 'Database connection successful', time: test.rows[0].now });
  } catch (error) {
    console.error('Database connection error:', error);
  }finally{
   await pool.end();
  }
}

testPool();
