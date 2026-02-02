/**
 * API 服务层
 * 封装所有后端 API 调用
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000/api/v1'

// 获取认证 Token
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    const savedSession = localStorage.getItem('civicmind_session');
    if (!savedSession) return null;

    try {
        const session = JSON.parse(savedSession);
        if (session.expires_at && Date.now() / 1000 < session.expires_at) {
            return session.access_token;
        }
    } catch (e) {
        console.error('Failed to parse session:', e);
    }

    return null;
}

// 认证用户类型
export interface AuthUser {
    id: string;
    email: string;
    created_at?: string;
}

// 认证会话类型
export interface AuthSession {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

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
                }
                signal = controller.signal;
            }

            const authToken = getAuthToken();
            const config: RequestInit = {
                ...fetchOptions,
                signal,
                headers: {
                    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
                    ...(fetchOptions.headers || {}),
                },
            };

            const response = await fetch(url, config);

            if (!response.ok) {
                if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.detail || `请求失败: ${response.status}`);
                }
                throw new Error(`请求失败: ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            lastError = err;
            const isAbort = err instanceof DOMException && err.name === 'AbortError';
            if (isAbort || i === retries) break;

            await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
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
            headers: {}
        });
    },

    // 注入管理员令牌进行请求 (Client-side only)
    adminRequest: <T>(endpoint: string, options: RequestInit & { timeout?: number } = {}) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';
        return request<T>(endpoint, {
            ...options,
            headers: {
                ...(options.headers || {}),
                'X-Admin-Token': token,
            }
        })
    },

    // Generate scoring points
    generateScoringPoints: async (title: string, reference_answer: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';
        const response = await fetch(`${API_BASE_URL}/questions/generate-scoring-points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': token,
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
    submit: (data: {
        question_id: string
        content: string
        time_spent?: number
    }) =>
        request<UserAnswer>('/grading/submit', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    submitAsync: (data: {
        question_id: string
        content: string
        time_spent?: number
    }) =>
        request<{ answer_id: string; status: string; message: string }>('/grading/submit-async', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getStatus: (answerId: string) =>
        request<{
            status: 'pending' | 'processing' | 'completed' | 'error'
            progress: number
            message: string
            result?: GradingResult
            error?: string
        }>(`/grading/status/${answerId}`),

    polish: (content: string, question_type: string) =>
        request<{ original: string; polished: string }>('/grading/polish', {
            method: 'POST',
            body: JSON.stringify({ content, question_type }),
        }),

    upgrade: (data: {
        user_answer: string
        question_title: string
        reference_answer: string
    }) =>
        request<{ original: string; upgraded: string }>('/grading/upgrade', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    history: (questionId: string, limit = 10) =>
        request<UserAnswer[]>(`/grading/history/${questionId}?limit=${limit}`),

    allHistory: (limit = 50) =>
        questionApi.adminRequest<UserAnswer[]>(`/grading/all-history?limit=${limit}`),

    report: (answerId: string) =>
        request<UserAnswer>(`/grading/report/${answerId}`),

    myHistory: (limit = 20) =>
        request<GradingHistoryItem[]>(`/grading/my-history?limit=${limit}`),

    deleteRecord: (answerId: string) =>
        request<{ success: boolean }>(`/grading/record/${answerId}`, {
            method: 'DELETE',
        }),
}

// 标准答案相关 API
export const answerApi = {
    get: (questionId: string) =>
        request<StandardAnswer>(`/answers/${questionId}`),

    create: (data: Partial<StandardAnswer>) =>
        request<StandardAnswer>('/answers', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
}

// 素材相关 API
export const materialApi = {
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

    toggleFavorite: (id: string, isFavorite: boolean) =>
        request<Material>(`/materials/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ is_favorite: isFavorite }),
        }),

    create: (data: Partial<Material>) =>
        questionApi.adminRequest<Material>('/materials', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<Material>) =>
        questionApi.adminRequest<Material>(`/materials/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        questionApi.adminRequest<{ success: boolean }>(`/materials/${id}`, {
            method: 'DELETE',
        }),

    parsePdf: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return questionApi.adminRequest<any>('/materials/parse-pdf', {
            method: 'POST',
            body: formData,
            headers: {}
        });
    },

    stats: () => request<Record<string, number>>('/materials/stats'),
}

// 试卷相关 API
export const examApi = {
    list: () => request<ExamsByYear[]>('/exams'),
    years: () => request<number[]>('/exams/years'),
    byYear: (year: number, examType?: string) => {
        const params = examType ? `?exam_type=${examType}` : ''
        return request<Exam[]>(`/exams/by-year/${year}${params}`)
    },
    get: (id: string) => request<Exam>(`/exams/${id}`),
    questions: (examId: string) => request<Question[]>(`/exams/${examId}/questions`),
    stats: () => request<ExamStats>('/exams/stats/summary'),

    // 管理员功能
    parsePdf: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return questionApi.adminRequest<ParsedExam>('/exams/parse-pdf', {
            method: 'POST',
            body: formData,
            headers: {},
            timeout: 300000
        });
    },

    parseText: (content: string) =>
        questionApi.adminRequest<ParsedExam>('/exams/parse-text', {
            method: 'POST',
            body: JSON.stringify({ content }),
            timeout: 60000
        }),

    approve: (parsedExam: ParsedExam) =>
        questionApi.adminRequest<{ success: boolean; exam_id: string; question_ids: string[]; message: string }>(
            '/exams/approve',
            {
                method: 'POST',
                body: JSON.stringify(parsedExam),
            }
        ),

    adminList: () => questionApi.adminRequest<Exam[]>('/exams/admin/list'),

    delete: (id: string) =>
        questionApi.adminRequest<{ success: boolean }>(`/exams/${id}`, {
            method: 'DELETE',
        }),

    create: (data: Partial<Exam>) =>
        questionApi.adminRequest<Exam>('/exams', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: ParsedExam) =>
        questionApi.adminRequest<{ success: boolean; message: string }>(`/exams/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getDetail: (id: string) =>
        questionApi.adminRequest<ParsedExam>(`/exams/${id}/detail`),
}

// 图片上传 API
export const uploadApi = {
    image: async (file: File): Promise<{ url: string }> => {
        const formData = new FormData()
        formData.append('image', file)
        return request('/upload/image', {
            method: 'POST',
            body: formData,
            headers: {},
        })
    },
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

// Types
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
    polished_with_marks?: string
    polished_clean?: string
    polished_version?: string
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
    question_title?: string
    score?: number
}

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
    scoring_criteria?: string[]
    standard_answer?: {
        full_answer: string
        source_type?: 'official' | 'expert' | 'institution';
        analysis_approach?: string;
        common_mistakes?: string[];
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

// 认证相关 API
export const authApi = {
    // 用户注册
    register: (email: string, password: string) =>
        request<{
            message: string;
            user: AuthUser | null;
            session: AuthSession | null;
        }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    // 用户登录
    login: (email: string, password: string) =>
        request<{
            message: string;
            user: AuthUser | null;
            session: AuthSession | null;
        }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    // 用户登出
    logout: () =>
        request<{ message: string }>('/auth/logout', {
            method: 'POST',
        }),

    // 获取当前用户
    getCurrentUser: () =>
        request<{ user: AuthUser }>('/auth/me'),
}
