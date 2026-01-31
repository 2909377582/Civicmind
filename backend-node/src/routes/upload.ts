/**
 * 文件上传路由
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 确保上传目录存在
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('只支持 jpg, png, gif, webp 格式'));
        }
    },
});

/**
 * 上传图片
 */
router.post('/image', upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ detail: '请上传图片文件' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        res.json({
            success: true,
            url: imageUrl,
            filename: req.file.filename,
            size: req.file.size,
        });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 上传多张图片
 */
router.post('/images', upload.array('images', 5), async (req: Request, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ detail: '请上传图片文件' });
        }

        const results = files.map(file => ({
            url: `/uploads/${file.filename}`,
            filename: file.filename,
            size: file.size,
        }));

        res.json({
            success: true,
            images: results,
        });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// ============ 手写图片 OCR ============
import { BaiduOCRService } from '../services/BaiduOCRService';
const baiduOCR = new BaiduOCRService();

/**
 * 上传图片并进行OCR识别（用于手写答案）
 */
router.post('/image-ocr', upload.single('image'), async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                detail: '请上传图片文件',
                error_type: 'NO_FILE'
            });
        }

        console.log(`[Upload] 收到图片: ${req.file.originalname}, 大小: ${(req.file.size / 1024).toFixed(1)}KB`);

        const imageUrl = `/uploads/${req.file.filename}`;

        // 读取图片并进行OCR
        const imageBuffer = fs.readFileSync(req.file.path);

        let extractedText = '';
        let ocrError: string | null = null;
        let ocrSuccess = false;

        try {
            console.log('[OCR] 开始调用百度 OCR API...');
            extractedText = await baiduOCR.parseImage(imageBuffer);
            ocrSuccess = true;
            console.log(`[OCR] 成功，识别文字长度: ${extractedText.length}，耗时: ${Date.now() - startTime}ms`);
        } catch (err: any) {
            ocrError = err.message || '未知OCR错误';
            console.error(`[OCR] 失败: ${ocrError}，耗时: ${Date.now() - startTime}ms`);
        }

        // 返回结果，包含 OCR 错误信息（如果有）
        res.json({
            success: true,
            url: imageUrl,
            filename: req.file.filename,
            size: req.file.size,
            text: extractedText,
            ocr_success: ocrSuccess,
            ocr_error: ocrError,
            processing_time: Date.now() - startTime
        });

    } catch (error: any) {
        console.error(`[Upload] 上传失败: ${error.message}`);
        res.status(500).json({
            success: false,
            detail: `上传处理失败: ${error.message}`,
            error_type: 'UPLOAD_ERROR'
        });
    }
});

export default router;
