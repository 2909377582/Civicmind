/**
 * 题库 API 路由
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { QuestionService } from '../services/QuestionService';
import { AnswerService } from '../services/AnswerService';
import { AIService } from '../services/AIService';
import { CreateQuestionSchema } from '../models/Question';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();
const questionService = new QuestionService();
const answerService = new AnswerService();
const aiService = new AIService();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * 获取题目列表
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { year, exam_type, question_type, limit } = req.query;
        const questions = await questionService.getList(
            {
                year: year ? parseInt(year as string) : undefined,
                exam_type: exam_type as string,
                question_type: question_type as string,
            },
            limit ? parseInt(limit as string) : 50
        );
        res.json(questions);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 获取单个题目（含标准答案）
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const question = await questionService.getById(id);
        if (!question) {
            return res.status(404).json({ detail: '题目不存在' });
        }

        const answer = await answerService.getByQuestionId(id);
        res.json({ ...question, standard_answer: answer });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 一站式上传题目包（管理员）
 */
router.post('/upload-package', adminAuth, async (req: Request, res: Response) => {
    try {
        const { year, exam_type, title, materials_content, full_answer, scoring_points } = req.body;

        // 创建题目
        const question = await questionService.create({
            year,
            exam_type,
            question_number: 1,
            question_type: '归纳概括',
            title,
            materials_content,
            material_refs: [],
            score: scoring_points?.reduce((sum: number, p: any) => sum + (p.score || 2), 0) || 10,
            difficulty: 3,
            tags: [],
        });

        // 创建标准答案
        if (full_answer && scoring_points) {
            await answerService.create({
                question_id: question.id,
                full_answer,
                scoring_points: scoring_points.map((p: any, i: number) => ({
                    point_order: i + 1,
                    content: p.content,
                    score: p.score || 2,
                    keywords: p.keywords || [],
                    synonyms: [],
                    must_contain: [],
                    semantic_threshold: 0.7,
                })),
                source_type: 'expert',
            });
        }

        res.json(question);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * PDF 智能解析（管理员）
 */
router.post('/parse-pdf', adminAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ detail: '请上传 PDF 文件' });
        }

        if (!req.file.originalname.endsWith('.pdf')) {
            return res.status(400).json({ detail: '只支持 PDF 文件' });
        }

        const text = await aiService.parsePdfToText(req.file.buffer);
        const structuredData = await aiService.parseStructuredQuestion(text);

        res.json(structuredData);
    } catch (error: any) {
        res.status(500).json({ detail: `解析失败: ${error.message}` });
    }
});

/**
 * 统计题目数量（含分类统计）- 必须在 /:id 之前
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
    try {
        const stats = await questionService.getStats();
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 删除题目（管理员）
 */
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
    try {
        const success = await questionService.delete(String(req.params.id));
        res.json({ success });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});


/**
 * 自动生成采分点（管理员）
 */
router.post('/generate-scoring-points', adminAuth, async (req: Request, res: Response) => {
    try {
        const { title, reference_answer } = req.body;
        if (!title || !reference_answer) {
            return res.status(400).json({ detail: '题目和参考答案不能为空' });
        }

        const points = await aiService.generateScoringPoints(title, reference_answer);
        res.json(points);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
