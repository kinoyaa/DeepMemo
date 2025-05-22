<template>
  <div class="vocab-book-manager">
    <div class="header">
      <h2 class="text-xl font-bold">词书管理</h2>
      <div style="display: flex; gap: 12px;">
        <el-button type="primary" @click="openCreateDialog">新建词书</el-button>
        <el-button type="success" @click="showAIImportDialog = true" :loading="aiLoading">AI一键导入词书</el-button>
        <el-button type="warning" @click="showAIGenDialog = true" :loading="aiLoading">AI一键生成词书</el-button>
      </div>
    </div>
    <el-table :data="vocabBooks" border style="width: 100%">
      <el-table-column prop="title" label="词书名称" width="180" />
      <el-table-column prop="description" label="描述" />
      <el-table-column label="操作" width="180">
        <template #default="scope">
          <div class="op-btns">
            <el-button size="small" type="primary" class="op-edit" @click="editBook(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" class="op-del" @click="deleteBook(scope.row)">删除</el-button>
            <el-button size="small" type="warning" class="op-reset" @click="resetProgress(scope.row)">重置</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <!-- 新建词书弹窗 -->
    <el-dialog v-model="showCreateDialog" title="新建词书" width="50%">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="词书名称">
          <el-input v-model="createForm.title" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" />
        </el-form-item>
        <el-form-item label="单词管理">
          <el-table :data="createForm.words" style="width: 100%">
            <el-table-column label="单词">
              <template #default="scope">
                <el-input v-model="scope.row.word" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="释义">
              <template #default="scope">
                <el-input v-model="scope.row.meaning" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="复习次数">
              <template #default="scope">
                <el-input-number v-model="scope.row.review_count" :min="0" :max="5" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="scope">
                <el-button size="small" @click="removeCreateWord(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" @click="addCreateWord">添加单词</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCreateBook">保存</el-button>
      </template>
    </el-dialog>
    <!-- 编辑弹窗保留原有 -->
    <el-dialog v-model="showEditDialog" :title="editMode ? '编辑词书' : '新建词书'" width="50%">
      <el-form :model="currentBook" label-width="80px">
        <el-form-item label="词书名称">
          <el-input v-model="currentBook.title" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="currentBook.description" type="textarea" />
        </el-form-item>
        <el-form-item label="单词管理">
          <el-table :data="currentBook.words" style="width: 100%">
            <el-table-column label="单词">
              <template #default="scope">
                <el-input v-model="scope.row.word" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="释义">
              <template #default="scope">
                <el-input v-model="scope.row.meaning" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="复习次数">
              <template #default="scope">
                <el-input-number v-model="scope.row.review_count" :min="0" :max="5" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="记忆状态">
              <template #default="scope">
                <el-tag v-if="scope.row.isMastered" type="success">已记住</el-tag>
                <el-tag v-else type="info">未记住</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="scope">
                <el-button size="small" @click="removeWord(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" @click="addWord">添加单词</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveBook">保存</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="showAIImportDialog" title="AI一键导入词书" width="50%">
      <el-form :model="aiImportForm" label-width="80px">
        <el-form-item label="词书名称">
          <el-input v-model="aiImportForm.title" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="aiImportForm.description" type="textarea" />
        </el-form-item>
        <el-form-item label="单词管理">
          <el-input v-model="aiImportForm.wordsText" type="textarea" :rows="8" placeholder="每行一个单词，格式如：apple 苹果 I eat an apple every day." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAIImportDialog = false">取消</el-button>
        <el-button type="primary" :loading="aiLoading" @click="aiParseAndImport">AI解析并导入</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="showAIGenDialog" title="AI一键生成词书" width="50%">
      <el-form :model="aiGenForm" label-width="80px">
        <el-form-item label="主题">
          <el-input v-model="aiGenForm.topic" placeholder="如：旅游、商业、科技等" />
        </el-form-item>
        <el-form-item label="单词数量">
          <el-input-number v-model="aiGenForm.count" :min="1" :max="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAIGenDialog = false">取消</el-button>
        <el-button type="primary" :loading="aiLoading" @click="aiGenerateBook">一键生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { vocabBooksApi } from '../api/vocabBooks'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const vocabBooks = ref([])
const loading = ref(false)
const showEditDialog = ref(false)
const editMode = ref(false)
const currentBook = ref({ id: null, title: '', description: '', words: [] })
const aiLoading = ref(false)
const showAIImportDialog = ref(false)
const aiImportForm = ref({ title: '', description: '', wordsText: '' })
const showAIGenDialog = ref(false)
const aiGenForm = ref({ topic: '', count: 10 })
const showCreateDialog = ref(false)
const createForm = ref({ title: '', description: '', words: [] })
const apiBaseUrl = ref('')
const apiKey = ref('')

