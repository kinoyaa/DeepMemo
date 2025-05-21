<template>
  <div class="space-y-6">
    <!-- 顶部操作栏 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">词书管理</h2>
        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          创建词书
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {{ error }}
    </div>

    <!-- 词书列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="book in vocabBooks"
        :key="book.id"
        class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow duration-300"
      >
        <div class="p-6">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ book.title }}</h3>
          <p class="mt-2 text-gray-600 dark:text-gray-300">{{ book.description }}</p>
          
          <!-- 学习进度 -->
          <div class="mt-4">
            <div class="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>学习进度</span>
              <span>{{ calculateProgress(book) }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="bg-blue-600 h-2 rounded-full"
                :style="{ width: calculateProgress(book) + '%' }"
              ></div>
            </div>
          </div>

          <!-- 单词统计 -->
          <div class="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">总单词</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">{{ book.Words?.length || 0 }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">已掌握</p>
              <p class="text-lg font-semibold text-green-600 dark:text-green-400">{{ book.progress?.known || 0 }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">学习中</p>
              <p class="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{{ book.progress?.unknown || 0 }}</p>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-6 flex space-x-3">
            <router-link
              :to="{ name: 'book-detail', params: { id: book.id }}"
              class="flex-1 px-4 py-2 text-center text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              查看详情
            </router-link>
            <button
              @click="showEditModal(book)"
              class="flex-1 px-4 py-2 text-center text-sm text-white bg-yellow-500 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              编辑
            </button>
            <button
              @click="deleteBook(book.id)"
              class="flex-1 px-4 py-2 text-center text-sm text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建词书模态框 -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">创建词书</h3>
        <form @submit.prevent="createBook">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">名称</label>
              <input
                v-model="newBook.title"
                type="text"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">描述</label>
              <textarea
                v-model="newBook.description"
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              ></textarea>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 编辑词书模态框 -->
    <div v-if="showEditModalState" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">编辑词书</h3>
        <form @submit.prevent="updateBook">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">名称</label>
              <input
                v-model="editingBook.title"
                type="text"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">描述</label>
              <textarea
                v-model="editingBook.description"
                rows="3"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              ></textarea>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              @click="showEditModalState = false"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              更新
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { vocabBooksApi } from '../api/vocabBooks';

const vocabBooks = ref([]);
const loading = ref(false);
const error = ref(null);
const showCreateModal = ref(false);
const showEditModalState = ref(false);
const newBook = ref({
  title: '',
  description: ''
});
const editingBook = ref(null);

const loadVocabBooks = async () => {
  loading.value = true;
  try {
    const res = await vocabBooksApi.getAll();
    vocabBooks.value = res.data;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

onMounted(loadVocabBooks);

const calculateProgress = (book) => {
  if (!book.progress || !book.Words) return 0;
  const total = book.Words.length;
  const known = book.progress.known || 0;
  return Math.round((known / total) * 100);
};

const createBook = async () => {
  try {
    await vocabBooksApi.create(newBook.value);
    showCreateModal.value = false;
    newBook.value = { title: '', description: '' };
    // 刷新词书列表
    await loadVocabBooks();
  } catch (err) {
    error.value = err.message;
  }
};

const showEditModal = (book) => {
  showEditModalState.value = true;
  editingBook.value = { ...book };
};

const updateBook = async () => {
  try {
    await vocabBooksApi.update(editingBook.value.id, editingBook.value);
    showEditModalState.value = false;
    editingBook.value = null;
    // 刷新词书列表
    await loadVocabBooks();
  } catch (err) {
    error.value = err.message;
  }
};

const deleteBook = async (bookId) => {
  try {
    await vocabBooksApi.delete(bookId);
    // 刷新词书列表
    await loadVocabBooks();
  } catch (err) {
    error.value = err.message;
  }
};
</script>
