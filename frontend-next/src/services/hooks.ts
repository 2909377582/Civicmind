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

    const toggleFavorite = async (id: string, isFavorite: boolean) => {
        try {
            // Optimistic update
            setMaterials(prev => prev.map(m =>
                m.id === id ? { ...m, is_favorite: !isFavorite } : m
            ))
            await materialApi.toggleFavorite(id, !isFavorite)
        } catch (err) {
            console.error('Toggle favorite failed:', err)
            // Revert on error
            setMaterials(prev => prev.map(m =>
                m.id === id ? { ...m, is_favorite: isFavorite } : m
            ))
            throw err
        }
    }

    return { materials, loading, error, refetch: fetchMaterials, toggleFavorite }
}

// 素材统计 Hook
export function useMaterialStats() {
    const [stats, setStats] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)

    const fetchStats = async () => {
        try {
            setLoading(true)
            const data = await materialApi.stats()
            setStats(data)
        } catch (err) {
            console.error('获取素材统计失败:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    return { stats, loading, refetch: fetchStats }
}
