/**
 * 题目相关类型定义
 */
import { z } from 'zod';

// 题型枚举
export const QuestionType = z.enum([
    '归纳概括',
    '提出对策',
    '综合分析',
    '贯彻执行',
    '申发论述'
]);
export type QuestionType = z.infer<typeof QuestionType>;

// 考试类型枚举
export const ExamType = z.enum(['国考', '省考', '事业单位', '选调生', '其他']);
export type ExamType = z.infer<typeof ExamType>;

export interface Question {
    id: string;
    exam_id?: string;              // 关联试卷
    year: number;
    exam_type: ExamType;
    exam_level?: string;
    region?: string;
    question_number: number;
    question_type: QuestionType;
    title: string;
    material_refs: string[];
    materials_content?: string;
    word_limit?: number;
    score: number;
    difficulty: number;
    tags: string[];
    scoring_criteria?: string[];   // 踩分点/评分标准
    created_at: string;
    updated_at: string;
}

export const CreateQuestionSchema = z.object({
    exam_id: z.string().uuid().optional(),
    year: z.number().min(2000).max(2100),
    exam_type: ExamType,
    exam_level: z.string().optional(),
    region: z.string().optional(),
    question_number: z.number().min(1),
    question_type: QuestionType,
    title: z.string().min(1),
    material_refs: z.array(z.string()).default([]),
    materials_content: z.string().optional(),
    word_limit: z.number().optional(),
    score: z.number().default(10),
    difficulty: z.number().min(1).max(5).default(3),
    tags: z.array(z.string()).default([]),
    scoring_criteria: z.array(z.string()).optional(),
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
