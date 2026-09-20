const { Pool } = require('pg');
require('dotenv').config();

const isLocalConnection =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('localhost') ||
  process.env.DATABASE_URL.includes('127.0.0.1') ||
  process.env.DATABASE_URL.includes('@postgres:') ||
  process.env.DATABASE_URL.includes('@db:');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isLocalConnection ? false : { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER || 'govindsmac',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'spinwheel_db',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
