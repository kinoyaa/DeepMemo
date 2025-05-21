import express from 'express';
import { pool } from '../db.js';
const router = express.Router();

// 获取某词书下所有单词
router.get('/:bookId', async (req, res) => {
  const { bookId } = req.params;
  const [rows] = await pool.query('SELECT * FROM words WHERE book_id = ?', [bookId]);
  res.json(rows);
});

// 新增单词
router.post('/', async (req, res) => {
  const { book_id, word, meaning, example } = req.body;
  const [result] = await pool.query(
    'INSERT INTO words (book_id, word, meaning, example) VALUES (?, ?, ?, ?)',
    [book_id, word, meaning, example]
  );
  res.json({ id: result.insertId });
});

export default router; 