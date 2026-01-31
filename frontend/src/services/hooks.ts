/**
 * React Hooks for API calls
 */
import { useState, useEffect, useCallback } from 'react'
import { questionApi, gradingApi, materialApi } from './api'
import type { Question, UserAnswer, Material, GradingHistoryItem } from './api'

// 题目列表 Hook
export function useQuestions(filters?: {
    year?: number
    exam_type?: string
    question_type?: string
}) {
    const [questions, setQuestions] = useState<Question[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchQuestions = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await questionApi.list(filters)
            setQuestions(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取题目失败')
            // 使用本地数据作为降级
            setQuestions([])
        } finally {
            setLoading(false)
        }
    }, [filters?.year, filters?.exam_type, filters?.question_type])

    useEffect(() => {
        fetchQuestions()
    }, [fetchQuestions])

    return { questions, loading, error, refetch: fetchQuestions }
}

// 单个题目 Hook
export function useQuestion(id: string) {
    const [question, setQuestion] = useState<Question | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!id) return

        const fetchQuestion = async () => {
            try {
                setLoading(true)
                const data = await questionApi.get(id)
                setQuestion(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : '获取题目失败')
            } finally {
                setLoading(false)
            }
        }

        fetchQuestion()
    }, [id])

    return { question, loading, error }
}

// 批改提交 Hook
export function useGrading() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<UserAnswer | null>(null)
    const [asyncStatus, setAsyncStatus] = useState<{
        answerId: string | null
        status: 'idle' | 'pending' | 'processing' | 'completed' | 'error'
        progress: number
        message: string
        error?: string
    }>({
        answerId: null,
        status: 'idle',
        progress: 0,
        message: ''
    })

    const submitAnswer = async (
        questionId: string,
        content: string,
        timeSpent?: number
    ) => {
        try {
            setLoading(true)
            setError(null)
            const data = await gradingApi.submit({
                question_id: questionId,
                content,
                time_spent: timeSpent,
            })
            setResult(data)
            return data
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '批改失败'
            setError(errorMessage)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // 异步提交答案 - 立即返回，后台批改
    const submitAnswerAsync = async (
        questionId: string,
        content: string,
        timeSpent?: number
    ) => {
        try {
            setLoading(true)
            setError(null)
            const data = await gradingApi.submitAsync({
                question_id: questionId,
                content,
                time_spent: timeSpent,
            })

            setAsyncStatus({
                answerId: data.answer_id,
                status: 'pending',
                progress: 10,
                message: data.message
            })

            return data
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '提交失败'
            setError(errorMessage)
            setAsyncStatus(prev => ({
                ...prev,
                status: 'error',
                progress: 0,
                message: '提交失败',
                error: errorMessage
            }))
            throw err
        } finally {
            setLoading(false)
        }
    }

    // 轮询批改状态
    const pollGradingStatus = async (answerId: string, onComplete?: (result: any) => void) => {
        let attempts = 0
        const maxAttempts = 60 // 最多轮询60次（约2分钟）
        const interval = 2000 // 每2秒轮询一次

        const poll = async () => {
            if (attempts >= maxAttempts) {
                setAsyncStatus(prev => ({
                    ...prev,
                    status: 'error',
                    message: '批改超时，请稍后在批改记录中查看'
                }))
                return
            }

            try {
                const status = await gradingApi.getStatus(answerId)

                setAsyncStatus({
                    answerId,
                    status: status.status,
                    progress: status.progress,
                    message: status.message,
                    error: status.error
                })

                if (status.status === 'completed' && status.result) {
                    if (onComplete) {
                        onComplete(status.result)
                    }
                    return
                }

                if (status.status === 'error') {
                    return
                }

                // 继续轮询
                attempts++
                setTimeout(poll, interval)
            } catch (err) {
                console.error('轮询状态失败:', err)
                attempts++
                setTimeout(poll, interval)
            }
        }

        poll()
    }

    // 重置异步状态
    const resetAsyncStatus = () => {
        setAsyncStatus({
            answerId: null,
            status: 'idle',
            progress: 0,
            message: ''
        })
    }

    const polishText = async (content: string, questionType: string) => {
        try {
            setLoading(true)
            const data = await gradingApi.polish(content, questionType)
            return data.polished
        } catch (err) {
            throw err
        } finally {
            setLoading(false)
        }
    }

    return {
        loading,
        error,
        result,
        asyncStatus,
        submitAnswer,
        submitAnswerAsync,
        pollGradingStatus,
        resetAsyncStatus,
        polishText,
        clearError: () => setError(null),
    }
}

// 题库统计 Hook
export function useQuestionStats() {
    const [stats, setStats] = useState<{
        total: number
        by_year: Record<string, number>
        by_type: Record<string, number>
        by_exam_type: Record<string, number>
    } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await questionApi.stats()
                setStats(data)
            } catch {
                // 使用默认值
                setStats({ total: 0, by_year: {}, by_type: {}, by_exam_type: {} })
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    return { stats, loading }
}

// 素材列表 Hook
export function useMaterials(params?: {
    category?: string
    query?: string
    is_favorite?: boolean
}) {
    const [materials, setMaterials] = useState<Material[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchMaterials = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await materialApi.list(params)
            setMaterials(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取素材失败')
            setMaterials([])
        } finally {
            setLoading(false)
        }
    }, [params?.category, params?.query, params?.is_favorite])

    useEffect(() => {
        fetchMaterials()
    }, [fetchMaterials])

    const toggleFavorite = async (id: string, currentStatus: boolean) => {
        try {
            const updated = await materialApi.toggleFavorite(id, !currentStatus)
            setMaterials(prev => prev.map(m => m.id === id ? updated : m))
            return updated
        } catch (err) {
            setError(err instanceof Error ? err.message : '更新收藏状态失败')
            throw err
        }
    }

    return { materials, loading, error, refetch: fetchMaterials, toggleFavorite }
}

