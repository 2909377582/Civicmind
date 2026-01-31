/**
 * 标准答案 API 路由
 */
import { Router, Request, Response } from 'express';
import { AnswerService } from '../services/AnswerService';
import { CreateAnswerSchema } from '../models/Answer';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();
const answerService = new AnswerService();

/**
 * 获取题目的标准答案
 */
router.get('/question/:questionId', async (req: Request, res: Response) => {
    try {
        const answer = await answerService.getByQuestionId(String(req.params.questionId));
        if (!answer) {
            return res.status(404).json({ detail: '该题目暂无标准答案' });
        }
        res.json(answer);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 创建标准答案（管理员）
 */
router.post('/', adminAuth, async (req: Request, res: Response) => {
    try {
        const parsed = CreateAnswerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ detail: parsed.error.issues[0].message });
        }

        const answer = await answerService.create(parsed.data);
        res.status(201).json(answer);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 更新标准答案（管理员）
 */
router.put('/:id', adminAuth, async (req: Request, res: Response) => {
    try {
        const answer = await answerService.update(String(req.params.id), req.body);
        if (!answer) {
            return res.status(404).json({ detail: '答案不存在' });
        }
        res.json(answer);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 删除标准答案（管理员）
 */
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
    try {
        const success = await answerService.delete(String(req.params.id));
        res.json({ success });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
