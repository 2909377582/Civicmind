import axios from 'axios';
import { getSyllabusByLevel } from '../config/syllabus';
import { config } from '../config';
import { debugLog } from '../utils/logger';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class AIService {
    private apiKey: string;
    private baseUrl: string;
    private model: string;

    constructor() {
        this.apiKey = config.ai.apiKey;
        this.baseUrl = config.ai.baseUrl;
        this.model = config.ai.model;
    }

    /**
     * 调用 AI 聊天接口
     */
    async chat(
        messages: ChatMessage[],
        temperature: number = 0.7,
        maxTokens: number = 2000,
        jsonMode: boolean = false
    ): Promise<string> {
        const body: any = {
            model: this.model,
            messages,
            temperature,
            max_tokens: maxTokens,
        };

        if (jsonMode) {
            body.response_format = { type: 'json_object' };
        }

        const requestId = Date.now().toString().slice(-6);
        debugLog(`[AIService] Request ${requestId} started`, {
            model: this.model,
            temperature,
            maxTokens,
            jsonMode,
            messageCount: messages.length,
            firstMessageSnippet: messages[0]?.content.slice(0, 100)
        });

        try {
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                body,
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 300000, // 5分钟超时 (Unified with server timeout)
                }
            );

            debugLog(`[AIService] Request ${requestId} finished`, {
                status: response.status,
                contentSnippet: response.data.choices[0].message.content.slice(0, 100)
            });

            return response.data.choices[0].message.content;
        } catch (error: any) {
            debugLog(`[AIService] Request ${requestId} FAILED`, {
                message: error.message,
                code: error.code,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * 分析语义相似度
     */
    async analyzeSemanticSimilarity(text1: string, text2: string): Promise<number> {
        const prompt = `请分析以下两段文本的语义相似度，返回0-1之间的数字（保留2位小数）。
只返回数字，不要其他任何文字。

【文本1】
${text1}

【文本2】
${text2}`;

        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

        try {
            const result = await this.chat(messages, 0.1, 50);
            const score = parseFloat(result.trim());
            return isNaN(score) ? 0.5 : Math.min(1, Math.max(0, score));
        } catch {
            return 0.5; // 降级返回中等相似度
        }
    }

    /**
     * 分析语言质量
     */
    async analyzeLanguageQuality(
        content: string,
        questionType: string
    ): Promise<{
        fluency: number;
        accuracy: number;
        professionalism: number;
        issues: string[];
        suggestions: string[];
    }> {
        const prompt = `你是一位申论批改专家。请分析以下${questionType}题型的作答，评估其语言质量。

【作答内容】
${content}

请返回JSON格式：
{
  "fluency": 0.85,
  "accuracy": 0.80,
  "professionalism": 0.75,
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"]
}

评分标准(0-1)：
- fluency: 语言流畅度
- accuracy: 表述准确性
- professionalism: 专业术语使用

只返回JSON，不要其他解释。`;

        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

        try {
            const result = await this.chat(messages, 0.3, 1000, true);
            return this.parseJSON(result, {
                fluency: 0.7,
                accuracy: 0.7,
                professionalism: 0.7,
                issues: [],
                suggestions: [],
            });
        } catch {
            return {
                fluency: 0.7,
                accuracy: 0.7,
                professionalism: 0.7,
                issues: [],
                suggestions: [],
            };
        }
    }

    /**
     * 生成综合批改反馈
     */
    /**
     * 生成综合批改反馈 (Holistic Grading with Chain-of-Thought)
     */
    async generateHolisticFeedback(
        userContent: string,
        questionTitle: string,
        referenceAnswer: string,
        questionType: string,
        scoringPoints: any[] = [], // Optional for backward compatibility but recommended
        examLevel?: string // 试卷级别 (如 "副省级", "乡镇级", "行政执法")
    ): Promise<{
        analysis_thought: string;
        dimensions: {
            understanding: number; // 25
            logic: number;        // 25
            language: number;     // 25
            norm: number;         // 25
        };
        overall_comment: string;
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
        scoring_details?: any[];
        logic_analysis?: any;
        polished_with_marks?: string;
        polished_clean?: string;
        sentence_upgrades?: { original: string; upgraded: string; reason: string }[];
    }> {
        const isBigEssay = (scoringPoints || []).reduce((sum, p) => sum + (p.score || 0), 0) >= 40 || questionType.includes('作文');
        const pointsStr = (scoringPoints || []).length > 0
            ? scoringPoints.map((p, i) => `${i + 1}. ${p.content} (分值: ${p.score})`).join('\n')
            : '未提供具体采分点，请根据参考答案概括';

        const syllabus = getSyllabusByLevel(examLevel);

        const essayExtraInstructions = isBigEssay ? `
【特别要求：大作文批改与润色】
这道题目分值为40分，属于大作文。请务必：
1. **polished_version 格式要求**：在原文基础上进行"原位手术"式润色，必须使用修改痕迹格式：
   - 格式：~~被替换的原词或原句~~ **修改后的词语或句子**
   - 示例：~~我们要努力做好这件事~~ **我们要以此为抓手，攻坚克难，将工作落到实处**
   - 保留原文段落结构，仅对语言进行升格优化
2. **润色风格要求**：
   - 去口语化：将大白话转化为规范的"官样文章"（法言法语）
   - 增强气势：适当使用排比、对仗，增加语势
   - 提升高度：将普通论述上升到政策理论高度（如新发展理念、高质量发展等）
   - 词汇精准：使用更精准的动词和名词（如"以此为抓手"代替"用这个方法"）
3. 在 "sentence_upgrades" 中提供至少 5 处关键语句的升格对比
4. 在 "logic_analysis" 中重点分析文章的立意、结构布局和论证深度` : '';

        const prompt = `你是一位拥有20年经验的申论阅卷组长。请采用"沉浸式阅卷"模式，严格按照【评分大纲】对以下考生的${questionType}作答进行深度批改。
${essayExtraInstructions}

【评分大纲（湖南省相关标准）】
${syllabus}

【题目】
${questionTitle}

【参考答案】
${referenceAnswer}

【标准采分点】
${pointsStr}

【考生作答】
${userContent}

请遵循以下思维链(Chain-of-Thought)进行批改：
1. **逻辑重构**：梳理考生的行文逻辑，并与"高手逻辑"（标准答案的理想逻辑）进行对比，找出断层。
2. **精准采分**：逐一核对【标准采分点】是否在考生作答中体现，区分"完全命中"、"部分命中"和"未命中"，并找出证据。
3. **综合定档**：基于以上分析给出四个维度的得分。

请返回严格的JSON格式：
{
  "analysis_thought": "你的阅卷思考过程（300字左右）",
  "dimensions": {
    "understanding": 20, 
    "logic": 18,         
    "language": 22,      
    "norm": 15           
  },
  "overall_comment": "给考生的最终评语",
  "strengths": ["亮点1", "亮点2"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["具体建议1", "具体建议2"],
  
  "scoring_details": [
    {
       "point": "采分点内容",
       "score": 5,
       "earned": 3,
       "status": "partial", 
       "evidence": "考生原文引用（能佐证得分的句子，未命中则留空）",
       "missing_keywords": ["漏掉的关键词1", "关键词2"]
    }
  ],

  "logic_analysis": {
      "user_logic_chain": ["第一步...", "第二步...", "第三步..."],
      "master_logic_chain": ["理想第一步...", "理想第二步...", "理想第三步..."],
      "gaps": ["逻辑断层1", "逻辑断层2"],
      "suggestions": ["如何弥补逻辑漏洞的建议..."]
  },

  "polished_with_marks": "在原文基础上进行润色标注。好的句子原样保留，需要修改的句子用格式：~~原句~~ **新句**。示例：我认为~~我们要努力做好这件事~~ **我们要以此为抓手，攻坚克难**，这样才能取得成效。",
  
  "polished_clean": "干净的完整修改后版本，没有任何标注，可直接阅读参考",
  
  "sentence_upgrades": [
      {
          "original": "考生原句（如：我们要努力做好这件事）",
          "upgraded": "升格后的表达（如：我们要以此为抓手，攻坚克难，将工作落到实处）",
          "reason": "修改原因说明（如：「努力做好」过于口语化，替换为公文常用的「抓手」表达，增强规范性和气势）"
      },
      {
          "original": "另一个需要优化的原句",
          "upgraded": "优化后的表达",
          "reason": "修改原因（去口语化/增强气势/提升理论高度/词汇精准等）"
      }
  ]
}

评分标准(status): full(完全命中), partial(部分命中), missed(未命中)。
只返回JSON，不要其他解释。`;

        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

        try {
            const result = await this.chat(messages, 0.4, 7000, true);
            return this.parseJSON(result, {
                analysis_thought: 'AI 思考过程生成失败...',
                dimensions: { understanding: 0, logic: 0, language: 0, norm: 0 },
                overall_comment: '批改完成，请查看得分详情。',
                strengths: [],
                weaknesses: [],
                suggestions: ['请参考标准答案进行对照学习'],
                scoring_details: [],
                logic_analysis: { user_logic_chain: [], master_logic_chain: [], gaps: [], suggestions: [] },
                polished_with_marks: '',
                polished_clean: '',
                sentence_upgrades: []
            });
        } catch {
            return {
                analysis_thought: '服务繁忙，无法生成深度思考...',
                dimensions: { understanding: 0, logic: 0, language: 0, norm: 0 },
                overall_comment: '自动批改完成。',
                strengths: [],
                weaknesses: [],
                suggestions: [],
                scoring_details: [],
                logic_analysis: { user_logic_chain: [], master_logic_chain: [], gaps: [], suggestions: [] }
            };
        }
    }

    /**
     * 润色文本
     */
    async polishText(content: string, questionType: string): Promise<string> {
        const prompt = `你是一位申论写作专家。请将以下${questionType}答案润色为更规范的"法言法语"表达。

【原文】
${content}

要求：
1. 保持原意不变
2. 使用更专业、规范的表述
3. 优化语言的条理性和逻辑性

请直接返回润色后的文本，不要其他解释。`;

        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
        return await this.chat(messages, 0.6, 2000);
    }

    /**
     * 生成升格范文
     */
    async generateUpgradedVersion(
        userAnswer: string,
        questionTitle: string,
        referenceAnswer: string
    ): Promise<string> {
        const prompt = `你是一位申论写作专家。请基于考生答案，生成一篇可获得高分的升格范文。

【题目】
${questionTitle}

【参考答案】
${referenceAnswer}

【考生原答案】
${userAnswer}

要求：
1. 保留考生答案中的合理要点
2. 补充遗漏的采分点
3. 优化语言表达和结构
4. 使用专业术语和规范表述

请直接返回升格后的范文，不要其他解释。`;

        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
        return await this.chat(messages, 0.7, 2000);
    }

    /**
     * PDF 文本提取
     */
    async parsePdfToText(buffer: Buffer): Promise<string> {
        // 使用 pdf-parse 库
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        return data.text;
    }

    /**
     * 从 PDF 文本解析结构化题目
     */
    async parseStructuredQuestion(text: string): Promise<any> {
        const prompt = `你是一位试卷录入专家。请从以下文本中提取试卷题目信息。

【文本内容】
${text.slice(0, 4000)}

请解析为以下JSON格式：
{
  "year": 2024,
  "exam_type": "国考/省考",
  "title": "题目完整名称",
  "materials_content": "材料原文（整合后的全部材料）",
  "full_answer": "参考答案原文",
  "scoring_points": [
    {
      "point_order": 1,
      "content": "采分点核心表述",
      "score": 2.0,
      "keywords": ["关键词1", "关键词2"]
    }
  ]
}

注意事项：
1. scoring_points 需要根据参考答案拆分
2. materials_content 需要包含所有的给定材料
3. 只返回JSON，不要其他解释`;

        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

        try {
            const result = await this.chat(messages, 0.1, 4000, true);
            return this.parseJSON(result, { error: '解析失败' });
        } catch (e) {
            return { error: `解析失败: ${e}` };
        }
    }

    /**
     * 从 PDF 文本提取素材金句
     */
    async parseStructuredMaterials(text: string): Promise<any[]> {
        const prompt = `你是一位素材编辑。请从以下文本中提取适合申论积累的金句和素材。

【文本内容】
${text.slice(0, 4000)}

请解析为以下JSON格式：
{
  "items": [
    {
      "category": "分类（如：科技创新、生态文明、民生改善等）",
      "title": "素材简短标题",
      "content": "金句或素材正文",
      "source": "来源（如：人民日报、新华社等，若文中未提及则留空）"
    }
  ]
}

只返回JSON，不要其他解释。`;

        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

        try {
            const resultString = await this.chat(messages, 0.3, 3000, true);
            const result = this.parseJSON<{ items: any[] }>(resultString, { items: [] });
            return result.items || [];
        } catch {
            return [];
        }
    }

    /**
     * 根据参考答案自动生成采分点
     */
    async generateScoringPoints(
        questionTitle: string,
        referenceAnswer: string
    ): Promise<Array<{
        point_order: number;
        content: string;
        score: number;
        keywords: string[];
    }>> {
        const prompt = `你是一位公务员考试阅卷专家。请根据以下题目和参考答案，拆解并生成评分细则（采分点）。

【题目】
${questionTitle}

【参考答案】
${referenceAnswer}

请将参考答案拆解为 4-6 个具体的采分点，并以 JSON 格式返回。
每个采分点应包含：
- point_order: 序号
- content: 采分点内容描述（清晰、准确）
- score: 该点分值（总分约10-20分，按重要性分配）
- keywords: 该点包含的关键得分词（2-4个）

返回格式示例：
{
  "points": [
    {
      "point_order": 1,
      "content": "指出问题核心在于...",
      "score": 4,
      "keywords": ["问题核心", "本质"]
    }
  ]
}

只返回 JSON，不要其他解释。`;

        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

        try {
            const resultString = await this.chat(messages, 0.2, 2000, true);
            const result = this.parseJSON<{ points: any[] }>(resultString, { points: [] });
            return result.points || [];
        } catch (e) {
            console.error('Generate scoring points error:', e);
            return [];
        }
    }

    /**
     * 安全解析 JSON (Public Utility)
     * 支持从 Markdown 代码块、混合文本中提取 JSON
     */
    public parseJSON<T>(text: string, fallback: T): T {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const JSON5 = require('json5');

        debugLog('[parseJSON] Input text length:', { length: text?.length, snippet: text?.substring(0, 200) });

        if (!text) {
            debugLog('[parseJSON] Empty text, returning fallback');
            return fallback;
        }

        try {
            let cleaned = text.trim();

            // 1. 尝试提取 Markdown 代码块 (```json ... ```)
            const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            if (codeBlockMatch) {
                cleaned = codeBlockMatch[1];
                debugLog('[parseJSON] Extracted from code block');
            } else {
                // 2. 尝试提取最外层 JSON 对象 ({ ... })
                const firstOpen = cleaned.indexOf('{');
                const lastClose = cleaned.lastIndexOf('}');
                if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
                    cleaned = cleaned.substring(firstOpen, lastClose + 1);
                    debugLog('[parseJSON] Extracted JSON object from text');
                }
            }

            // 3. 使用 JSON5 解析 (支持注释、末尾逗号、单引号等)
            const result = JSON5.parse(cleaned);
            debugLog('[parseJSON] Parse SUCCESS', {
                hasOverallComment: !!result.overall_comment,
                hasPolishedWithMarks: !!result.polished_with_marks,
                hasPolishedClean: !!result.polished_clean,
                sentenceUpgradesCount: result.sentence_upgrades?.length || 0
            });
            return result;

        } catch (e) {
            console.warn('JSON5 parsing failed:', e);
            console.warn('Failed text fragment:', text ? text.substring(0, 500) : 'empty');
            debugLog('[parseJSON] JSON5 FAILED', { error: String(e), textSnippet: text?.substring(0, 300) });

            // 4. 终极降级: 如果 JSON5 也失败了，尝试 Function 构造函数
            try {
                // eslint-disable-next-line no-new-func
                const fn = new Function(`return ${text}`);
                const result = fn();
                debugLog('[parseJSON] Function eval SUCCESS');
                return result;
            } catch (e2) {
                debugLog('[parseJSON] All parsing FAILED, returning fallback');
                return fallback;
            }
        }
    }
}
