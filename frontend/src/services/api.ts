/**
 * API 服务层
 * 封装所有后端 API 调用
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api/v1'

// 通用请求方法
async function request<T>(
    endpoint: string,
    options: RequestInit & { timeout?: number } = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`

    // 如果 body 是 FormData，不要设置 Content-Type，让浏览器自动处理
    const isFormData = options.body instanceof FormData;
    const { retries = 2, retryDelay = 1000, ...fetchOptions } = options as any;

    let lastError;
    for (let i = 0; i < retries + 1; i++) {
        try {
            // 支持超时设置
            let signal = fetchOptions.signal;
            let controller: AbortController | null = null;

            if (!signal && fetchOptions.timeout) {
                controller = new AbortController();
                // 确保 timeout 是数字
                const timeoutMs = Number(fetchOptions.timeout);
                if (!isNaN(timeoutMs)) {
                    setTimeout(() => controller?.abort(), timeoutMs);
                    // 请求完成后清除 timeout
                    // 注意：这里无法直接清除，只能依赖 fetch完成或失败
                }
                signal = controller.signal;
            }

            const config: RequestInit = {
                ...fetchOptions,
                signal,
                headers: {
                    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                    ...(fetchOptions.headers || {}),
                },
            };

            const response = await fetch(url, config);

            if (!response.ok) {
                // 如果是 4xx 错误（除 429 外），通常不需要重试（客户端错误）
                if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.detail || `请求失败: ${response.status}`);
                }
                // 5xx 或 429 错误，抛出以触发重试
                throw new Error(`请求失败: ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            lastError = err;
            const isAbort = err instanceof DOMException && err.name === 'AbortError';
            // 如果是中止错误（超时），或者已经重试完了，就退出
            if (isAbort || i === retries) break;

            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1))); // 指数退避略微增加
            console.warn(`API Request failed, retrying (${i + 1}/${retries})...`, err);
        }
    }

    throw lastError;
}

// 题目相关 API
export const questionApi = {
    // 获取题目列表
    list: (params?: {
        year?: number
        exam_type?: string
        question_type?: string
        skip?: number
        limit?: number
    }) => {
        const searchParams = new URLSearchParams()
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    searchParams.append(key, String(value))
                }
            })
        }
        const query = searchParams.toString()
        return request<Question[]>(`/questions${query ? `?${query}` : ''}`)
    },

    // 获取题目详情
    get: (id: string) => request<Question>(`/questions/${id}`),

    // 创建题目
    create: (data: Partial<Question>) =>
        request<Question>('/questions', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 更新题目
    update: (id: string, data: Partial<Question>) =>
        request<Question>(`/questions/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    // 删除题目
    delete: (id: string) =>
        questionApi.adminRequest<{ success: boolean }>(`/questions/${id}`, {
            method: 'DELETE',
        }),

    // 获取题单统计
    stats: () => request<QuestionStats>('/questions/stats/summary'),

    // 管理员：一站式上传题目包
    uploadPackage: (data: any) =>
        questionApi.adminRequest<any>('/questions/upload-package', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 上传 PDF 解析
    parsePdf: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return questionApi.adminRequest<any>('/questions/parse-pdf', {
            method: 'POST',
            body: formData,
            headers: {} // 不要设置 Content-Type，让浏览器自动设置
        });
    },

    // 注入管理员令牌进行请求
    adminRequest: <T>(endpoint: string, options: RequestInit & { timeout?: number } = {}) =>
        request<T>(endpoint, {
            ...options,
            headers: {
                ...(options.headers || {}),
                'X-Admin-Token': localStorage.getItem('admin_token') || '',
            }
        }),

    // Generate scoring points
    generateScoringPoints: async (title: string, reference_answer: string) => {
        const response = await fetch(`${API_BASE_URL}/questions/generate-scoring-points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': localStorage.getItem('admin_token') || '',
            },
            body: JSON.stringify({ title, reference_answer })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `请求失败: ${response.status}`);
        }
        return response.json();
    }
}

// 批改相关 API
export const gradingApi = {
    // 提交作答并批改（同步，等待结果）
    submit: (data: {
        question_id: string
        content: string
        time_spent?: number
    }) =>
        request<UserAnswer>('/grading/submit', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 异步提交作答（立即返回，后台批改）
    submitAsync: (data: {
        question_id: string
        content: string
        time_spent?: number
    }) =>
        request<{ answer_id: string; status: string; message: string }>('/grading/submit-async', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 查询批改状态
    getStatus: (answerId: string) =>
        request<{
            status: 'pending' | 'processing' | 'completed' | 'error'
            progress: number
            message: string
            result?: GradingResult
            error?: string
        }>(`/grading/status/${answerId}`),


    // 语言润色
    polish: (content: string, question_type: string) =>
        request<{ original: string; polished: string }>('/grading/polish', {
            method: 'POST',
            body: JSON.stringify({ content, question_type }),
        }),

    // 生成升格范文
    upgrade: (data: {
        user_answer: string
        question_title: string
        reference_answer: string
    }) =>
        request<{ original: string; upgraded: string }>('/grading/upgrade', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 获取批改历史
    history: (questionId: string, limit = 10) =>
        request<UserAnswer[]>(`/grading/history/${questionId}?limit=${limit}`),

    // 获取所有用户的练习历史（管理员专用）
    allHistory: (limit = 50) =>
        questionApi.adminRequest<UserAnswer[]>(`/grading/all-history?limit=${limit}`),

    // 获取批改报告
    report: (answerId: string) =>
        request<UserAnswer>(`/grading/report/${answerId}`),

    // 获取用户自己的批改历史（公开API，无需认证）
    myHistory: (limit = 20) =>
        request<GradingHistoryItem[]>(`/grading/my-history?limit=${limit}`),

    // 删除批改记录
    deleteRecord: (answerId: string) =>
        request<{ success: boolean }>(`/grading/record/${answerId}`, {
            method: 'DELETE',
        }),
}

// 标准答案相关 API
export const answerApi = {
    // 获取题目的标准答案
    get: (questionId: string) =>
        request<StandardAnswer>(`/answers/${questionId}`),

    // 创建标准答案
    create: (data: Partial<StandardAnswer>) =>
        request<StandardAnswer>('/answers', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
}

// 素材相关 API
export const materialApi = {
    // 获取素材列表
    list: (params?: {
        category?: string
        query?: string
        is_favorite?: boolean
        skip?: number
        limit?: number
    }) => {
        const searchParams = new URLSearchParams()
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, String(value))
                }
            })
        }
        const query = searchParams.toString()
        return request<Material[]>(`/materials${query ? `?${query}` : ''}`)
    },

    // 切换收藏状态
    toggleFavorite: (id: string, isFavorite: boolean) =>
        request<Material>(`/materials/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ is_favorite: isFavorite }),
        }),

    // 创建素材
    create: (data: Partial<Material>) =>
        questionApi.adminRequest<Material>('/materials', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 更新素材
    update: (id: string, data: Partial<Material>) =>
        questionApi.adminRequest<Material>(`/materials/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    // 删除素材
    delete: (id: string) =>
        questionApi.adminRequest<{ success: boolean }>(`/materials/${id}`, {
            method: 'DELETE',
        }),

    // 上传 PDF 解析
    parsePdf: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return questionApi.adminRequest<any>('/materials/parse-pdf', {
            method: 'POST',
            body: formData,
            headers: {} // 不要设置 Content-Type，让浏览器自动设置
        });
    },

    // 获取素材统计
    stats: () => request<Record<string, number>>('/materials/stats'),
}

// 试卷相关 API
export const examApi = {
    // 获取试卷列表（按年份分组）
    list: () => request<ExamsByYear[]>('/exams'),

    // 获取所有年份
    years: () => request<number[]>('/exams/years'),

    // 按年份获取试卷
    byYear: (year: number, examType?: string) => {
        const params = examType ? `?exam_type=${examType}` : ''
        return request<Exam[]>(`/exams/by-year/${year}${params}`)
    },

    // 获取试卷详情
    get: (id: string) => request<Exam>(`/exams/${id}`),

    // 获取试卷的所有题目
    questions: (examId: string) => request<Question[]>(`/exams/${examId}/questions`),

    // 获取试卷统计
    stats: () => request<ExamStats>('/exams/stats/summary'),

    // ============ 管理员功能 ============

    // 管理员：解析试卷 PDF
    parsePdf: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return questionApi.adminRequest<ParsedExam>('/exams/parse-pdf', {
            method: 'POST',
            body: formData,
            headers: {}, // 让浏览器自动设置 Content-Type
            timeout: 300000 // 5分钟超时 (AI 解析可能很慢)
        });
    },

    // 管理员：解析试卷文本
    parseText: (content: string) =>
        questionApi.adminRequest<ParsedExam>('/exams/parse-text', {
            method: 'POST',
            body: JSON.stringify({ content }),
            timeout: 60000 // 1分钟超时
        }),

    // 管理员：审核通过并保存试卷
    approve: (parsedExam: ParsedExam) =>
        questionApi.adminRequest<{ success: boolean; exam_id: string; question_ids: string[]; message: string }>(
            '/exams/approve',
            {
                method: 'POST',
                body: JSON.stringify(parsedExam),
            }
        ),

    // 管理员：获取所有试卷列表（不分组）
    adminList: () => questionApi.adminRequest<Exam[]>('/exams/admin/list'),

    // 管理员：删除试卷
    delete: (id: string) =>
        questionApi.adminRequest<{ success: boolean }>(`/exams/${id}`, {
            method: 'DELETE',
        }),

    // 管理员：创建试卷
    create: (data: Partial<Exam>) =>
        questionApi.adminRequest<Exam>('/exams', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 管理员：更新试卷（包括题目）
    update: (id: string, data: ParsedExam) =>
        questionApi.adminRequest<{ success: boolean; message: string }>(`/exams/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    // 管理员：获取试卷详情（包括题目）
    getDetail: (id: string) =>
        questionApi.adminRequest<ParsedExam>(`/exams/${id}/detail`),
}

// 图片上传 API
export const uploadApi = {
    // 上传单张图片
    image: async (file: File): Promise<{ url: string }> => {
        const formData = new FormData()
        formData.append('image', file)
        return request('/upload/image', {
            method: 'POST',
            body: formData,
            headers: {},
        })
    },
    // 上传图片并进行OCR识别（用于手写答案）
    imageWithOCR: async (file: File): Promise<{ url: string; text: string }> => {
        const formData = new FormData()
        formData.append('image', file)
        return request('/upload/image-ocr', {
            method: 'POST',
            body: formData,
            headers: {},
        })
    },
}

// 类型定义
export interface Question {
    id: string
    exam_id?: string
    year: number
    exam_type: string
    exam_level?: string
    region?: string
    question_number: number
    question_type: string
    title: string
    material_refs: string[]
    materials_content?: string
    word_limit?: number
    score: number
    difficulty: number
    tags: string[]
    created_at: string
    updated_at: string
}

export interface QuestionStats {
    total: number
    by_year: Record<string, number>
    by_type: Record<string, number>
    by_exam_type: Record<string, number>
}


export interface ScoringPoint {
    id: string
    point_order: number
    content: string
    score: number
    keywords: string[]
    synonyms: string[]
    must_contain: string[]
    semantic_threshold: number
    material_ref?: string
}

export interface StandardAnswer {
    id: string
    question_id: string
    full_answer: string
    answer_outline?: string
    scoring_points: ScoringPoint[]
    source_type: 'official' | 'expert' | 'institution'
    source_name?: string
    analysis_approach?: string
    common_mistakes: string[]
    created_at: string
}

export interface PointMatch {
    point_id: string
    point_content: string
    matched: boolean
    matched_text?: string
    similarity_score: number
    score_earned: number
}

export interface ScoringDetail {
    point: string;
    score: number;
    earned: number;
    status: 'full' | 'partial' | 'missed';
    evidence: string;
    missing_keywords: string[];
}

export interface LogicAnalysis {
    user_logic_chain: string[];
    master_logic_chain: string[];
    gaps: string[];
    suggestions: string[];
}

export interface AIFeedback {
    overall_comment: string
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    polished_with_marks?: string  // 带标注的润色版本
    polished_clean?: string       // 干净的完整润色版本
    polished_version?: string     // 兼容旧API
    upgraded_version?: string
    sentence_upgrades: Array<{ original: string; upgraded: string; reason?: string }>
    scoring_details?: ScoringDetail[];
    logic_analysis?: LogicAnalysis;
}

export interface GradingResult {
    total_score: number
    max_score?: number
    content_score: number
    content_max_score?: number
    format_score: number
    format_max_score?: number
    language_score: number
    language_max_score?: number
    points_hit: number
    points_total: number
    hit_rate: number
    point_matches: PointMatch[]
    format_check?: {
        has_title: boolean
        has_salutation: boolean
        has_signature: boolean
        has_date: boolean
        format_errors: string[]
        format_score: number
    }
    language_analysis?: {
        oral_expressions: Array<{ original: string; suggestion: string }>
        redundant_expressions: string[]
        grammar_issues: string[]
        language_score: number
    }
    ai_feedback?: AIFeedback
}

export interface UserAnswer {
    id: string
    user_id?: string
    question_id: string
    content: string
    image_url?: string
    word_count: number
    time_spent?: number
    grading_result?: GradingResult
    is_graded: boolean
    created_at: string
    graded_at?: string
    // Extended fields for admin dashboard
    question_title?: string
    score?: number
}

// 批改历史记录项
export interface GradingHistoryItem {
    id: string
    question_id: string
    question_title: string
    question_type: string
    max_score: number
    exam_id?: string | null
    exam_title?: string | null
    word_count: number
    grading_status: 'pending' | 'processing' | 'completed' | 'error'
    progress: number
    total_score: number | null
    is_graded: boolean
    created_at: string
    graded_at: string | null
}

export interface Material {
    id: string
    category: string
    title: string
    content: string
    source: string
    tags: string[]
    is_favorite: boolean
    created_at: string
}

// 试卷相关类型
export interface Exam {
    id: string
    year: number
    exam_type: string
    exam_level?: string
    region?: string
    exam_name: string
    materials_content?: string
    total_score: number
    question_count?: number
    created_at: string
}

export interface ExamListItem {
    id: string
    year: number
    exam_type: string
    exam_level?: string
    exam_name: string
    question_count: number
    total_score: number
}

export interface ExamsByYear {
    year: number
    exams: ExamListItem[]
}

export interface ExamStats {
    total: number
    by_year: Record<number, number>
    by_type: Record<string, number>
}

export interface ParsedQuestion {
    question_number: number
    question_type: string
    title: string
    word_limit: number
    score: number
    material_refs?: string[]
    scoring_criteria?: string[]  // 踩分点/评分标准
    standard_answer?: {
        full_answer: string
        source_type?: 'official' | 'expert' | 'institution';
        analysis_approach?: string; // 解题思路/解析
        common_mistakes?: string[]; // 常见误区
        scoring_points: Array<{
            point_order: number
            content: string
            score: number
            keywords: string[]
        }>
    }
}

export interface ParsedExam {
    year: number
    exam_type: string
    exam_level?: string
    region?: string
    exam_name: string
    materials_content: string
    total_score: number
    questions: ParsedQuestion[]
}

