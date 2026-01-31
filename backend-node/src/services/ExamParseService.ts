import { getSupabase } from '../utils/supabase';
import { v4 as uuidv4 } from 'uuid';
import { debugLog } from '../utils/logger';

// Removed local debugLog function as it is now imported from utils

import { AIService } from './AIService';
import { GeminiService } from './GeminiService';
import { config } from '../config';

interface ParsedExam {
    year: number;
    exam_type: string;
    exam_level?: string;
    region?: string;
    exam_name: string;
    materials_content: string;
    total_score: number;
    questions: ParsedQuestion[];
}

interface ParsedQuestion {
    question_number: number;
    question_type: string;
    title: string;
    word_limit: number;
    score: number;
    material_refs?: string[];
    scoring_criteria?: string[];  // 踩分点/评分标准
    standard_answer?: {
        full_answer: string;
        source_type?: 'official' | 'expert' | 'institution';
        analysis_approach?: string; // 解题思路/解析
        common_mistakes?: string[]; // 常见误区
        scoring_points: Array<{
            point_order: number;
            content: string;
            score: number;
            keywords: string[];
        }>;
    };
}

export class ExamParseService {
    private aiService: AIService;

    constructor() {
        this.aiService = new AIService();
    }

    /**
     * AI 解析试卷 PDF/文本
     */
    async parseExamContent(content: string): Promise<ParsedExam> {
        const systemPrompt = `你是一个专业的公务员考试试卷解析助手。请从给定的试卷内容中提取以下信息，并以严格的 JSON 格式返回：

{
    "year": 年份（数字）,
    "exam_type": "国考" | "省考" | "事业单位" | "选调生",
    "exam_level": "副省级" | "市地级" | "县乡级" | null,
    "region": "地区名称或null",
    "exam_name": "完整试卷名称",
    "total_score": 总分,
    "questions": [
        {
            "question_number":题号,
            "question_type": "归纳概括" | "综合分析" | "提出对策" | "贯彻执行" | "申发论述",
            "title": "题目完整内容",
            "word_limit": 字数限制,
            "score": 分值,
            "material_refs": ["资料1", "资料2"],
            "scoring_criteria": ["踩分点1：描述及关键词", "踩分点2：描述及关键词"],
            "standard_answer": {
                "full_answer": "参考答案（必须分点列出，格式为：1. 第一点内容；2. 第二点内容；3. 第三点内容...）",
                "analysis_approach": "解题思路或详细解析（非常重要，如有请务必提取）",
                "common_mistakes": ["常见误区1", "常见误区2"],
                "scoring_points": [
                    {
                        "point_order": 1,
                        "content": "采分点内容",
                        "score": 分值,
                        "keywords": ["关键词1", "关键词2"]
                    }
                ]
            }
        }
    ]
}

注意：
1. 如果某些信息无法从内容中提取，使用合理的默认值
2. 确保返回有效的 JSON 格式
3. **不需要**返回 materials_content (给定资料内容)，只提取题目和元数据
4. 每道题目都要识别其题型
5. **采分点 (scoring_criteria)**：请根据题目内容和可能的参考答案，列出 3-5 条关键的采分点描述（每条包含核心得分动作或关键词）。
6. **特别重要**：请尽可能提取题目的解题思路（analysis_approach）和参考答案`;

        const userPrompt = `请解析以下试卷内容：

${content.substring(0, 30000)}`; // 限制输入长度，防止 token 溢出，通常前 30k 字符足够包含所有题目

        try {
            debugLog('Starting AI exam parsing...', { contentLocation: 'length: ' + content.length });
            const response = await this.aiService.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], 0.1, 4000, true); // 0.1 temp, 4000 max_tokens, jsonMode=true

            debugLog('AI response received', { responseLength: response.length, preview: response.slice(0, 100) });


            // 使用 AIService 的增强 JSON 解析
            const parsed = this.aiService.parseJSON<ParsedExam | null>(response, null);

