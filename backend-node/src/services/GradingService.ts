/**
 * 批改业务服务
 */
import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../utils/supabase';
import { Question } from '../models/Question';
import { StandardAnswer, ScoringPoint } from '../models/Answer';
import { UserAnswer, GradingResult } from '../models/UserAnswer';
import { GradingEngine } from './GradingEngine';
import { AIService } from './AIService';

export class GradingService {
    private db = getSupabase();
    private table = 'user_answers';
    private gradingEngine: GradingEngine;
    private aiService: AIService;

    constructor() {
        this.gradingEngine = new GradingEngine();
        this.aiService = new AIService();
    }

    /**
     * 批改用户作答
     */
    async gradeAnswer(
        questionId: string,
        userContent: string,
        timeSpent?: number,
        userId?: string
    ): Promise<UserAnswer> {
        const start = Date.now();
        console.log(`[Perf] Start GradingService.gradeAnswer for q=${questionId}, user=${userId}`);
        // 1. 获取题目
        const { data: question } = await this.db
            .from('questions')
            .select('*')
            .eq('id', questionId)
            .single();

        if (!question) {
            throw new Error('题目不存在');
        }

        // 2. 获取标准答案
        const { data: answer } = await this.db
            .from('standard_answers')
            .select('*')
            .eq('question_id', questionId)
            .single();

        if (!answer) {
            throw new Error('该题目暂无标准答案，无法批改');
        }

        // 3. 执行批改
        const wordCount = userContent.replace(/\s/g, '').length;
        const gradingResult = await this.gradingEngine.grade(
            question as Question,
            answer as StandardAnswer,
            userContent
        );

        // 4. 构建用户作答记录
        const userAnswer: UserAnswer = {
            id: uuidv4(),
            user_id: userId,
            question_id: questionId,
            content: userContent,
            word_count: wordCount,
            time_spent: timeSpent,
            grading_result: gradingResult,
            is_graded: true,
            graded_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
        };

        // 5. 保存到数据库
        const tSave = Date.now();
        await this.saveUserAnswer(userAnswer);
        console.log(`[Perf] saveUserAnswer took ${Date.now() - tSave}ms`);

        console.log(`[Perf] GradingService.gradeAnswer total took ${Date.now() - start}ms`);

        return userAnswer;
    }

