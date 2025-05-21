import express from 'express';
import { pool } from '../db.js';
const router = express.Router();

// 获取设置
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    console.error('获取设置出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 保存设置
router.post('/settings', async (req, res) => {
  try {
    const settings = req.body;
    for (const key in settings) {
      await pool.query('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)', [key, String(settings[key])]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('保存设置出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 保存历史反馈
router.post('/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const { word, feedback } = req.body;
    if (!word || !feedback) return res.status(400).json({ error: 'word和feedback不能为空' });
    await pool.query('INSERT INTO feedback_history (book_id, word, feedback) VALUES (?, ?, ?)', [id, word, feedback]);
    res.json({ success: true });
  } catch (error) {
    console.error('保存反馈出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取历史反馈
router.get('/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const [rows] = await pool.query('SELECT word, feedback, created_at FROM feedback_history WHERE book_id = ? ORDER BY created_at DESC LIMIT ?', [id, limit]);
    res.json(rows);
  } catch (error) {
    console.error('获取反馈出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 重置词书下所有单词的复习次数
router.post('/:id/reset', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE words SET review_count = 0 WHERE book_id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('重置学习进度出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取所有词书
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, title, description, created_at FROM vocab_books ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('获取词书出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 新建词书
router.post('/', async (req, res) => {
  try {
    const { title, description, words } = req.body;
    if (!title) return res.status(400).json({ error: 'title不能为空' });
    const [result] = await pool.query(
      'INSERT INTO vocab_books (title, description) VALUES (?, ?)',
      [title, description || '']
    );
    const bookId = result.insertId;
    if (Array.isArray(words) && words.length > 0) {
      for (const w of words) {
        await pool.query(
          'INSERT INTO words (book_id, word, meaning, example, review_count) VALUES (?, ?, ?, ?, ?)',
          [bookId, w.word, w.meaning, w.example, w.review_count || 0]
        );
      }
    }
    res.json({ id: bookId, title, description });
  } catch (error) {
    console.error('新建词书出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 编辑词书
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, words } = req.body;
    if (!title) return res.status(400).json({ error: 'title不能为空' });
    await pool.query(
      'UPDATE vocab_books SET title = ?, description = ? WHERE id = ?',
      [title, description || '', id]
    );
    // 同步单词
    if (Array.isArray(words)) {
      await pool.query('DELETE FROM words WHERE book_id = ?', [id]);
      if (words.length > 0) {
        for (const w of words) {
          await pool.query(
            'INSERT INTO words (book_id, word, meaning, example, review_count) VALUES (?, ?, ?, ?, ?)',
            [id, w.word, w.meaning, w.example, w.review_count || 0]
          );
        }
      }
    }
    res.json({ id, title, description });
  } catch (error) {
    console.error('编辑词书出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除词书
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM vocab_books WHERE id = ?', [id]);
    res.json({ id });
  } catch (error) {
    console.error('删除词书出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取单个词书详情（含单词）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [books] = await pool.query('SELECT id, title, description, created_at FROM vocab_books WHERE id = ?', [id]);
    if (!books.length) return res.status(404).json({ error: '词书不存在' });
    const book = books[0];
    const [words] = await pool.query('SELECT id, word, meaning, example, review_count FROM words WHERE book_id = ?', [id]);
    book.words = words;
    res.json(book);
  } catch (error) {
    console.error('获取词书详情出错:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 