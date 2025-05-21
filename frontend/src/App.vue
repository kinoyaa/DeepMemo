<script setup>


import { ref, onMounted, watch } from 'vue'
import { SunIcon, MoonIcon, UserCircleIcon, ChartBarIcon, BookOpenIcon } from '@heroicons/vue/24/outline'
import { Moon, Sunny, UserFilled, Reading, Setting, Notebook, DataAnalysis, Menu } from '@element-plus/icons-vue'
import { vocabBooksApi } from './api/vocabBooks'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const isDark = ref(false)
const isMobileMenuOpen = ref(false)
const showBookSelect = ref(false)
const vocabBooks = ref([])
const currentBookId = ref(null)
const currentBookTitle = ref('')
const showMeaning = ref(false)
const currentWord = ref(null)
const learnedWords = ref(new Set())
const memoryContextLength = ref(5)
const showSettingsDialog = ref(false)
const learnStatus = ref('learning')
const showStatsDialog = ref(false)
const stats = ref({ total: 0, known: 0, learning: 0, new: 0, blocked: 0 })
const showAboutDialog = ref(false)
const apiBaseUrl = ref('https://api.siliconflow.cn/v1/chat/completions')
const apiKey = ref('sk-gtmfuyqylvhrvqtlumegcsgvovyowrjqjjwnnjcitphgyxyi')

// 设置本地存储key
const SETTINGS_KEY = 'deepmemo_settings'

// 保存设置到本地和后端
const saveSettings = async () => {
  const settings = {
    memoryContextLength: memoryContextLength.value,
    apiBaseUrl: apiBaseUrl.value,
    apiKey: apiKey.value
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  try {
    await vocabBooksApi.saveSettings(settings)
  } catch (e) {
    console.warn('设置保存到后端失败', e)
  }
}

// 从本地和后端加载设置
const loadSettings = async () => {
  // 先从本地
  const local = localStorage.getItem(SETTINGS_KEY)
  if (local) {
    try {
      const obj = JSON.parse(local)
      if (obj.memoryContextLength) memoryContextLength.value = Number(obj.memoryContextLength)
      if (obj.apiBaseUrl) apiBaseUrl.value = obj.apiBaseUrl
      if (obj.apiKey) apiKey.value = obj.apiKey
    } catch {}
  }
  // 再从后端
  try {
    const res = await vocabBooksApi.getSettings()
    if (res.data.memoryContextLength) memoryContextLength.value = Number(res.data.memoryContextLength)
    if (res.data.apiBaseUrl) apiBaseUrl.value = res.data.apiBaseUrl
    if (res.data.apiKey) apiKey.value = res.data.apiKey
    // 覆盖本地
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(res.data))
  } catch (e) {
    console.warn('设置从后端加载失败', e)
  }
}

// 初始化主题
onMounted(() => {
  // 检查系统主题偏好
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDark.value = true
  }
  // 检查本地存储的主题设置
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDark.value = savedTheme === 'dark'
  }
  updateTheme()
  loadBooks()
  loadSettings()
})

// 监听主题变化
watch(isDark, (newValue) => {
  updateTheme()
  localStorage.setItem('theme', newValue ? 'dark' : 'light')
})

