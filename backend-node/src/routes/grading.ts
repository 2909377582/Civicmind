/**
 * 批改 API 路由 - 核心功能
 */
import { Router, Request, Response } from 'express';
import { GradingService } from '../services/GradingService';
import { SubmitAnswerSchema } from '../models/UserAnswer';
import { adminAuth } from '../middleware/adminAuth';
import { optionalUserAuth } from '../middleware/userAuth';

const router = Router();
const gradingService = new GradingService();

/**
 * 提交作答并批改
 */
router.post('/submit', optionalUserAuth, async (req: Request, res: Response) => {
    try {
        const parsed = SubmitAnswerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ detail: parsed.error.issues[0].message });
        }

        const { question_id, content, time_spent } = parsed.data;
        const userId = req.user?.id;
        const result = await gradingService.gradeAnswer(question_id, content, time_spent, userId);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: `批改失败: ${error.message}` });
    }
});

/**
 * 异步提交作答 - 立即返回，后台批改
 */
router.post('/submit-async', optionalUserAuth, async (req: Request, res: Response) => {
    try {
        const parsed = SubmitAnswerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ detail: parsed.error.issues[0].message });
        }

        const { question_id, content, time_spent } = parsed.data;
        const userId = req.user?.id;
        const result = await gradingService.submitAnswerAsync(question_id, content, time_spent, userId);

        res.json(result);
    } catch (error: any) {
        console.error('[Route] submit-async error:', error);
        res.status(500).json({
            detail: `提交失败: ${error.message}`,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * 查询批改状态
 */
router.get('/status/:answerId', async (req: Request, res: Response) => {
    try {
        const { answerId } = req.params;
        const status = await gradingService.getGradingStatus(String(answerId));
        res.json(status);
    } catch (error: any) {
        console.error('[Route] status query error:', error);
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 自定义题目批改
 */
router.post('/custom', async (req: Request, res: Response) => {
    try {
        const { question_title, reference_answer, scoring_points, user_answer, word_limit } = req.body;

        if (!question_title || !reference_answer || !scoring_points || !user_answer) {
            return res.status(400).json({ detail: '缺少必要参数' });
        }

        const result = await gradingService.gradeCustom(
            question_title,
            reference_answer,
            scoring_points,
            user_answer,
            word_limit
        );

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: `批改失败: ${error.message}` });
    }
});

/**
 * 获取某题的批改历史
 */
router.get('/history/:questionId', async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params;
        const limit = parseInt(String(req.query.limit) || '10');
        const history = await gradingService.getHistory(String(questionId), limit);
        res.json(history);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 获取批改报告
 */
router.get('/report/:answerId', async (req: Request, res: Response) => {
    try {
        const { answerId } = req.params;
        const report = await gradingService.getReport(String(answerId));

        if (!report) {
            return res.status(404).json({ detail: '批改记录不存在' });
        }

        res.json(report);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 获取用户自己的批改历史（公开，无需认证）
 * 返回最近的批改记录，包含批改状态
 */
router.get('/my-history', optionalUserAuth, async (req: Request, res: Response) => {
    try {
        const limit = parseInt(String(req.query.limit) || '20');
        const userId = req.user?.id;
        const history = await gradingService.getMyHistory(limit, userId);
        res.json(history);
    } catch (error: any) {
        console.error('[Route] my-history error:', error);
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 删除批改记录
 */
router.delete('/record/:answerId', async (req: Request, res: Response) => {
    try {
        const { answerId } = req.params;
        const success = await gradingService.deleteRecord(String(answerId));

        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ detail: '记录不存在' });
        }
    } catch (error: any) {
        console.error('[Route] delete record error:', error);
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 获取所有批改历史（管理员）
 */
router.get('/all-history', adminAuth, async (req: Request, res: Response) => {
    try {
        const limit = parseInt(String(req.query.limit) || '50');
        const history = await gradingService.getAllHistory(limit);
        res.json(history);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 语言润色
 */
router.post('/polish', async (req: Request, res: Response) => {
    try {
        const { content, question_type } = req.body;

        if (!content || !question_type) {
            return res.status(400).json({ detail: '缺少 content 或 question_type' });
        }

        const result = await gradingService.polishText(content, question_type);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 升格范文
 */
router.post('/upgrade', async (req: Request, res: Response) => {
    try {
        const { user_answer, question_title, reference_answer } = req.body;

        if (!user_answer || !question_title || !reference_answer) {
            return res.status(400).json({ detail: '缺少必要参数' });
        }

        const result = await gradingService.generateUpgradedVersion(
            user_answer,
            question_title,
            reference_answer
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
