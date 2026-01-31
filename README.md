# CivicMind 申论智能批改

<p align="center">
  <img src="docs/logo.png" alt="CivicMind Logo" width="120" />
</p>

<p align="center">
  专业的申论批改应用，基于 AI 技术提供权威、精准的批改服务
</p>

---

## ✨ 功能特性

### 📚 题库中心
- **真题库**：收录历年国考、省考真题，按年份、题型分类
- **自定义题目**：支持用户输入自己的题目和参考答案进行批改

### 🎯 智能批改
- **采分点命中分析**：明确列出命中/漏掉的采分点
- **多维度评分**：内容分、格式分、语言分
- **格式检查**：应用文格式自动检测（标题、称谓、落款等）

### ✨ AI 反馈
- **语言润色**：将口语化表达转换为"法言法语"
- **升格范文**：基于用户答案生成高分版本
- **深度点评**：亮点、不足、改进建议

### 📖 素材积累
- **金句库**：分类收录官方表达、领导人讲话
- **每日推送**：每日精选金句推荐

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite |
| 后端 | Python + FastAPI |
| 数据库 | Supabase (PostgreSQL) |
| AI | DeepSeek API |

---

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- Python >= 3.10
- Supabase 账号

### 1. 克隆项目

```bash
git clone https://github.com/your-username/CivicMind.git
cd CivicMind
```

### 2. 配置 Supabase

1. 登录 [Supabase](https://supabase.com) 创建新项目
2. 在 SQL Editor 中执行 `scripts/init_database.sql`
3. 获取项目 URL 和 API Key

### 3. 启动后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
# 编辑 .env 文件，填入 Supabase 和 AI API 配置

# 启动服务
uvicorn app.main:app --reload
```

后端 API 文档：http://localhost:8000/docs

### 4. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端地址：http://localhost:5173

---

## 📁 项目结构

```
CivicMind/
├── backend/                  # Python 后端
│   ├── app/
│   │   ├── api/             # API 路由
│   │   ├── models/          # 数据模型
│   │   ├── services/        # 业务逻辑
│   │   └── main.py          # 入口文件
│   ├── requirements.txt
│   └── .env
│
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/      # 通用组件
│   │   ├── pages/           # 页面组件
│   │   └── App.tsx
│   └── package.json
│
├── data/                     # 数据文件
│   └── questions/           # 示例题目
│
├── scripts/                  # 工具脚本
│   └── init_database.sql    # 数据库初始化
│
└── README.md
```

---

## 📝 API 接口

### 题目管理
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/questions` | 获取题目列表 |
| GET | `/api/v1/questions/{id}` | 获取题目详情 |
| POST | `/api/v1/questions` | 创建题目 |

### 批改服务
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/grading/submit` | 提交作答并批改 |
| POST | `/api/v1/grading/custom` | 自定义题目批改 |
| POST | `/api/v1/grading/polish` | 语言润色 |
| POST | `/api/v1/grading/upgrade` | 生成升格范文 |

### 标准答案
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/answers/{question_id}` | 获取标准答案 |
| POST | `/api/v1/answers` | 创建标准答案 |

---

## 🔧 配置说明

### 后端配置 (.env)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# AI API (DeepSeek)
AI_API_KEY=your-api-key
AI_API_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
```

---

## 📄 License

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<p align="center">
  Made with ❤️ for 公考人
</p>
