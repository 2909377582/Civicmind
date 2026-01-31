/**
 * CivicMind Node.js 后端入口
 */
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// 路由 (Gemini Integrated)
import gradingRoutes from './routes/grading';
import questionRoutes from './routes/questions';
import materialRoutes from './routes/materials';
import answerRoutes from './routes/answers';
import examRoutes from './routes/exams';
import uploadRoutes from './routes/upload';
import ocrRoutes from './routes/ocr';
import debugRoutes from './routes/debug';

const app = express();

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传的图片）
app.use('/uploads', express.static('uploads'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// API 路由
app.use('/api/v1/grading', gradingRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/materials', materialRoutes);
app.use('/api/v1/answers', answerRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/ocr', ocrRoutes);
app.use('/api/v1/debug', debugRoutes);

// 全局错误处理
app.use(errorHandler);

// 启动服务器
const server = app.listen(config.app.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎓 CivicMind Backend (Node.js)                      ║
║   Version: ${config.app.version.padEnd(42)}║
║   Port: ${String(config.app.port).padEnd(46)}║
║   Environment: ${config.app.env.padEnd(39)}║
║                                                       ║
║   API Base: http://127.0.0.1:${config.app.port}/api/v1${' '.repeat(20)}║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// 设置超时时间为 5 分钟 (300秒)
server.setTimeout(300000);

export default app;