// 更新主题
const updateTheme = () => {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// 切换主题
const toggleTheme = (value) => {
  document.documentElement.classList.toggle('dark', value)
}

const showVocabBookDialog = ref(false)
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const loadBooks = async () => {
  const res = await vocabBooksApi.getAll()
  vocabBooks.value = res.data
  if (!currentBookId.value && vocabBooks.value.length > 0) {
    currentBookId.value = vocabBooks.value[0].id
    currentBookTitle.value = vocabBooks.value[0].title
  } else {
    const found = vocabBooks.value.find(b => b.id === currentBookId.value)
    if (found) currentBookTitle.value = found.title
  }
}

const confirmSwitchBook = () => {
  const found = vocabBooks.value.find(b => b.id === currentBookId.value)
  if (found) currentBookTitle.value = found.title
  showBookSelect.value = false
}

// 获取当前词书所有单词
const loadWords = async () => {
  if (!currentBookId.value) return
  // 获取历史反馈
  const feedbackRes = await vocabBooksApi.getFeedback(currentBookId.value, memoryContextLength.value)
  const learningHistory = feedbackRes.data || []
  // 获取单词
  const res = await vocabBooksApi.getById(currentBookId.value)
  const allWordsRaw = res.data.words || []
  if (allWordsRaw.length === 0) {
    currentWord.value = null
    learnStatus.value = 'empty'
    return
  }
  // 过滤掉永不推送的单词
  const allWords = allWordsRaw.filter(w => !learningHistory.find(h => w.word && w.word.trim() === h.word.trim() && h.feedback === 'C'))
  if (allWords.length === 0) {
    currentWord.value = null
    learnStatus.value = 'allBlocked'
    return
  }
  // 只保留未学满5次的单词
  const availableWords = allWords.filter(w => (w.review_count || 0) < 5)
  if (availableWords.length === 0) {
    currentWord.value = null
    learnStatus.value = 'done'
    return
  }
  learnStatus.value = 'learning'
  // 选择AI推荐的下一个单词
  await recommendNextWord(availableWords, learningHistory)
}

// AI推荐下一个单词
const recommendNextWord = async (words, learningHistory) => {
  if (!words || words.length === 0) {
    currentWord.value = null
    return
  }
  // 只取最近n条历史反馈
  const historyStr = (learningHistory || []).slice(0, memoryContextLength.value).map(h => `${h.word} ^${h.feedback}`).join(', ')
  const systemPrompt = `你是一个智能单词学习推荐助手。历史反馈是用户最近背过的单词及其记忆情况，格式如 word ^A、word ^B、word ^C，^A表示用户认识，^B表示不认识，^C表示永不推送。请你结合记忆曲线，优先推荐最合适且不重复的单词进行学习。你只能从用户给定的单词列表中选择一个最适合学习的单词，严格区分大小写，只返回该单词本身，不要返回列表或解释或任何其他内容。当用户上一个选择认识后，优先推荐下一个单词，当用户上一个选择不认识后，优先推荐下一个没背过的单词。`
  const userPrompt = `单词及复习次数：${words.map(w => w.word + ':' + (w.review_count || 0)).join(', ')}。历史反馈：${historyStr}`
  console.log('[AI推词systemPrompt]', systemPrompt)
  console.log('[AI推词userPrompt]', userPrompt)
  try {
    const response = await fetch(apiBaseUrl.value, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'THUDM/GLM-4-9B-0414',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    })
    if (!response.ok) throw new Error('AI接口请求失败')
    const data = await response.json()
    console.log('[AI推荐单词返回]', data)
    let wordStr = data.choices[0].message.content.trim()
    // 取出推荐的单词，若AI返回的单词不在可选列表，则顺序推下一个未学满的单词
    let next = words.find(w => w.word && w.word.trim() === wordStr.trim())
    if (!next) {
      console.warn(`[AI返回单词不在词书内] AI返回: ${wordStr}，词书单词:`, words.map(w => w.word))
      next = words.find(w => (w.review_count || 0) < 5 && !(learningHistory || []).find(h => w.word && w.word.trim() === h.word.trim() && h.feedback === 'C'))
    }
    currentWord.value = next ? { ...next } : { ...words[0] }
    showMeaning.value = false
    learnStatus.value = 'learning'
  } catch (e) {
    ElMessage.error(e?.message || 'AI接口请求失败')
    // AI异常时默认顺序推荐
    const next = words.find(w => (w.review_count || 0) < 5 && !(learningHistory || []).find(h => w.word && w.word.trim() === h.word.trim() && h.feedback === 'C'))
    currentWord.value = next || words[0]
    if (!next) {
      learnStatus.value = 'error'
    } else {
      learnStatus.value = 'learning'
    }
  }
}

