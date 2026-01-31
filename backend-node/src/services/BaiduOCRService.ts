/**
 * 百度 AI Studio Layout Parsing Service
 * 用于扫描件 PDF 的 OCR 识别
 */
import axios from 'axios';

export class BaiduOCRService {
    // Layout Parsing API (Slower but better accuracy for docs)
    private apiUrl = 'https://fax9l9x6oadfud26.aistudio-app.com/layout-parsing';
    private token = '42ba5370e50d2273e18f5ee0cf8084793647b5f1';

    /**
     * 解析 PDF 或图片文件
     * @param fileBuffer 文件的 Buffer
     * @param fileType 0 = PDF, 1 = 图片
     * @returns 提取的 Markdown 文本
     */
    async parseDocument(fileBuffer: Buffer, fileType: 0 | 1 = 0): Promise<string> {
        const fileData = fileBuffer.toString('base64');

        const payload = {
            file: fileData,
            fileType: fileType,
            useDocOrientationClassify: false,
            useDocUnwarping: false,
            useChartRecognition: false,
        };

        const headers = {
            'Authorization': `token ${this.token}`,
            'Content-Type': 'application/json'
        };

        try {
            console.log('正在调用百度 Layout Parsing API...');
            const response = await axios.post(this.apiUrl, payload, {
                headers,
                timeout: 180000 // 3分钟超时（大文件可能需要更长时间）
            });

            if (response.status !== 200) {
                throw new Error(`API 返回错误状态: ${response.status}`);
            }

            const result = response.data.result;

            if (!result || !result.layoutParsingResults || result.layoutParsingResults.length === 0) {
                throw new Error('未能从文档中提取内容');
            }

            // 合并所有页面的 Markdown 内容
            const allText = result.layoutParsingResults
                .map((res: any, i: number) => {
                    const pageText = res.markdown?.text || '';
                    return `--- 第 ${i + 1} 页 ---\n${pageText}`;
                })
                .join('\n\n');

            console.log('百度 OCR 成功，提取文字长度:', allText.length);
            return allText;

        } catch (error: any) {
            // ... (keep existing error handling logic)
            // 提取更详细的错误信息
            let errorMessage = '文档解析失败';

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                errorMessage = '百度OCR服务响应超时，请稍后重试';
            } else if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                if (status === 429) {
                    errorMessage = '百度OCR请求过于频繁，请等待1分钟后重试';
                } else if (status === 401 || status === 403) {
                    errorMessage = '百度OCR认证失败，Token可能已过期';
                } else if (status === 500) {
                    errorMessage = '百度OCR服务器错误，请稍后重试';
                } else if (data?.message) {
                    errorMessage = `百度OCR: ${data.message}`;
                } else {
                    errorMessage = `百度OCR返回错误(${status})`;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            console.error('百度 OCR 失败:', errorMessage, error.response?.data || error.message);
            throw new Error(errorMessage);
        }
    }

    /**
     * 解析 PDF 文件
     */
    async parsePDF(pdfBuffer: Buffer): Promise<string> {
        return this.parseDocument(pdfBuffer, 0);
    }

    /**
     * 解析图片文件
     */
    async parseImage(imageBuffer: Buffer): Promise<string> {
        return this.parseDocument(imageBuffer, 1);
    }
}