    /**
     * 自定义题目批改
     */
    async gradeCustom(
        questionTitle: string,
        referenceAnswer: string,
        scoringPoints: Array<{
            content: string;
            score: number;
            keywords?: string[];
        }>,
        userAnswerContent: string,
        wordLimit?: number
    ): Promise<GradingResult> {
        // 构建临时题目
        const tempQuestion: Question = {
            id: uuidv4(),
            year: new Date().getFullYear(),
            exam_type: '其他',
            question_number: 1,
            question_type: '归纳概括',
            title: questionTitle,
            material_refs: [],
            word_limit: wordLimit,
            score: scoringPoints.reduce((sum, p) => sum + p.score, 0),
            difficulty: 3,
            tags: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // 构建临时采分点
        const tempPoints: ScoringPoint[] = scoringPoints.map((p, i) => ({
            point_order: i + 1,
            content: p.content,
            score: p.score,
            keywords: p.keywords || [],
            synonyms: [],
            must_contain: [],
            semantic_threshold: 0.7,
        }));

        // 构建临时答案
        const tempAnswer: StandardAnswer = {
            id: uuidv4(),
            question_id: tempQuestion.id,
            full_answer: referenceAnswer,
            scoring_points: tempPoints,
            source_type: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // 执行批改
        return await this.gradingEngine.grade(tempQuestion, tempAnswer, userAnswerContent);
    }

    /**
     * 保存用户作答
     */
    private async saveUserAnswer(userAnswer: UserAnswer): Promise<void> {
        await this.db.from(this.table).insert({
            ...userAnswer,
            grading_result: userAnswer.grading_result,
        });
    }

    /**
     * 获取某题的批改历史
     */
    async getHistory(questionId: string, limit: number = 10): Promise<UserAnswer[]> {
        const { data } = await this.db
            .from(this.table)
            .select('*')
            .eq('question_id', questionId)
            .order('created_at', { ascending: false })
            .limit(limit);

        return (data || []) as UserAnswer[];
    }

    /**
     * 获取全量练习历史
     */
    async getAllHistory(limit: number = 50): Promise<any[]> {
        const { data } = await this.db
            .from(this.table)
            .select(`
                *,
                questions (
                    title,
                    score
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        // Transform result to flatten structure if needed, or frontend handles it
        return (data || []).map((item: any) => ({
            ...item,
            question_title: item.questions?.title,
            score: item.grading_result?.total_score || 0
        }));
    }

    /**
     * 获取用户自己的批改历史（公开，用于侧边栏显示）
     * 返回最近的批改记录，包含批改状态和进度
     */
    async getMyHistory(limit: number = 20): Promise<any[]> {
        // 1. 获取批改记录和题目基本信息，同时通过嵌套关联获取试卷名称
        const { data, error } = await this.db
            .from(this.table)
            .select(`
                id,
                question_id,
                content,
                word_count,
                grading_status,
                grading_result,
                is_graded,
                created_at,
                graded_at,
                questions (
                    title,
                    question_type,
                    score,
                    exam_id,
                    year,
                    exam_type,
                    exam_level,
                    region,
                    exams (
                        exam_name
                    )
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw new Error(`获取批改记录失败: ${error.message}`);
        }

        const historyItems = data || [];

        // 2. 组装结果
        return historyItems.map((item: any) => {
            const status = item.grading_status || (item.is_graded ? 'completed' : 'pending');
            const progressMap: Record<string, number> = {
                'pending': 10,
                'processing': 50,
                'completed': 100,
                'error': 0
            };

            const question = Array.isArray(item.questions) ? item.questions[0] : (item.questions || {});

            // 处理嵌套的试卷名称
            const examData = Array.isArray(question.exams) ? question.exams[0] : question.exams;
            let examTitle = examData?.exam_name || null;

            // 如果没有关联试卷的标题，则根据年份和阶段生成兜底标题
            if (!examTitle && question.year && question.exam_type) {
                const regionStr = question.region ? ` (${question.region})` : '';
                const levelStr = question.exam_level ? ` ${question.exam_level}` : '';
                examTitle = `${question.year}年 ${question.exam_type}${levelStr}${regionStr} 练习`;
            }

            return {
                id: item.id,
                question_id: item.question_id,
                question_title: question.title || '未知题目',
                question_type: question.question_type || '',
                max_score: question.score || 0,
                // 试卷信息
                exam_id: question.exam_id || null,
                exam_title: examTitle || '单项练习',

                word_count: item.word_count,
                grading_status: status,
                progress: progressMap[status] || 0,
                total_score: item.grading_result?.total_score ?? null,
                is_graded: item.is_graded,
                created_at: item.created_at,
                graded_at: item.graded_at,
            };
        });
    }

    /**
     * 获取批改报告
     */
    async getReport(answerId: string): Promise<UserAnswer | null> {
        const { data } = await this.db
            .from(this.table)
            .select('*, questions(*)')
            .eq('id', answerId)
            .single();

        if (data && data.questions) {
            // 将查询到的题目信息挂载到 UserAnswer 对象上，供前端使用
            (data as any).question = data.questions;
        }

        return data as UserAnswer | null;
    }

    /**
     * 删除批改记录
     */
    async deleteRecord(answerId: string): Promise<boolean> {
        const { error } = await this.db
            .from(this.table)
            .delete()
            .eq('id', answerId);

        if (error) {
            console.error('[GradingService] deleteRecord error:', error);
            return false;
        }

        return true;
    }

    /**
     * 润色文本
     */
    async polishText(
        content: string,
        questionType: string
    ): Promise<{ original: string; polished: string }> {
        const polished = await this.aiService.polishText(content, questionType);
        return { original: content, polished };
    }

    /**
     * 生成升格范文
     */
    async generateUpgradedVersion(
        userAnswer: string,
        questionTitle: string,
        referenceAnswer: string
    ): Promise<{ original: string; upgraded: string }> {
        const upgraded = await this.aiService.generateUpgradedVersion(
            userAnswer,
            questionTitle,
            referenceAnswer
        );
        return { original: userAnswer, upgraded };
    }

    // ============ 异步批改相关方法 ============

    /**
     * 异步提交答案 - 立即返回 answer_id，后台执行批改
     */
    async submitAnswerAsync(
        questionId: string,
        userContent: string,
        timeSpent?: number,
        userId?: string
    ): Promise<{ answer_id: string; status: string; message: string }> {
        const answerId = uuidv4();
        const wordCount = userContent.replace(/\s/g, '').length;
        const now = new Date().toISOString();

        // 创建待批改记录
        const pendingAnswer: UserAnswer = {
            id: answerId,
            user_id: userId,
            question_id: questionId,
            content: userContent,
            word_count: wordCount,
            time_spent: timeSpent,
            grading_result: null as any,  // 待批改
            is_graded: false,
            graded_at: null as any,
            created_at: now,
        };

        // 保存到数据库
        await this.db.from(this.table).insert({
            ...pendingAnswer,
            grading_status: 'pending',  // 新增状态字段
            grading_error: null,
        });

        // 在后台异步执行批改
        this.processGradingInBackground(answerId, questionId, userContent).catch(err => {
            console.error(`[GradingService] Background grading failed for ${answerId}:`, err);
        });

        return {
            answer_id: answerId,
            status: 'pending',
            message: '答案已提交，正在后台批改中，请稍后在批改记录中查看结果'
        };
    }

    /**
     * 后台执行批改
     */
    private async processGradingInBackground(
        answerId: string,
        questionId: string,
        userContent: string
    ): Promise<void> {
        const start = Date.now();
        console.log(`[Perf] Start background grading for answer=${answerId}`);

        try {
            // 更新状态为处理中
            await this.db.from(this.table)
                .update({ grading_status: 'processing' })
                .eq('id', answerId);

            // 1. 获取题目
            const { data: question, error: qErr } = await this.db
                .from('questions')
                .select('*')
                .eq('id', questionId)
                .single();

            if (qErr || !question) {
                throw new Error(`题目不存在: ${qErr?.message || 'Not found'}`);
            }

            // 2. 获取标准答案
            const { data: answer, error: aErr } = await this.db
                .from('standard_answers')
                .select('*')
                .eq('question_id', questionId)
                .single();

            if (aErr || !answer) {
                throw new Error(`该题目暂无标准答案，无法批改: ${aErr?.message || 'Not found'}`);
            }

            // 3. 执行批改
            const gradingResult = await this.gradingEngine.grade(
                question as Question,
                answer as StandardAnswer,
                userContent
            );

            // 4. 更新数据库记录
            await this.db.from(this.table)
                .update({
                    grading_result: gradingResult,
                    is_graded: true,
                    graded_at: new Date().toISOString(),
                    grading_status: 'completed',
                    grading_error: null,
                })
                .eq('id', answerId);

            console.log(`[Perf] Background grading completed for ${answerId} in ${Date.now() - start}ms`);

        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            const errorStack = error?.stack || '';
            console.error(`[GradingService] Grading error for ${answerId}:`, errorMessage);
            console.error(`[GradingService] Stack trace:`, errorStack);

            // 更新错误状态到数据库
            await this.db.from(this.table)
                .update({
                    grading_status: 'error',
                    grading_error: JSON.stringify({
                        message: errorMessage,
                        stack: errorStack,
                        timestamp: new Date().toISOString(),
                    }),
                })
                .eq('id', answerId);
        }
    }

    /**
     * 获取批改状态
     */
    async getGradingStatus(answerId: string): Promise<{
        status: 'pending' | 'processing' | 'completed' | 'error';
        progress: number;
        message: string;
        result?: GradingResult;
        error?: string;
    }> {
        const { data, error } = await this.db
            .from(this.table)
            .select('grading_status, grading_result, grading_error, is_graded')
            .eq('id', answerId)
            .single();

        if (error || !data) {
            return {
                status: 'error',
                progress: 0,
                message: '找不到该批改记录',
                error: error?.message || 'Not found'
            };
        }

        const status = data.grading_status || (data.is_graded ? 'completed' : 'pending');

        const statusMap: Record<string, { progress: number; message: string }> = {
            'pending': { progress: 10, message: '等待处理中...' },
            'processing': { progress: 50, message: 'AI 正在批改中...' },
            'completed': { progress: 100, message: '批改完成' },
            'error': { progress: 0, message: '批改出错' },
        };

        const { progress, message } = statusMap[status] || statusMap['pending'];

        return {
            status,
            progress,
            message,
            result: status === 'completed' ? data.grading_result : undefined,
            error: status === 'error' ? JSON.parse(data.grading_error || '{}')?.message : undefined,
        };
    }
}
