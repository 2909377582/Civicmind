/**
 * 题库服务
 */
import { getSupabase } from '../utils/supabase';
import { Question, CreateQuestionInput } from '../models/Question';
import { v4 as uuidv4 } from 'uuid';

export class QuestionService {
    private db = getSupabase();
    private table = 'questions';

    /**
     * 获取题目列表
     */
    async getList(
        filters: {
            year?: number;
            exam_type?: string;
            question_type?: string;
        } = {},
        limit: number = 50
    ): Promise<Question[]> {
        let query = this.db.from(this.table).select('*');

        if (filters.year) {
            query = query.eq('year', filters.year);
        }
        if (filters.exam_type) {
            query = query.eq('exam_type', filters.exam_type);
        }
        if (filters.question_type) {
            query = query.eq('question_type', filters.question_type);
        }

        const { data } = await query.order('created_at', { ascending: false }).limit(limit);
        return (data || []) as Question[];
    }

    /**
     * 获取单个题目
     */
    async getById(id: string): Promise<Question | null> {
        const { data } = await this.db.from(this.table).select('*').eq('id', id).single();
        return data as Question | null;
    }

    /**
     * 创建题目
     */
    async create(input: CreateQuestionInput): Promise<Question> {
        const question = {
            id: uuidv4(),
            ...input,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        await this.db.from(this.table).insert(question);
        return question as Question;
    }

    /**
     * 更新题目
     */
    async update(id: string, input: Partial<CreateQuestionInput>): Promise<Question | null> {
        const { data } = await this.db
            .from(this.table)
            .update({
                ...input,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        return data as Question | null;
    }

    /**
     * 删除题目
     */
    async delete(id: string): Promise<boolean> {
        const { error } = await this.db.from(this.table).delete().eq('id', id);
        return !error;
    }

    /**
     * 根据试卷ID获取所有题目
     */
    async getByExamId(examId: string): Promise<Question[]> {
        const { data } = await this.db
            .from(this.table)
            .select('*')
            .eq('exam_id', examId)
            .order('question_number', { ascending: true });
        return (data || []) as Question[];
    }

    /**
     * 删除试卷下的所有题目
     */
    async deleteByExamId(examId: string): Promise<boolean> {
        const { error } = await this.db.from(this.table).delete().eq('exam_id', examId);
        return !error;
    }

    /**
     * 统计数量
     */
    async count(): Promise<number> {
        const { count } = await this.db.from(this.table).select('*', { count: 'exact', head: true });
        return count || 0;
    }

    /**
     * 获取题目统计信息
     */
    async getStats(): Promise<{
        total: number;
        by_year: Record<string, number>;
        by_type: Record<string, number>;
        by_exam_type: Record<string, number>;
    }> {
        const { data } = await this.db.from(this.table).select('year, question_type, exam_type');
        const questions = data || [];

        const by_year: Record<string, number> = {};
        const by_type: Record<string, number> = {};
        const by_exam_type: Record<string, number> = {};

        for (const q of questions) {
            // 按年份统计
            const year = String(q.year || '未知');
            by_year[year] = (by_year[year] || 0) + 1;

            // 按题型统计
            const qtype = q.question_type || '未知';
            by_type[qtype] = (by_type[qtype] || 0) + 1;

            // 按考试类型统计
            const etype = q.exam_type || '未知';
            by_exam_type[etype] = (by_exam_type[etype] || 0) + 1;
        }

        return {
            total: questions.length,
            by_year,
            by_type,
            by_exam_type,
        };
    }
}
