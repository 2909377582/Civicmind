/**
 * 标准答案与采分点类型定义
 */
import { z } from 'zod';

// 采分点
export interface ScoringPoint {
    id?: string;
    point_order: number;
    content: string;
    score: number;
    keywords: string[];
    synonyms: string[];
    must_contain: string[];
    semantic_threshold: number;
    material_ref?: string;
}

// 标准答案
export interface StandardAnswer {
    id: string;
    question_id: string;
    full_answer: string;
    scoring_points: ScoringPoint[];
    source_type: 'official' | 'expert' | 'user';
    source_name?: string;
    created_at: string;
    updated_at: string;
}

// 采分点验证
export const ScoringPointSchema = z.object({
    point_order: z.number().min(1),
    content: z.string().min(1),
    score: z.number().min(0),
    keywords: z.array(z.string()).default([]),
    synonyms: z.array(z.string()).default([]),
    must_contain: z.array(z.string()).default([]),
    semantic_threshold: z.number().min(0).max(1).default(0.7),
    material_ref: z.string().optional(),
});

// 创建答案请求验证
export const CreateAnswerSchema = z.object({
    question_id: z.string().uuid(),
    full_answer: z.string().min(1),
    scoring_points: z.array(ScoringPointSchema),
    source_type: z.enum(['official', 'expert', 'user']).default('expert'),
    source_name: z.string().optional(),
});

export type CreateAnswerInput = z.infer<typeof CreateAnswerSchema>;
