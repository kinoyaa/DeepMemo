# DeepMemo 后端（Node.js + MySQL）

## 启动方法

1. 安装依赖

```bash
npm install
```

2. 启动服务

```bash
npm start
```

3. 服务默认运行在 http://localhost:3001

## 数据库建表语句

请先在 MySQL 执行：

```sql
CREATE DATABASE IF NOT EXISTS deepmemo DEFAULT CHARSET utf8mb4;
USE deepmemo;

CREATE TABLE IF NOT EXISTS vocab_books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS words (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  word VARCHAR(255) NOT NULL,
  meaning TEXT NOT NULL,
  example TEXT,
  status INT DEFAULT 0,
  FOREIGN KEY (book_id) REFERENCES vocab_books(id)
);
``` 