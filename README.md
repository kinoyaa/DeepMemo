# DeepMemo - AI智能词书学习系统

## 项目简介
⚠️此项目是使用TRAE SOLO的VibeCoding练习，不具备参考意义⚠️
DeepMemo 是一款基于AI驱动的现代化前后端分离词书学习系统，专为高效背单词、智能复习和个性化学习体验而设计。支持自定义词书、AI智能推词、学习统计、进度追踪、语音朗读、单词拼写等全套功能。

## 主要功能
- **AI智能推荐**：结合记忆曲线与用户反馈，动态推送最适合的单词，避免重复低效。
- **词书/单词管理**：支持自定义词书、批量导入、AI一键生成、单词编辑与进度重置。
- **学习统计**：实时追踪学习进度，掌握已掌握/学习中/未学/永不推送等数据。
- **美观UI**：极简现代风格，暗黑/亮色自适应，移动端友好。
- **设置同步**：本地与后端设置自动同步，记忆上下文长度可调。
- **AI造句与纠错**：支持英文造句AI修正与智能评价。
- **CosyVoice语音朗读**：一键朗读单词、例句、AI修正句，提升听力与记忆效果。
- **单词拼写功能**：支持单词拼写测试，智能判定掌握度，拼写正确自动升级，拼写错误自动反馈。

## 技术栈
- 编写：TRAE SOLO
- 前端：Vue3 + Element Plus + TailwindCSS
- 后端：Node.js + Express + MySQL
- AI服务：OpenAI/GLM大模型

## 快速启动
### 1. 克隆项目
```bash
git clone https://github.com/kinoyaa/DeepMemo.git
cd DeepMemo
```

### 2. 启动后端
```bash
cd backend
npm install
cp .env.example .env # 配置数据库等信息
npm run dev
```

### 3. 启动前端
```bash
cd frontend
npm install
npm run dev
```

### 4. 访问
浏览器访问：http://localhost:5173

## 适用场景
- 个人背单词、英语学习
- 班级/小组词书管理
- AI辅助记忆、智能推词

## 贡献方式
欢迎提交 Issue 或 PR，完善功能、修复Bug、优化体验。

## 开源协议
MIT License

## 作者信息
- 作者：[Kinoya](http://kinoya.art)
- GitHub: [https://github.com/kinoyaa/DeepMemo](https://github.com/kinoyaa/DeepMemo)

---
© 2025 DeepMemo. All rights reserved. 