// 素材统计 Hook
export function useMaterialStats() {
    const [stats, setStats] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true)
            const data = await materialApi.stats()
            setStats(data)
        } catch {
            setStats({ '全部': 0 })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    return { stats, loading, refetch: fetchStats }
}

// 素材管理 Hook (用于后台)
export function useMaterialAdmin() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const createMaterial = async (data: Partial<Material>) => {
        try {
            setLoading(true)
            setError(null)
            return await materialApi.create(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '创建素材失败')
            throw err
        } finally {
            setLoading(false)
        }
    }

    const updateMaterial = async (id: string, data: Partial<Material>) => {
        try {
            setLoading(true)
            setError(null)
            return await materialApi.update(id, data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '更新素材失败')
            throw err
        } finally {
            setLoading(false)
        }
    }

    const deleteMaterial = async (id: string) => {
        try {
            setLoading(true)
            setError(null)
            return await materialApi.delete(id)
        } catch (err) {
            setError(err instanceof Error ? err.message : '删除素材失败')
            throw err
        } finally {
            setLoading(false)
        }
    }

    return { createMaterial, updateMaterial, deleteMaterial, loading, error }
}

// 题目管理 Hook (用于后台)
export function useQuestionAdmin() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const createQuestion = async (data: Partial<Question>) => {
        try {
            setLoading(true)
            setError(null)
            return await questionApi.create(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '创建题目失败')
            throw err
        } finally {
            setLoading(false)
        }
    }

    const updateQuestion = async (id: string, data: Partial<Question>) => {
        try {
            setLoading(true)
            setError(null)
            return await questionApi.update(id, data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '更新题目失败')
            throw err
        } finally {
            setLoading(false)
        }
    }

    const deleteQuestion = async (id: string) => {
        try {
            setLoading(true)
            setError(null)
            return await questionApi.delete(id)
        } catch (err) {
            setError(err instanceof Error ? err.message : '删除题目失败')
            throw err
        } finally {
            setLoading(false)
        }
    }

    const uploadPackage = async (data: any) => {
        try {
            setLoading(true)
            setError(null)
            return await questionApi.uploadPackage(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '上传试卷失败')
            throw err
        } finally {
            setLoading(false)
        }
    }

    return { createQuestion, updateQuestion, deleteQuestion, uploadPackage, loading, error }
}

// 获取所有用户的练习历史（管理员专用）
export function useAllHistory() {
    const [history, setHistory] = useState<UserAnswer[]>([])
    const [loading, setLoading] = useState(false)

    const fetchHistory = async () => {
        try {
            setLoading(true)
            const data = await gradingApi.allHistory()
            setHistory(data)
        } catch (err) {
            // 静默处理 - 非管理员不需要看到这个错误
            console.debug('获取练习历史失败 (需要管理员权限):', err)
            setHistory([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // 只有当存在管理员令牌时才尝试获取
        const adminToken = localStorage.getItem('admin_token')
        if (adminToken) {
            fetchHistory()
        }
    }, [])

    return { history, loading, refetch: fetchHistory }
}

// 用户学习统计 Hook
// 从真实 API 获取批改历史
export function useUserStats() {
    const [stats, setStats] = useState<{
        total_count: number
        avg_score_rate: number
        continuous_days: number
        history: GradingHistoryItem[]
    }>({
        total_count: 0,
        avg_score_rate: 0,
        continuous_days: 0,
        history: []
    })
    const [loading, setLoading] = useState(true)

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true)
            const history = await gradingApi.myHistory(20)

            const completedItems = history.filter(h => h.is_graded && h.total_score !== null)
            const totalCount = history.length
            const totalScoreRate = completedItems.reduce((acc, curr) => {
                const scoreRate = curr.total_score && curr.max_score
                    ? curr.total_score / curr.max_score
                    : 0
                return acc + scoreRate
            }, 0)

            setStats({
                total_count: totalCount,
                avg_score_rate: completedItems.length > 0 ? (totalScoreRate / completedItems.length) : 0,
                continuous_days: totalCount > 0 ? 1 : 0,
                history: history
            })
        } catch (err) {
            console.error('获取批改历史失败:', err)
            // 保持默认空状态
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    return { stats, loading, refetch: fetchStats }
}