// 用户反馈
const feedback = async (type) => {
  if (!currentWord.value) return
  // 保存反馈到后端
  await vocabBooksApi.postFeedback(currentBookId.value, currentWord.value.word, type)
  // 获取完整单词列表
  const res = await vocabBooksApi.getById(currentBookId.value)
  const allWords = res.data.words || []
  // 找到当前单词并更新复习次数
  const idx = allWords.findIndex(w => w.word === currentWord.value.word)
  if (idx !== -1) {
    if (type === 'A') {
      allWords[idx].review_count = Math.min((allWords[idx].review_count || 0) + 1, 5)
    } else if (type === 'B') {
      allWords[idx].review_count = Math.max((allWords[idx].review_count || 0) - 1, 0)
    } else if (type === 'C') {
      allWords[idx].review_count = 5
    }
  }
  if (type === 'A' || type === 'B' || type === 'C') {
    await vocabBooksApi.update(currentBookId.value, {
      title: currentBookTitle.value,
      words: allWords
    })
  }
  // 重新推荐下一个单词
  await loadWords()
}

watch(currentBookId, loadWords)
onMounted(loadWords)

// 监听词书管理弹窗关闭时刷新词书列表
watch(showVocabBookDialog, async (val) => {
  if (!val) {
    await loadBooks()
  }
})

// vocabBooksApi 扩展
vocabBooksApi.getSettings = async () => {
  return await axios.get('/api/vocabBooks/settings')
}
vocabBooksApi.saveSettings = async (data) => {
  return await axios.post('/api/vocabBooks/settings', data)
}

const onSaveSettings = async () => {
  await saveSettings()
  showSettingsDialog.value = false
}

const showSentenceInput = ref(false)
const userSentence = ref('')
const sentenceError = ref('')
const sentenceLoading = ref(false)
const showSentenceReview = ref(false)
const aiFixedSentence = ref('')
aiFixedSentence.value = ''
const aiSentenceLevel = ref('')
const aiSentenceComment = ref('')

const onShowSentenceInput = () => {
  showSentenceInput.value = true
  userSentence.value = ''
  sentenceError.value = ''
  showSentenceReview.value = false
  aiFixedSentence.value = ''
  aiSentenceLevel.value = ''
  aiSentenceComment.value = ''
}

const onSubmitSentence = async () => {
  if (!currentWord.value) return
  if (!userSentence.value.trim()) {
    sentenceError.value = '请输入你的造句'
    return
  }
  sentenceLoading.value = true
  sentenceError.value = ''
  let fixedSentence = ''
  let success = false
  let reviewLevel = ''
  let reviewComment = ''
  for (let i = 0; i < 3; i++) {
    try {
      // 1. AI修正
      const aiRes = await fetch(apiBaseUrl.value, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.value}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'THUDM/GLM-4-9B-0414',
          messages: [
            { role: 'system', content: '你是一个英语语法专家。请帮用户修正下面的英文句子，使其语法正确、表达自然，只返回修正后的英文句子，不要解释。' },
            { role: 'user', content: userSentence.value }
          ],
          temperature: 0.2,
          max_tokens: 100
        })
      })
      if (!aiRes.ok) throw new Error('AI接口请求失败')
      const aiData = await aiRes.json()
      fixedSentence = aiData.choices[0].message.content.trim()
      // 2. AI评价
      const reviewPrompt = `请对下面的英文句子进行简要评价，并分为三个等级：1. 你的句子特别完美；2. 你的句子很好不过有些语法错误；3. 你的句子很不通顺。请用中文先给出等级（只写数字1/2/3），再给出一句简短评价不要与我提示的一样。原句：${userSentence.value}`
      const reviewRes = await fetch(apiBaseUrl.value, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.value}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'THUDM/GLM-4-9B-0414',
          messages: [
            { role: 'system', content: '你是一个英语写作评价专家。' },
            { role: 'user', content: reviewPrompt }
          ],
          temperature: 0.2,
          max_tokens: 100
        })
      })
      if (!reviewRes.ok) throw new Error('AI评价接口请求失败')
      const reviewData = await reviewRes.json()
      // 解析等级和评价
      const reviewText = reviewData.choices[0].message.content.trim()
      const match = reviewText.match(/^(\d)[\s\-:：、，.。]?(.+)$/)
      if (match) {
        reviewLevel = match[1]
        reviewComment = match[2].trim()
      } else {
        reviewLevel = ''
        reviewComment = reviewText
      }
      success = true
      break
    } catch (e) {
      ElMessage.error(e?.message || 'AI修正或评价失败')
      if (i === 2) {
        sentenceError.value = 'AI修正或评价失败，请重试或简化句子'
      }
    }
  }
  if (success) {
    aiFixedSentence.value = fixedSentence
    aiSentenceLevel.value = reviewLevel
    aiSentenceComment.value = reviewComment
    showSentenceReview.value = true
  }
  sentenceLoading.value = false
}

