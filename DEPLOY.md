# CivicMind 部署指南

## 架构
```
前端 (React) → Vercel
后端 (Node.js) → Railway  
数据库 → Supabase (已配置)
```

## 步骤 1：部署后端到 Railway

1. 打开 https://railway.app/ 并用 GitHub 登录
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择 `2909377582/CivicMind` 仓库
4. **重要**：设置 Root Directory 为 `backend-node`
5. 添加环境变量：
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek API Key
   - `SUPABASE_URL` = 你的 Supabase URL
   - `SUPABASE_ANON_KEY` = 你的 Supabase Anon Key
   - `PORT` = 3000
6. 部署完成后，复制生成的 URL（如 `https://xxx.railway.app`）

## 步骤 2：部署前端到 Vercel

1. 打开 https://vercel.com/ 并用 GitHub 登录
2. 点击 "Add New" → "Project"
3. 导入 `2909377582/CivicMind` 仓库
4. **重要**：设置 Root Directory 为 `frontend`
5. 添加环境变量：
   - `VITE_API_BASE_URL` = Railway 后端 URL（步骤1获得）
6. 点击 Deploy

## 环境变量参考

### Railway (后端)
```
DEEPSEEK_API_KEY=sk-xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
PORT=3000
```

### Vercel (前端)
```
VITE_API_BASE_URL=https://xxx.railway.app
```

## 完成后

- 前端地址：`https://civicmind.vercel.app`（或自定义域名）
- 后端地址：`https://xxx.railway.app`
