/**
 * Google Gemini Service
 * 用于处理长文本格式化、辅助解析和扫描件OCR
 */
import axios from 'axios';
import { config } from '../config';

export class GeminiService {
    private apiKey: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1/models'; // 使用 v1 而非 v1beta
    private model = 'gemini-1.5-flash'; // 标准模型名称

    constructor() {
        this.apiKey = config.ai.geminiKey;
    }

    /**
     * 使用 Gemini Vision 对扫描件进行 OCR
     * @param imageBase64 图片的 base64 编码（不含前缀）
     * @param mimeType 图片 MIME 类型，如 'image/png', 'image/jpeg'
     */
    async ocrImage(imageBase64: string, mimeType: string = 'image/png'): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Gemini API Key 未配置，无法进行 OCR');
        }

        const prompt = `你是一个专业的OCR文字识别助手。请仔细识别这张试卷图片中的所有文字内容。

要求：
1. 完整、准确地提取图片中的所有中文和数字
2. 保持原有的段落结构和格式
3. 如果是试卷，注意识别"给定资料"、题目编号、分值等信息
4. 只返回识别出的文字内容，不要添加任何额外说明`;

        try {
            const response = await axios.post(
                `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
                {
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: imageBase64
                                }
                            }
                        ]
                    }]
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 120000 // 2分钟超时（图片处理可能较慢）
                }
            );

            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                return response.data.candidates[0].content.parts[0].text;
            }

            throw new Error('Gemini 未返回有效的识别结果');
        } catch (error: any) {
            console.error('Gemini OCR failed:', error.response?.data || error.message);
            throw new Error('OCR识别失败: ' + (error.response?.data?.error?.message || error.message));
        }
    }

    /**
     * 对多页扫描件进行 OCR 并合并结果
     * @param images 图片数组，每个元素包含 base64 和 mimeType
     */
    async ocrMultipleImages(images: Array<{ base64: string; mimeType: string }>): Promise<string> {
        const results: string[] = [];

        for (let i = 0; i < images.length; i++) {
            console.log(`正在 OCR 第 ${i + 1}/${images.length} 页...`);
            try {
                const text = await this.ocrImage(images[i].base64, images[i].mimeType);
                results.push(`--- 第 ${i + 1} 页 ---\n${text}`);
            } catch (err: any) {
                console.error(`第 ${i + 1} 页 OCR 失败:`, err.message);
                results.push(`--- 第 ${i + 1} 页 (识别失败) ---`);
            }
        }

        return results.join('\n\n');
    }

    /**
     * 格式化给定资料
     * 1. 明确标出 "给定资料 X"
     * 2. 正文段落缩进
     * 3. 保持原文内容不变
     */
    async formatMaterials(content: string): Promise<string> {
        if (!this.apiKey) {
            console.warn('Gemini API Key missing, skipping format.');
            return content;
        }

        const prompt = `你是一个专业的文档排版助手。请对以下申论试卷的"给定资料"部分进行格式化。

【原始内容】
${content.slice(0, 30000)}

【要求】
1. **标题增强**：将所有 "给定资料1"、"给定资料2" 等标题，统一处理为 "### 给定资料1" (Markdown H3 格式)，并确保其独占一行。
2. **正文缩进**：资料的正文段落，每段开头保留或添加2个全角空格的缩进（或直接保持段落感），确保视觉上段落分明。
3. **内容完整**：绝对不要删减、修改原文的任何文字，只调整格式。
4. **去除杂质**：如果开头有 "给定资料" 四个大字作为总标题，请保留并设为 "## 给定资料"。

请直接返回格式化后的 Markdown 文本。`;

        try {
            const response = await axios.post(
                `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
                {
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000 // 60s is usually enough for Gemini Flash
                }
            );

            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                return response.data.candidates[0].content.parts[0].text;
            }

            return content;
        } catch (error) {
            console.error('Gemini format failed:', error);
            return content; // 降级返回原文
        }
    }
}