const loadVocabBooks = async () => {
  loading.value = true
  try {
    const res = await vocabBooksApi.getAll()
    vocabBooks.value = res.data
  } catch (error) {
    ElMessage.error('加载词书失败: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

onMounted(loadVocabBooks)

const editBook = async (book) => {
  try {
    const res = await vocabBooksApi.getById(book.id);
    currentBook.value = { ...res.data, words: res.data.words || [] };
    editMode.value = true;
    showEditDialog.value = true;
  } catch (error) {
    ElMessage.error('加载词书详情失败: ' + (error.response?.data?.error || error.message));
  }
};

const saveBook = async () => {
  if (!currentBook.value.title) {
    ElMessage.error('词书名称不能为空')
    return
  }
  loading.value = true
  try {
    if (editMode.value && currentBook.value.id) {
      await vocabBooksApi.update(currentBook.value.id, {
        title: currentBook.value.title,
        description: currentBook.value.description,
        words: currentBook.value.words
      })
      ElMessage.success('编辑成功')
    } else {
      await vocabBooksApi.create({
        title: currentBook.value.title,
        description: currentBook.value.description,
        words: currentBook.value.words
      })
      ElMessage.success('新建成功')
    }
    showEditDialog.value = false
    await loadVocabBooks()
  } catch (error) {
    ElMessage.error('保存失败: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
    editMode.value = false
    currentBook.value = { id: null, title: '', description: '', words: [] }
  }
}

const deleteBook = async (book) => {
  loading.value = true
  try {
    await vocabBooksApi.delete(book.id)
    ElMessage.success('删除成功')
    await loadVocabBooks()
  } catch (error) {
    ElMessage.error('删除失败: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

const getAISettings = async () => {
  try {
    const res = await axios.get('/api/vocabBooks/settings')
    return {
      apiBaseUrl: res.data.apiBaseUrl,
      apiKey: res.data.apiKey
    }
  } catch (e) {
    throw new Error('无法获取AI设置')
  }
}

const aiParseAndImport = async () => {
  aiLoading.value = true
  try {
    if (!aiImportForm.value.title) {
      ElMessage.error('词书名称不能为空')
      aiLoading.value = false
      return
    }
    if (!aiImportForm.value.wordsText.trim()) {
      ElMessage.error('请填写单词内容')
      aiLoading.value = false
      return
    }
    // 每次都从后端获取apikey和baseurl
    const { apiBaseUrl: realApiBaseUrl, apiKey: realApiKey } = await getAISettings()
    // 调用AI接口解析单词
    const response = await fetch(realApiBaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${realApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'THUDM/GLM-4-9B-0414',
        messages: [{
          role: 'user',
          content: `请将以下内容解析为单词列表，每行格式为"单词 释义"，释义里的单词要有词性标识比如（n. adv.），返回JSON数组格式：[{word:"", meaning:""}]，内容如下：\n${aiImportForm.value.wordsText}`
        }],
        temperature: 0.7,
        max_tokens: 2000
      })
    })
    if (!response.ok) throw new Error('AI接口请求失败')
    const data = await response.json()
    let content = data.choices[0].message.content
    // 尝试提取JSON
    let words = []
    try {
      const jsonStart = content.indexOf('[')
      const jsonEnd = content.lastIndexOf(']') + 1
      words = JSON.parse(content.slice(jsonStart, jsonEnd))
    } catch (e) {
      throw new Error('AI返回内容解析失败: ' + content)
    }
    if (!Array.isArray(words) || words.length === 0) throw new Error('AI未解析出有效单词')
    await vocabBooksApi.create({
      title: aiImportForm.value.title,
      description: aiImportForm.value.description,
      words
    })
    ElMessage.success('AI解析并导入成功')
    showAIImportDialog.value = false
    aiImportForm.value = { title: '', description: '', wordsText: '' }
    await loadVocabBooks()
  } catch (error) {
    ElMessage.error('AI解析导入失败: ' + error.message)
  } finally {
    aiLoading.value = false
  }
}

const addWord = () => {
  if (!currentBook.value.words) currentBook.value.words = [];
  currentBook.value.words.push({ word: '', meaning: '', example: '', review_count: 0 });
};

const removeWord = (index) => {
  currentBook.value.words.splice(index, 1);
};

const resetProgress = async (book) => {
  try {
    await vocabBooksApi.resetProgress(book.id);
    ElMessage.success('学习进度已重置');
    await loadVocabBooks();
  } catch (error) {
    ElMessage.error('重置失败: ' + (error.response?.data?.error || error.message));
  }
};

const aiGenerateBook = async () => {
  aiLoading.value = true
  try {
    if (!aiGenForm.value.topic) {
      ElMessage.error('请输入主题')
      aiLoading.value = false
      return
    }
    if (!aiGenForm.value.count || aiGenForm.value.count < 1) {
      ElMessage.error('请输入单词数量')
      aiLoading.value = false
      return
    }
    // 每次都从后端获取apikey和baseurl
    const { apiBaseUrl: realApiBaseUrl, apiKey: realApiKey } = await getAISettings()
    // 调用AI接口生成词书
    const response = await fetch(realApiBaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${realApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'THUDM/GLM-4-9B-0414',
        messages: [{
          role: 'user',
          content: `请以"${aiGenForm.value.topic}"为主题，生成一个有趣的中文英语词书名称和一句中文简短描述，并生成${aiGenForm.value.count}个相关英语单词，每个单词包含释义，返回JSON格式：{title:"...", description:"...", words:[{word:"", meaning:""}]}释义里的单词要有词性标识`
        }],
        temperature: 0.7,
        max_tokens: 2000
      })
    })
    if (!response.ok) throw new Error('AI接口请求失败')
    const data = await response.json()
    let content = data.choices[0].message.content
    // 尝试提取JSON
    let book = null
    try {
      const jsonStart = content.indexOf('{')
      const jsonEnd = content.lastIndexOf('}') + 1
      book = JSON.parse(content.slice(jsonStart, jsonEnd))
    } catch (e) {
      throw new Error('AI返回内容解析失败: ' + content)
    }
    if (!book?.title || !Array.isArray(book.words) || book.words.length === 0) throw new Error('AI未生成有效词书')
    await vocabBooksApi.create({
      title: book.title,
      description: book.description,
      words: book.words
    })
    ElMessage.success('AI生成词书成功')
    showAIGenDialog.value = false
    aiGenForm.value = { topic: '', count: 10 }
    await loadVocabBooks()
  } catch (error) {
    ElMessage.error('AI生成词书失败: ' + error.message)
  } finally {
    aiLoading.value = false
  }
}

const openCreateDialog = () => {
  showCreateDialog.value = true
  createForm.value = { title: '', description: '', words: [] }
}
const addCreateWord = () => {
  createForm.value.words.push({ word: '', meaning: '', review_count: 0 })
}
const removeCreateWord = (idx) => {
  createForm.value.words.splice(idx, 1)
}
const saveCreateBook = async () => {
  if (!createForm.value.title) {
    ElMessage.error('词书名称不能为空')
    return
  }
  try {
    await vocabBooksApi.create({
      title: createForm.value.title,
      description: createForm.value.description,
      words: createForm.value.words
    })
    ElMessage.success('新建成功')
    showCreateDialog.value = false
    await loadVocabBooks()
  } catch (e) {
    ElMessage.error('新建失败: ' + (e.response?.data?.error || e.message))
  }
}
</script>

<style>
.vocab-book-manager {
  padding: 20px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.rounded-lg {
  border-radius: 12px;
}
:deep(.el-button) {
  color: #222 !important;
}
.op-btns {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-left: 12px;
  margin-right: 12px;
}
.op-btns .el-button {
  border-radius: 8px !important;
  padding: 4px 12px !important;
  font-size: 0.95rem !important;
  min-width: 48px;
  transition: background 0.18s;
}
.op-edit {
  background: #eff6ff !important;
  color: #2563eb !important;
  border: none !important;
}
.op-edit:hover {
  background: #dbeafe !important;
  color: #1d4ed8 !important;
}
.op-del {
  background: #fee2e2 !important;
  color: #dc2626 !important;
  border: none !important;
}
.op-del:hover {
  background: #fecaca !important;
  color: #b91c1c !important;
}
.op-reset {
  background: #fef9c3 !important;
  color: #eab308 !important;
  border: none !important;
}
.op-reset:hover {
  background: #fef08a !important;
  color: #ca8a04 !important;
}
.dark .op-edit {
  background: #1e293b !important;
  color: #60a5fa !important;
}
.dark .op-edit:hover {
  background: rgba(51,65,85,0.25) !important;
  color: #3b82f6 !important;
}
.dark .op-del {
  background: #3b2323 !important;
  color: #f87171 !important;
}
.dark .op-del:hover {
  background: rgba(127,29,29,0.25) !important;
  color: #fecaca !important;
}
.dark .op-reset {
  background: #3a2e13 !important;
  color: #fde047 !important;
}
.dark .op-reset:hover {
  background: rgba(161,98,7,0.25) !important;
  color: #fef9c3 !important;
}
</style>
