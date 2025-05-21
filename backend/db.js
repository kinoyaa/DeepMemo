import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'ArioWorld1',
  database: 'deepmemo', // 请确保已在MySQL中创建
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库连接
pool.query('SELECT 1')
  .then(() => console.log('数据库连接成功'))
  .catch(err => console.error('数据库连接失败:', err)); 