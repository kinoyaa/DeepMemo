import express from 'express';
import cors from 'cors';
import vocabBooksRouter from './routes/vocabBooks.js';
import wordsRouter from './routes/words.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/vocabBooks', vocabBooksRouter);
app.use('/api/words', wordsRouter);

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
}); 