const onConfirmSentence = async () => {
  await saveExampleToWord(aiFixedSentence.value)
  showSentenceInput.value = false
  showSentenceReview.value = false
  await feedback('B', aiFixedSentence.value)
}

const onCancelSentence = () => {
  showSentenceReview.value = false
}

const saveExampleToWord = async (sentence) => {
  // 获取完整单词列表
  const res = await vocabBooksApi.getById(currentBookId.value)
  const allWords = res.data.words || []
  const idx = allWords.findIndex(w => w.word && w.word.trim() === currentWord.value.word.trim())
  if (idx !== -1) {
    allWords[idx].example = sentence
    await vocabBooksApi.update(currentBookId.value, {
      title: currentBookTitle.value,
      words: allWords
    })
  }
}

const calcStats = async () => {
  if (!currentBookId.value) return
  const res = await vocabBooksApi.getById(currentBookId.value)
  const feedbackRes = await vocabBooksApi.getFeedback(currentBookId.value, 10000)
  const history = feedbackRes.data || []
  const words = res.data.words || []
  stats.value.total = words.length
  stats.value.known = words.filter(w => w.review_count === 5).length
  stats.value.learning = words.filter(w => w.review_count > 0 && w.review_count < 5).length
  stats.value.new = words.filter(w => !w.review_count || w.review_count === 0).length
  stats.value.blocked = words.filter(w => history.find(h => h.word === w.word && h.feedback === 'C')).length
}
</script>

<script>
import VocabBookManager from './components/VocabBookManager.vue'
</script>