            if (!parsed) {
                console.error('AI Raw Response:', response); // 记录原始响应以便调试
                throw new Error('AI 返回格式错误，无法提取 JSON');
            }

            // 用户不再需要给定材料，直接置空
            parsed.materials_content = '';

            return parsed;
        } catch (error: any) {
            console.error('Exam parsing error:', error);
            throw new Error('试卷解析失败: ' + error.message);
        }
    }

    /**
     * 保存审核通过的试卷和题目到数据库
     */
    async approveAndSave(parsedExam: ParsedExam): Promise<{ exam_id: string; question_ids: string[] }> {
        const supabase = getSupabase();

        debugLog('ApproveAndSave called', {
            examName: parsedExam.exam_name,
            questionsCount: parsedExam.questions?.length,
            firstQuestionAnswer: parsedExam.questions?.[0]?.standard_answer
        });

        // 1. 创建试卷
        const { data: exam, error: examError } = await supabase
            .from('exams')
            .insert({
                year: parsedExam.year,
                exam_type: parsedExam.exam_type,
                exam_level: parsedExam.exam_level,
                region: parsedExam.region,
                exam_name: parsedExam.exam_name,
                materials_content: parsedExam.materials_content,
                total_score: parsedExam.total_score
            })
            .select()
            .single();

        if (examError) {
            console.error('Create exam error:', examError);
            throw new Error('创建试卷失败: ' + examError.message);
        }

        // 2. 创建题目
        const questionIds: string[] = [];
        for (const q of parsedExam.questions) {
            // 创建题目
            const { data: question, error: qError } = await supabase
                .from('questions')
                .insert({
                    exam_id: exam.id,
                    year: parsedExam.year,
                    exam_type: parsedExam.exam_type,
                    question_number: q.question_number,
                    question_type: q.question_type,
                    title: q.title,
                    materials_content: parsedExam.materials_content, // 复用试卷材料
                    word_limit: q.word_limit,
                    score: q.score,
                    material_refs: q.material_refs || [],
                    scoring_criteria: q.scoring_criteria || []
                })
                .select()
                .single();

            if (qError) {
                console.error('Create question error:', qError);
                debugLog(`Error creating question Q${q.question_number}`, qError);
                continue;
            }

            questionIds.push(question.id);

            // 如果有标准答案，创建答案记录
            if (q.standard_answer) {
                debugLog(`Saving answer for Q${q.question_number}`, q.standard_answer);
                const { error: ansError } = await supabase.from('standard_answers').insert({
                    question_id: question.id,
                    full_answer: q.standard_answer.full_answer,
                    scoring_points: q.standard_answer.scoring_points,
                    analysis_approach: q.standard_answer.analysis_approach,
                    common_mistakes: q.standard_answer.common_mistakes,
                    source_type: q.standard_answer.source_type || 'official'
                });
                if (ansError) {
                    debugLog('Error saving answer:', ansError);
                } else {
                    debugLog('Answer saved successfully');
                }
            } else {
                debugLog(`No standard answer for Q${q.question_number}`);
            }
        }

        return { exam_id: exam.id, question_ids: questionIds };
    }

    /**
     * 获取试卷统计信息
     */
    async getStats(): Promise<{
        total: number;
        by_year: Record<number, number>;
        by_type: Record<string, number>;
    }> {
        const supabase = getSupabase();

        const { data: exams, error } = await supabase
            .from('exams')
            .select('id, year, exam_type');

        if (error) {
            console.error('Get exam stats error:', error);
            return { total: 0, by_year: {}, by_type: {} };
        }

        const by_year: Record<number, number> = {};
        const by_type: Record<string, number> = {};

        exams.forEach(exam => {
            by_year[exam.year] = (by_year[exam.year] || 0) + 1;
            by_type[exam.exam_type] = (by_type[exam.exam_type] || 0) + 1;
        });

        return {
            total: exams.length,
            by_year,
            by_type
        };
    }
}
