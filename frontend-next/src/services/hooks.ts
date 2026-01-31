/**
 * React Hooks for API calls
 */
import { useState, useEffect, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { questionApi, gradingApi, materialApi, examApi } from './api'
import type { Question, UserAnswer, Material, GradingHistoryItem, ExamsByYear } from './api'

// 题目列表 Hook
// 题目列表 Hook (SWR 版)
export function useQuestions(filters?: {
    year?: number
    exam_type?: string
    question_type?: string
}) {
    const key = ['questions', filters?.year, filters?.exam_type, filters?.question_type];

    const { data: questions = [], error, isLoading, mutate: refetch } = useSWR(
        key,
        () => questionApi.list(filters)
    );

    return {
        questions,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : '获取题目失败') : null,
        refetch
    }
}

// 单个题目 Hook
// 单个题目 Hook (SWR 版)
export function useQuestion(id: string) {
    const { data: question = null, error, isLoading } = useSWR(
        id ? `/questions/${id}` : null,
        () => questionApi.get(id)
    );

    return {
        question,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : '获取题目失败') : null
    }
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
// 素材列表 Hook (SWR 版)
export function useMaterials(params?: {
    category?: string
    query?: string
    is_favorite?: boolean
}, initialData: Material[] = []) {
    const key = ['materials', params?.category, params?.query, params?.is_favorite];

    const { data: materials = initialData, error, isLoading, mutate: refetch } = useSWR(
        key,
        () => materialApi.list(params),
        { fallbackData: initialData }
    );

    const toggleFavorite = async (id: string, isFavorite: boolean) => {
        try {
            // Optimistic update using mutate
            const updatedMaterials = materials.map(m =>
                m.id === id ? { ...m, is_favorite: !isFavorite } : m
            );

            mutate(key, updatedMaterials, false); // Update snapshot immediately
            await materialApi.toggleFavorite(id, !isFavorite);
            mutate(key); // Revalidate with real data
        } catch (err) {
            console.error('Toggle favorite failed:', err);
            mutate(key); // Revert on error
            throw err;
        }
    }

    return {
        materials,
        loading: isLoading,
        error: error ? (error instanceof Error ? error.message : '获取素材失败') : null,
        refetch,
        toggleFavorite
    }
}

// 素材统计 Hook
// 素材统计 Hook (SWR 版)
export function useMaterialStats() {
    const { data: stats = {}, error, isLoading, mutate: refetch } = useSWR(
        '/materials/stats',
        () => materialApi.stats()
    );

    return {
        stats,
        loading: isLoading,
        refetch
    }
}
