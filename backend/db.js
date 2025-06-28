// File: backend/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'srvdb-dev',
  port: 3306,
  user: 'aluno5',
  password: '3N7skj4iVAE=',
  database: 'fasiclin',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000, // opcional
});

module.exports = pool;