<template>
  <el-config-provider>
    <div class="app-container">
      <el-container>
        <el-header height="60px">
          <div class="header-content">
            <div class="logo">
              <el-icon><Reading /></el-icon>
              <span>DeepMemo</span>
            </div>
            <div class="switch-book-btn">
              <div class="book-info">
                <span class="book-title">{{ currentBookTitle }}</span>
                <el-button class="switch-btn" @click="showBookSelect = true" plain round>切换词书</el-button>
              </div>
            </div>
            <div class="header-right">
              <el-switch
                v-model="isDark"
                inline-prompt
                :active-icon="Moon"
                :inactive-icon="Sunny"
                @change="toggleTheme"
              />
              <el-dropdown>
                <el-icon :style="{color: isDark ? '#fff' : '#222', fontSize: '28px', cursor: 'pointer'}"><Menu /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="showStatsDialog = true; calcStats()">
                      <el-icon :style="{color: isDark ? '#fff' : '#222', marginRight: '8px'}"><DataAnalysis /></el-icon>
                      学习统计
                    </el-dropdown-item>
                    <el-dropdown-item @click="showVocabBookDialog = true">
                      <el-icon :style="{color: isDark ? '#fff' : '#222', marginRight: '8px'}"><Notebook /></el-icon>
                      词书
                    </el-dropdown-item>
                    <el-dropdown-item @click="showSettingsDialog = true">
                      <el-icon :style="{color: isDark ? '#fff' : '#222', marginRight: '8px'}"><Setting /></el-icon>
                      设置
                    </el-dropdown-item>
                    <el-dropdown-item @click="showAboutDialog = true">
                      <el-icon :style="{color: isDark ? '#fff' : '#222', marginRight: '8px'}"><UserFilled /></el-icon>
                      关于
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              
              <el-dialog
                v-model="showVocabBookDialog"
                title="词书管理"
                width="70%"
                :close-on-click-modal="false"
                custom-class="rounded-lg"
              >
                <vocab-book-manager />
              </el-dialog>
            </div>
          </div>
        </el-header>

        <el-dialog v-model="showBookSelect" title="切换词书" width="400px">
          <el-select v-model="currentBookId" placeholder="请选择词书" style="width: 100%">
            <el-option v-for="book in vocabBooks" :key="book.id" :label="book.title" :value="book.id" />
          </el-select>
          <template #footer>
            <el-button @click="showBookSelect = false">取消</el-button>
            <el-button type="primary" @click="confirmSwitchBook">确定</el-button>
          </template>
        </el-dialog>

        <el-dialog v-model="showSettingsDialog" title="设置" width="400px">
          <el-form label-width="120px">
            <el-form-item label="记忆上下文长度">
              <el-input-number v-model="memoryContextLength" :min="1" :max="50" />
            </el-form-item>
            <el-form-item label="硅基流动API地址">
              <el-input v-model="apiBaseUrl" />
            </el-form-item>
            <el-form-item label="硅基流动API密钥">
              <el-input v-model="apiKey" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="showSettingsDialog = false">关闭</el-button>
            <el-button type="primary" @click="onSaveSettings">保存</el-button>
          </template>
        </el-dialog>

        <el-dialog v-model="showStatsDialog" title="学习统计" width="400px">
          <div class="stats-panel">
            <div class="stats-row"><span>总单词数</span><span>{{ stats.total }}</span></div>
            <div class="stats-row"><span>已掌握</span><span class="stats-known">{{ stats.known }}</span></div>
            <div class="stats-row"><span>学习中</span><span class="stats-learning">{{ stats.learning }}</span></div>
            <div class="stats-row"><span>未学习</span><span class="stats-new">{{ stats.new }}</span></div>
            <div class="stats-row"><span>已被永不推送</span><span class="stats-blocked">{{ stats.blocked }}</span></div>
          </div>
          <template #footer>
            <el-button @click="showStatsDialog = false">关闭</el-button>
          </template>
        </el-dialog>

        <el-dialog v-model="showAboutDialog" title="关于 DeepMemo" width="480px">
          <div class="about-panel">
            <h2 style="font-size:1.3rem;font-weight:bold;margin-bottom:8px;">DeepMemo - AI智能词书学习系统</h2>
            <p style="margin-bottom:8px;">DeepMemo 是一款基于AI驱动的现代化前后端分离词书学习系统，专为高效背单词、智能复习和个性化学习体验而设计。</p>
            <ul style="margin-bottom:8px;">
              <li>• <b>AI智能推荐</b>：结合记忆曲线与用户反馈，动态推送最适合的单词，避免重复低效。</li>
              <li>• <b>词书/单词管理</b>：支持自定义词书、批量导入、AI一键生成、单词编辑与进度重置。</li>
              <li>• <b>学习统计</b>：实时追踪学习进度，掌握已掌握/学习中/未学/永不推送等数据。</li>
              <li>• <b>美观UI</b>：极简现代风格，暗黑/亮色自适应，移动端友好。</li>
              <li>• <b>设置同步</b>：本地与后端设置自动同步，记忆上下文长度可调。</li>
              <li>• <b>AI造句与纠错</b>：支持英文造句AI修正与智能评价。</li>
            </ul>
            <p style="margin-bottom:8px;">技术栈：Vue3 + Element Plus + Node.js + MySQL + OpenAI/GLM大模型。</p>
            <p style="margin-bottom:8px;">适用场景：个人背单词、班级/小组词书管理、AI辅助记忆、英语学习等。</p>
            <p style="margin-bottom:8px;">开源/作者：<a href="https://github.com/kinoyaa/DeepMemo" target="_blank" style="color:#409eff;">GitHub仓库</a> | Kinoya</p>
            <p style="font-size:0.95rem;color:#888;">© 2025 DeepMemo. All rights reserved.</p>
          </div>
          <template #footer>
            <el-button @click="showAboutDialog = false">关闭</el-button>
          </template>
        </el-dialog>

        <el-main>
          <div class="learning-system-center">
            <div v-if="currentWord" class="learning-card">
              <template v-if="!showSentenceInput">
                <div class="word-main">
                  <h2 class="word">{{ currentWord.word }}</h2>
                  <div v-if="showMeaning">
                    <p class="meaning">{{ currentWord.meaning }}</p>
                    <p class="example" v-if="currentWord.example">你的例句：{{ currentWord.example }}</p>
                  </div>
                </div>
                <div class="actions">
                  <el-button v-if="!showMeaning" type="primary" @click="showMeaning = true">显示释义</el-button>
                  <template v-else>
                    <el-button @click="feedback('A')" type="success">认识</el-button>
                    <el-button v-if="!showSentenceInput" @click="onShowSentenceInput" type="warning">不认识</el-button>
                    <el-button @click="feedback('C')" type="danger" class="never-btn">永不推送</el-button>
                  </template>
                </div>
                <div class="review-count">复习次数：{{ currentWord.review_count }}/5</div>
              </template>
              <template v-else>
                <div v-if="!showSentenceReview" class="sentence-input-panel">
                  <h2 class="word">{{ currentWord.word }}</h2>
                  <el-input v-model="userSentence" type="textarea" :rows="3" placeholder="请用该单词造句（英文）" />
                  <div v-if="sentenceError" style="color:red;margin-top:8px;">{{ sentenceError }}</div>
                  <div style="margin-top:12px;display:flex;gap:12px;justify-content:center;">
                    <el-button type="primary" :loading="sentenceLoading" @click="onSubmitSentence">提交</el-button>
                    <el-button @click="showSentenceInput=false">取消</el-button>
                  </div>
                </div>
                <div v-else class="sentence-review-panel">
                  <div :class="['sentence-review-level',
                    aiSentenceLevel==='1' ? 'level-green' : aiSentenceLevel==='2' ? 'level-orange' : aiSentenceLevel==='3' ? 'level-red' : '']">
                    <span v-if="aiSentenceLevel==='1'">你的句子特别完美</span>
                    <span v-else-if="aiSentenceLevel==='2'">你的句子很好不过有些语法错误</span>
                    <span v-else-if="aiSentenceLevel==='3'">你的句子很不通顺</span>
                    <span v-else>未知</span>
                  </div>
                  <div class="sentence-review-box">
                    <div class="sentence-row">
                      <span :class="['sentence-content',
                        aiSentenceLevel==='1' ? 'content-green' : aiSentenceLevel==='2' ? 'content-orange' : aiSentenceLevel==='3' ? 'content-red' : '']">
                        {{ userSentence }}
                      </span>
                    </div>
                    <div class="sentence-row">
                      <span class="sentence-content content-green">{{ aiFixedSentence }}</span>
                    </div>
                  </div>
                  <div class="sentence-review-comment">{{ aiSentenceComment }}</div>
                  <div style="margin-top:18px;display:flex;gap:12px;justify-content:center;">
                    <el-button type="primary" @click="onConfirmSentence">确认保存</el-button>
                    <el-button @click="onCancelSentence">取消</el-button>
                  </div>
                </div>
              </template>
            </div>
            <div v-else class="learning-card-empty">
              <template v-if="learnStatus==='done'">恭喜，当前词书已学完！</template>
              <template v-else-if="learnStatus==='allBlocked'">所有单词都被"永不推送"，暂无可学单词。</template>
              <template v-else-if="learnStatus==='empty'">当前词书没有任何单词。</template>
              <template v-else-if="learnStatus==='error'">AI推荐异常或无可学单词，请稍后重试。</template>
              <template v-else>暂无可学单词。</template>
            </div>
          </div>
        </el-main>

        <el-footer height="60px">
          <div class="footer-content">
            <p>© 2025 DeepMemo. All rights reserved.</p>
          </div>
        </el-footer>
      </el-container>
    </div>
  </el-config-provider>
