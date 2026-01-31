/**
 * 试卷服务
 */
import { getSupabase } from '../utils/supabase';
import { Exam, CreateExamInput, ExamListItem, ExamsByYear } from '../models/Exam';
import { v4 as uuidv4 } from 'uuid';

export class ExamService {
    private db = getSupabase();
    private table = 'exams';

    /**
     * 获取所有试卷（按年份分组）
     */
    async getListByYear(): Promise<ExamsByYear[]> {
        const { data: exams } = await this.db
            .from(this.table)
            .select('*')
            .order('year', { ascending: false });

        if (!exams || exams.length === 0) {
            return [];
        }

        // 获取每个试卷的题目数量
        const { data: questions } = await this.db
            .from('questions')
            .select('exam_id');

        const questionCounts: Record<string, number> = {};
        if (questions) {
            for (const q of questions) {
                if (q.exam_id) {
                    questionCounts[q.exam_id] = (questionCounts[q.exam_id] || 0) + 1;
                }
            }
        }

        // 按年份分组
        const grouped: Record<number, ExamListItem[]> = {};
        for (const exam of exams) {
            const year = exam.year;
            if (!grouped[year]) {
                grouped[year] = [];
            }
            grouped[year].push({
                id: exam.id,
                year: exam.year,
                exam_type: exam.exam_type,
                exam_level: exam.exam_level,
                exam_name: exam.exam_name,
                question_count: questionCounts[exam.id] || 0,
                total_score: exam.total_score,
            });
        }

        // 转换为数组
        return Object.entries(grouped)
            .map(([year, exams]) => ({
                year: parseInt(year),
                exams,
            }))
            .sort((a, b) => b.year - a.year);
    }

    /**
     * 获取所有年份列表
     */
    async getYears(): Promise<number[]> {
        const { data } = await this.db
            .from(this.table)
            .select('year')
            .order('year', { ascending: false });

        if (!data) return [];

        const years = [...new Set(data.map(d => d.year))];
        return years;
    }

    /**
     * 获取试卷详情（含材料和题目）
     */
    async getById(id: string): Promise<Exam | null> {
        const { data } = await this.db
            .from(this.table)
            .select('*')
            .eq('id', id)
            .single();

        return data as Exam | null;
    }

    /**
     * 获取试卷的所有题目
     */
    async getQuestions(examId: string): Promise<any[]> {
        const { data } = await this.db
            .from('questions')
            .select('*')
            .eq('exam_id', examId)
            .order('question_number', { ascending: true });

        return data || [];
    }

    /**
     * 创建试卷
     */
    async create(input: CreateExamInput): Promise<Exam> {
        const exam = {
            id: uuidv4(),
            ...input,
            created_at: new Date().toISOString(),
        };

        await this.db.from(this.table).insert(exam);
        return exam as Exam;
    }

    /**
     * 更新试卷
     */
    async update(id: string, input: Partial<CreateExamInput>): Promise<Exam | null> {
        const { data } = await this.db
            .from(this.table)
            .update(input)
            .eq('id', id)
            .select()
            .single();

        return data as Exam | null;
    }

    /**
     * 删除试卷（级联删除关联题目）
     */
    async delete(id: string): Promise<boolean> {
        // 先删除关联的题目
        const { error: questionsError } = await this.db
            .from('questions')
            .delete()
            .eq('exam_id', id);

        if (questionsError) {
            console.error('删除关联题目失败:', questionsError);
        }

        // 再删除试卷
        const { error } = await this.db.from(this.table).delete().eq('id', id);

        if (error) {
            console.error('删除试卷失败:', error);
            return false;
        }

        return true;
    }

    /**
     * 按年份和考试类型获取试卷
     */
    async getByYearAndType(year: number, examType?: string): Promise<Exam[]> {
        let query = this.db.from(this.table).select('*').eq('year', year);

        if (examType) {
            query = query.eq('exam_type', examType);
        }

        const { data } = await query.order('exam_name', { ascending: true });
        return (data || []) as Exam[];
    }
}
