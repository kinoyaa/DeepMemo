import axios from 'axios';

export const vocabBooksApi = {
  // 获取所有词书
  getAll: async () => {
    return await axios.get('/api/vocabBooks');
  },

  // 获取单个词书详情（含单词）
  getById: async (id) => {
    return await axios.get(`/api/vocabBooks/${id}`);
  },

  // 创建词书
  create: async (data) => {
    return await axios.post('/api/vocabBooks', data);
  },

  // 更新词书
  update: async (id, data) => {
    return await axios.put(`/api/vocabBooks/${id}`, data);
  },

  // 删除词书
  delete: async (id) => {
    return await axios.delete(`/api/vocabBooks/${id}`);
  },

  // 批量导入单词
  importWords: async (id, words) => {
    return await axios.post(`/api/words`, words.map(w => ({ ...w, book_id: id })));
  },

  // 重置学习进度
  resetProgress: async (id) => {
    return await axios.post(`/api/vocabBooks/${id}/reset`);
  },

  // 获取历史反馈
  getFeedback: async (bookId, limit = 10) => {
    return await axios.get(`/api/vocabBooks/${bookId}/feedback?limit=${limit}`);
  },

  // 保存历史反馈
  postFeedback: async (bookId, word, feedback) => {
    return await axios.post(`/api/vocabBooks/${bookId}/feedback`, { word, feedback });
  }
}; 