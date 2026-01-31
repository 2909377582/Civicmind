/**
 * 素材 API 路由
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { MaterialService } from '../services/MaterialService';
import { AIService } from '../services/AIService';
import { CreateMaterialSchema } from '../models/Material';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();
const materialService = new MaterialService();
const aiService = new AIService();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * 获取素材列表
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { category, is_favorite, limit } = req.query;
        const materials = await materialService.getList(
            {
                category: category as string,
                is_favorite: is_favorite === 'true' ? true : is_favorite === 'false' ? false : undefined,
            },
            limit ? parseInt(limit as string) : 50
        );
        res.json(materials);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 搜索素材
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { keyword, limit } = req.query;
        if (!keyword) {
            return res.status(400).json({ detail: '请提供搜索关键词' });
        }
        const materials = await materialService.search(
            keyword as string,
            limit ? parseInt(limit as string) : 20
        );
        res.json(materials);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 创建素材（管理员）
 */
router.post('/', adminAuth, async (req: Request, res: Response) => {
    try {
        const parsed = CreateMaterialSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ detail: parsed.error.issues[0].message });
        }

        const material = await materialService.create(parsed.data);
        res.status(201).json(material);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * PDF 智能提取素材（管理员）
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
        const materials = await aiService.parseStructuredMaterials(text);

        res.json(materials);
    } catch (error: any) {
        res.status(500).json({ detail: `提取失败: ${error.message}` });
    }
});

/**
 * AI 智能提取素材元信息（标题、来源、分类）
 */
router.post('/extract-metadata', adminAuth, async (req: Request, res: Response) => {
    try {
        const { content } = req.body;
        if (!content || typeof content !== 'string') {
            return res.status(400).json({ detail: '请提供素材内容' });
        }

        const systemPrompt = `你是一个专业的中文文本分析助手。请从给定的文本中提取以下信息，并以严格的 JSON 格式返回：
        
{
    "title": "简短的标题（10-20字）",
    "source": "来源（如：人民日报、半月谈、新华社等，如果无法识别则返回空字符串）",
    "category": "分类（必须是以下之一：科技创新、生态文明、文化建设、政治参与、社会治理、经济发展、其他）"
}

注意：
1. 标题应简洁准确，概括文本核心主题
2. 如果文本中没有明确的来源信息，source 返回空字符串
3. 分类必须严格匹配给定的选项之一
4. 只返回 JSON，不要有任何其他内容`;

        const userPrompt = `请分析以下文本并提取元信息：\n\n${content.substring(0, 3000)}`;

        const response = await aiService.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], 0.1, 500, true);

        const parsed = aiService.parseJSON<{ title?: string; source?: string; category?: string }>(response, {});

        res.json({
            title: parsed.title || '',
            source: parsed.source || '',
            category: parsed.category || '其他'
        });
    } catch (error: any) {
        console.error('Extract metadata error:', error);
        res.status(500).json({ detail: `提取失败: ${error.message}` });
    }
});

/**
 * 切换收藏状态
 */
router.post('/:id/favorite', async (req: Request, res: Response) => {
    try {
        const success = await materialService.toggleFavorite(String(req.params.id));
        res.json({ success });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 删除素材（管理员）
 */
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
    try {
        const success = await materialService.delete(String(req.params.id));
        res.json({ success });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 更新素材（支持收藏切换）
 */
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const updated = await materialService.update(String(req.params.id), req.body);
        if (!updated) {
            return res.status(404).json({ detail: '素材不存在' });
        }
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

/**
 * 素材分类统计
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = await materialService.getStats();
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
