/**
 * 用户作答与批改结果类型定义
 */
import { z } from 'zod';

// 采分点匹配结果
export interface PointMatch {
    point_order: number;
    point_content: string;
    max_score: number;
    earned_score: number;
    is_matched: boolean;
    match_type: 'keyword' | 'semantic' | 'partial' | 'none';
    matched_text?: string;
    similarity_score?: number;
    feedback?: string;
}

// 格式检查结果
export interface FormatCheck {
    has_title: boolean;
    has_greeting: boolean;
    has_body: boolean;
    has_signature: boolean;
    format_score: number;
    issues: string[];
}

// 语言分析结果
export interface LanguageAnalysis {
    fluency_score: number;
    accuracy_score: number;
    professionalism_score: number;
    issues: string[];
    suggestions: string[];
}

// 结构分析结果
export interface StructureAnalysis {
    has_introduction: boolean;
    has_body: boolean;
    has_conclusion: boolean;
    paragraph_count: number;
    structure_score: number;
    issues: string[];
}

// 采分点匹配详情 (AI 生成)
export interface ScoringDetail {
    point: string;
    score: number;
    earned: number;
    status: 'full' | 'partial' | 'missed';
    evidence: string;
    missing_keywords: string[];
}

// 逻辑链条分析 (AI 生成)
export interface LogicAnalysis {
    user_logic_chain: string[];   // 用户逻辑链
    master_logic_chain: string[]; // 高手逻辑链
    gaps: string[];               // 逻辑断层
    suggestions: string[];        // 改进建议
}

// AI 综合反馈
export interface AIFeedback {
    overall_comment: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    score_explanation: string;
    scoring_details?: ScoringDetail[];
    logic_analysis?: LogicAnalysis;
    polished_version?: string;  // 兼容旧版
    polished_with_marks?: string;  // 带标注的润色版本
    polished_clean?: string;  // 干净的润色版本
    sentence_upgrades?: { original: string; upgraded: string; reason?: string }[];
}

// 批改结果
export interface GradingResult {
    total_score: number;
    max_score: number;
    content_score: number;
    content_max_score?: number;
    format_score: number;
    format_max_score?: number;
    language_score: number;
    language_max_score?: number;
    word_count: number;
    word_count_deduction: number;
    point_matches: PointMatch[];
    format_check?: FormatCheck;
    language_analysis?: LanguageAnalysis;
    structure_analysis?: StructureAnalysis;
    ai_feedback?: AIFeedback;
    points_hit: number;
    points_total: number;
    hit_rate: number;
}

// 用户作答记录
export interface UserAnswer {
    id: string;
    user_id?: string;
    question_id: string;
    content: string;
    image_url?: string;            // 图片作答 URL
    word_count: number;
    time_spent?: number;
    grading_result?: GradingResult;
    is_graded: boolean;
    graded_at?: string;
    created_at: string;
}

// 提交作答请求验证
export const SubmitAnswerSchema = z.object({
    question_id: z.string().uuid(),
    content: z.string().min(1, '请输入作答内容或上传图片'),
    image_url: z.string().optional(),
    time_spent: z.number().optional(),
});

export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;
