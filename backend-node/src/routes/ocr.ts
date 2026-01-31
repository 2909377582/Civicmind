import { Router, Request, Response } from 'express';
import multer from 'multer';
import { BaiduOCRService } from '../services/BaiduOCRService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const bOcrService = new BaiduOCRService();

// 管理员鉴权中间件 (简单校验 Token)
const adminAuth = (req: Request, res: Response, next: any) => {
    const token = req.headers['x-admin-token'];
    if (token) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

/**
 * POST /api/v1/ocr
 * 图片 OCR 识别
 */
router.post('/', adminAuth, upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '未上传图片' });
        }

        console.log('收到 OCR 请求，文件名:', req.file.originalname);
        const text = await bOcrService.parseImage(req.file.buffer);

        res.json({ text });
    } catch (error: any) {
        console.error('OCR Route Error:', error);
        res.status(500).json({ message: error.message || 'OCR 识别失败' });
    }
});

export default router;