</template>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb {
  background: #475569;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.app-container {
  min-height: 100vh;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  flex-wrap: wrap;
  gap: 8px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: bold;
}

.main-menu {
  flex: 1;
  margin: 0 40px;
  border-bottom: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 暗色模式适配 */
.dark {
  color-scheme: dark;
}

.dark .el-header {
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
}

.dark .el-footer {
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
}

.switch-book-btn {
  display: flex;
  align-items: center;
  margin: 0 40px;
}
.book-info {
  display: flex;
  align-items: center;
  border: 1.5px solid #222;
  border-radius: 24px;
  padding: 4px 16px;
  background: transparent;
}
.book-title {
  font-size: 16px;
  font-weight: 500;
  margin-right: 12px;
  color: #222;
}
.switch-btn {
  border: none;
  color: #222;
  background: transparent;
  font-weight: 500;
  border-radius: 20px;
  border: 1.5px solid #222;
  margin-left: 0;
}
.switch-btn:hover {
  background: #f5f5f5;
}
.dark .book-info {
  border: 1.5px solid #aaa;
  background: transparent;
}
.dark .book-title {
  color: #eee;
}
.dark .switch-btn {
  color: #eee;
  border: 1.5px solid #aaa;
  background: transparent;
}
.dark .switch-btn:hover {
  background: #222;
}

.el-main {
  height: 100vh;
  overflow: hidden;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}
.learning-system-center {
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.learning-card {
  background: var(--el-bg-color);
  padding: 32px 32px 24px 32px;
  min-width: 340px;
  max-width: 420px;
  margin-bottom: 32px;
  text-align: center;
  /* 响应式优化 */
  width: 90vw;
  max-width: 420px;
}
@media (max-width: 600px) {
  .learning-card {
    min-width: unset;
    width: 98vw;
    max-width: 99vw;
    padding: 18px 4vw 16px 4vw;
    font-size: 1rem;
  }
  .word {
    font-size: 2rem;
  }
  .actions {
    gap: 8px;
  }
  .review-count {
    font-size: 0.9rem;
  }
  .el-dialog {
    width: 98vw !important;
    max-width: 99vw !important;
    min-width: unset !important;
    border-radius: 12px !important;
    padding: 0 !important;
  }
  .el-dialog__body {
    padding: 12px 4vw !important;
  }
  .el-dialog__footer {
    padding: 8px 4vw !important;
  }
  .el-input-number, .el-input {
    width: 100% !important;
  }
  .header-content {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
  .switch-book-btn {
    margin: 0 0 8px 0;
  }
}
.word-main {
  margin-bottom: 24px;
}
.word {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 12px;
}
.meaning {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 8px;
}
.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}
.review-count {
  font-size: 0.95rem;
  color: #888;
}
.learning-card-empty {
  font-size: 1.2rem;
  color: #666;
  margin: 32px 0;
}
.footer-content, .el-footer {
  display: none !important;
}

html, body, #app, .app-container, .el-container {
  height: 100%;
  min-height: 100%;
  max-height: 100%;
  overflow: hidden;
}
body {
  overscroll-behavior: none;
}

.el-button,
.learning-card .el-button {
  background: #f3f4f6 !important;
  color: #222 !important;
  border: none !important;
  box-shadow: none !important;
  font-weight: 500;
  border-radius: 8px;
  transition: background 0.2s;
  font-size: 1rem;
  padding: 8px 18px;
}
@media (max-width: 600px) {
  .el-button,
  .learning-card .el-button {
    font-size: 1rem !important;
    padding: 8px 0 !important;
    min-width: 80px;
  }
}
.learning-card .el-button:hover {
  background: #e5e7eb !important;
  color: #111 !important;
}
.dark .el-button,
.dark .learning-card .el-button {
  background: #23272e !important;
  color: #eee !important;
  border: none !important;
}
.dark .learning-card .el-button:hover {
  background: #2d323b !important;
  color: #fff !important;
}

.sentence-review-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 0;
  width: auto;
  min-width: unset;
  max-width: 100vw;
}
.sentence-review-level {
  min-width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  font-weight: 600;
  margin-bottom: 18px;
  border-radius: 18px;
  background: #f3f4f6;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 18px;
  width: auto;
}
.level-green {
  background: linear-gradient(90deg, #d1fae580 0%, #fff 100%);
  color: #16a34a;
  backdrop-filter: blur(30px);
}
.level-orange {
  background: linear-gradient(90deg, #fef3c780 0%, #fff 100%);
  color: #d97706;
  backdrop-filter: blur(30px);
}
.level-red {
  background: linear-gradient(90deg, #fee2e280 0%, #fff 100%);
  color: #dc2626;
  backdrop-filter: blur(30px);
}
.sentence-review-box {
  background: #f3f4f6;
  border-radius: 16px;
  padding: 18px 18px 10px 18px;
  margin-bottom: 12px;
  min-width: 120px;
  max-width: 340px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  width: auto;
}
.sentence-row {
  margin-bottom: 8px;
  font-size: 1.05rem;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.sentence-label {
  color: #888;
  margin-right: 6px;
}
.sentence-content {
  color: #222;
  word-break: break-all;
}
.content-green {
  color: #16a34a;
}
.content-orange {
  color: #d97706;
}
.content-red {
  color: #dc2626;
}
.sentence-review-comment {
  font-size: 1.05rem;
  color: #e6a23c;
  margin-bottom: 4px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dark .sentence-review-box {
  background: #23272e;
}
.dark .sentence-label {
  color: #aaa;
}
.dark .sentence-content {
  color: #eee;
}

/* 主题切换按钮美化 */
.el-switch {
  --el-switch-off-color: #222 !important;
}

.never-btn {
  background: #fee2e2 !important;
  color: #dc2626 !important;
}
.never-btn:hover {
  background: #fecaca !important;
  color: #b91c1c !important;
}
.dark .never-btn {
  background: #2d2323 !important;
  color: #f87171 !important;
}
.dark .never-btn:hover {
  background: #3b2323 !important;
  color: #f87171 !important;
}

.stats-panel {
  padding: 12px 0 8px 0;
}
.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}
.stats-row:last-child {
  border-bottom: none;
}
.stats-known {
  color: #16a34a;
  font-weight: bold;
}
.stats-learning {
  color: #eab308;
  font-weight: bold;
}
.stats-new {
  color: #2563eb;
  font-weight: bold;
}
.stats-blocked {
  color: #dc2626;
  font-weight: bold;
}
.dark .stats-row {
  border-bottom: 1px solid #333;
}

.about-panel {
  padding: 8px 0 0 0;
  color: #222;
}
.dark .about-panel {
  color: #eee;
}

.el-dialog {
  border-radius: 18px !important;
}
.dark .el-dialog {
  border-radius: 18px !important;
  background: var(--el-bg-color) !important;
}

.el-dropdown-menu {
  border-radius: 14px !important;
}
.dark .el-dropdown-menu {
  border-radius: 14px !important;
  background: var(--el-bg-color) !important;
}
</style>
