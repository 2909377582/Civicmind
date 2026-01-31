/**
 * 试卷 API 路由
 */
import { Router, Request, Response } from 'express';
import { ExamService } from '../services/ExamService';
import { ExamParseService } from '../services/ExamParseService';
import { QuestionService } from '../services/QuestionService';
import { AnswerService } from '../services/AnswerService';
import { CreateExamSchema } from '../models/Exam';
import { adminAuth } from '../middleware/adminAuth';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const examService = new ExamService();
const examParseService = new ExamParseService();
const questionService = new QuestionService();
const answerService = new AnswerService();

// 配置文件上传
const uploadDir = path.join(__dirname, '../../uploads/pdfs');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const pdfUpload = multer({
    storage: multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
            cb(null, `exam_${Date.now()}_${file.originalname}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('text/')) {
            cb(null, true);
        } else {
            cb(new Error('只支持 PDF 或文本文件'));
        }
    }
});

/**
 * 获取试卷统计（必须在 /:id 之前）
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
    try {
        const stats = await examParseService.getStats();
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 获取所有试卷列表（管理员，不分组）（必须在 /:id 之前）
 */
router.get('/admin/list', adminAuth, async (req: Request, res: Response) => {
    try {
        const { data: exams, error } = await require('../utils/supabase').getSupabase()
            .from('exams')
            .select('*')
            .order('year', { ascending: false });

        if (error) throw error;
        res.json(exams || []);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 获取试卷列表（按年份分组）
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const examsByYear = await examService.getListByYear();
        res.json(examsByYear);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 获取所有年份列表
 */
router.get('/years', async (req: Request, res: Response) => {
    try {
        const years = await examService.getYears();
        res.json(years);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 按年份获取试卷
 */
router.get('/by-year/:year', async (req: Request, res: Response) => {
    try {
        const year = parseInt(String(req.params.year));
        const examType = req.query.exam_type as string | undefined;
        const exams = await examService.getByYearAndType(year, examType);
        res.json(exams);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 获取试卷详情（含材料）
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const exam = await examService.getById(id);
        if (!exam) {
            return res.status(404).json({ detail: '试卷不存在' });
        }
        res.json(exam);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 获取试卷的所有题目
 */
router.get('/:id/questions', async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const questions = await examService.getQuestions(id);
        res.json(questions);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 创建试卷（管理员）
 */
router.post('/', adminAuth, async (req: Request, res: Response) => {
    try {
        const parsed = CreateExamSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ detail: parsed.error.issues[0].message });
        }

        const exam = await examService.create(parsed.data);
        res.status(201).json(exam);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 更新试卷基本信息（管理员）
 */
router.patch('/:id', adminAuth, async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const updated = await examService.update(id, req.body);
        if (!updated) {
            return res.status(404).json({ detail: '试卷不存在' });
        }
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 获取试卷详情（包括所有题目，用于编辑）
 */
router.get('/:id/detail', adminAuth, async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const exam = await examService.getById(id);
        if (!exam) {
            return res.status(404).json({ detail: '试卷不存在' });
        }

        // 获取该试卷的所有题目
        const questions = await questionService.getByExamId(id);

        // 获取每个题目的标准答案
        const questionsWithAnswers = await Promise.all(questions.map(async q => {
            const answer = await answerService.getByQuestionId(q.id);
            return {
                question_number: q.question_number,
                question_type: q.question_type,
                title: q.title,
                material_refs: q.material_refs || [],
                word_limit: q.word_limit,
                score: q.score,
                scoring_criteria: q.scoring_criteria || [],
                standard_answer: answer ? {
                    full_answer: answer.full_answer,
                    scoring_points: answer.scoring_points || []
                } : undefined
            };
        }));

        // 转换为 ParsedExam 格式
        const parsedExam = {
            year: exam.year,
            exam_type: exam.exam_type,
            exam_level: exam.exam_level,
            region: exam.region,
            exam_name: exam.exam_name,
            total_score: exam.total_score,
            materials_content: exam.materials_content,
            questions: questionsWithAnswers,
        };

        res.json(parsedExam);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 完整更新试卷（包括题目，管理员）
 */
router.put('/:id', adminAuth, async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const parsedExam = req.body;

        // 更新试卷基本信息
        await examService.update(id, {
            year: parsedExam.year,
            exam_type: parsedExam.exam_type,
            exam_level: parsedExam.exam_level,
            region: parsedExam.region,
            exam_name: parsedExam.exam_name,
            total_score: parsedExam.total_score,
            materials_content: parsedExam.materials_content,
        });

        // 删除旧题目
        await questionService.deleteByExamId(id);

        // 创建新题目
        for (const q of parsedExam.questions || []) {
            const newQuestion = await questionService.create({
                exam_id: id,
                year: parsedExam.year,
                exam_type: parsedExam.exam_type,
                exam_level: parsedExam.exam_level,
                region: parsedExam.region,
                question_number: q.question_number,
                question_type: q.question_type,
                title: q.title,
                material_refs: q.material_refs || [],
                materials_content: parsedExam.materials_content,
                word_limit: q.word_limit,
                score: q.score,
                difficulty: 3,
                tags: [],
                scoring_criteria: q.scoring_criteria || [],
            });

            // 如果有标准答案，也一并保存
            if (q.standard_answer) {
                await answerService.create({
                    question_id: newQuestion.id,
                    full_answer: q.standard_answer.full_answer,
                    scoring_points: q.standard_answer.scoring_points || [],
                    source_type: q.standard_answer.source_type || 'expert'
                });
            }
        }

        res.json({ success: true, message: '试卷更新成功' });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 删除试卷（管理员）
 */
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const success = await examService.delete(id);
        res.json({ success });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// ============ AI 解析和审核 API ============

import pdf from 'pdf-parse';
import { BaiduOCRService } from '../services/BaiduOCRService';

const baiduOCR = new BaiduOCRService();

/**
 * AI 解析试卷 PDF（管理员）
 * 支持：文字版PDF直接提取，扫描件PDF自动使用百度Layout Parsing OCR
 */
router.post('/parse-pdf', adminAuth, pdfUpload.single('file'), async (req: Request, res: Response) => {
    try {
        let content = '';

        if (req.file) {
            // 读取上传的文件内容
            const dataBuffer = fs.readFileSync(req.file.path);

            if (req.file.mimetype === 'application/pdf') {
                // 尝试提取PDF文本
                const data = await pdf(dataBuffer);
                content = data.text?.trim() || '';

                // 如果提取的文本为空或太短，可能是扫描件，使用百度OCR
                if (content.length < 100) {
                    console.log('检测到扫描件PDF（文字内容太少），使用百度 Layout Parsing OCR...');

                    try {
                        content = await baiduOCR.parsePDF(dataBuffer);
                        console.log('百度 OCR 成功，提取文字长度:', content.length);
                    } catch (ocrError: any) {
                        console.error('百度 OCR 失败:', ocrError.message);
                        fs.unlinkSync(req.file.path);
                        return res.status(400).json({
                            detail: '扫描件OCR识别失败: ' + ocrError.message + '\n\n建议：请使用"粘贴文本"方式手动输入试卷内容。'
                        });
                    }
                }
            } else {
                // 假设是文本文件
                content = dataBuffer.toString('utf-8');
            }

            // 解析完成后删除临时文件
            fs.unlinkSync(req.file.path);
        } else if (req.body.content) {
            // 直接传递文本内容
            content = req.body.content;
        } else {
            return res.status(400).json({ detail: '请上传文件或提供文本内容' });
        }

        // 检查内容是否有效
        if (!content || content.length < 50) {
            return res.status(400).json({
                detail: '无法从PDF中提取有效内容。可能原因：\n1. PDF是图片扫描件且OCR失败\n2. PDF内容为空\n\n建议使用"粘贴文本"方式输入试卷内容。'
            });
        }

        const parsed = await examParseService.parseExamContent(content);
        res.json(parsed);
    } catch (error: any) {
        console.error('Parse exam error:', error);
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 直接解析文本内容（管理员）- 无需上传文件
 */
router.post('/parse-text', adminAuth, async (req: Request, res: Response) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ detail: '请提供试卷文本内容' });
        }

        const parsed = await examParseService.parseExamContent(content);
        res.json(parsed);
    } catch (error: any) {
        console.error('Parse exam error:', error);
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 审核通过并保存试卷（管理员）
 */
router.post('/approve', adminAuth, async (req: Request, res: Response) => {
    try {
        const parsedExam = req.body;
        if (!parsedExam.exam_name || !parsedExam.questions) {
            return res.status(400).json({ detail: '数据不完整' });
        }

        console.log('Approve exam payload:', {
            name: parsedExam.exam_name,
            questionsCount: parsedExam.questions.length,
            sampleStandardAnswer: parsedExam.questions[0]?.standard_answer
        });

        const result = await examParseService.approveAndSave(parsedExam);
        res.status(201).json({
            success: true,
            message: `成功创建试卷和 ${result.question_ids.length} 道题目`,
            ...result
        });
    } catch (error: any) {
        console.error('Approve exam error:', error);
        res.status(500).json({ detail: error.message });
    }
});

export default router;
