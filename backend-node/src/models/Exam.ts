/**
 * 试卷相关类型定义
 */
import { z } from 'zod';

// 考试类型枚举
export const ExamTypeEnum = z.enum(['国考', '省考', '事业单位', '选调生', '其他']);
export type ExamTypeEnum = z.infer<typeof ExamTypeEnum>;

// 试卷模型
export interface Exam {
    id: string;
    year: number;
    exam_type: ExamTypeEnum;
    exam_level?: string;          // 副省级/地市级/乡镇
    region?: string;              // 地区（省考专用）
    exam_name: string;            // 完整名称
    materials_content?: string;   // 给定资料
    total_score: number;
    question_count?: number;      // 题目数量（计算字段）
    created_at: string;
}

// 创建试卷请求验证
export const CreateExamSchema = z.object({
    year: z.number().min(2000).max(2100),
    exam_type: ExamTypeEnum,
    exam_level: z.string().optional(),
    region: z.string().optional(),
    exam_name: z.string().min(1),
    materials_content: z.string().optional(),
    total_score: z.number().default(100),
});

export type CreateExamInput = z.infer<typeof CreateExamSchema>;

// 试卷列表项（用于展示）
export interface ExamListItem {
    id: string;
    year: number;
    exam_type: string;
    exam_level?: string;
    exam_name: string;
    question_count: number;
    total_score: number;
}

// 按年份分组的试卷
export interface ExamsByYear {
    year: number;
    exams: ExamListItem[];
}
