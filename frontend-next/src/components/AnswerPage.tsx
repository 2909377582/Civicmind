"use client";

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useGrading } from '@/services/hooks'
import { uploadImageWithProgress } from '@/utils/imageUpload'
import type { UploadProgress } from '@/utils/imageUpload'
import type { Question, Exam, UserAnswer, GradingResult } from '@/services/api'
import './AnswerPage.css'
import GradingLoadingOverlay from './GradingLoadingOverlay'

interface AnswerPageProps {
    initialQuestion: Question
    initialExam?: Exam | null
}

export default function AnswerPage({ initialQuestion, initialExam }: AnswerPageProps) {
    const router = useRouter()
    const { submitAnswerAsync, pollGradingStatus, asyncStatus, loading: isSubmitting, resetAsyncStatus } = useGrading()

    // State initialization
    const [question] = useState<Question>(initialQuestion)
    const [exam] = useState<Exam | null>(initialExam || null)

    const [content, setContent] = useState('')
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
    const [timeSpent, setTimeSpent] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [showMaterials, setShowMaterials] = useState(true)
    const [answerMode, setAnswerMode] = useState<'text' | 'image'>('text')
    const [showSubmitModal, setShowSubmitModal] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    // OCR 审核弹窗相关状态
    const [showOcrReviewModal, setShowOcrReviewModal] = useState(false)
    const [pendingOcrText, setPendingOcrText] = useState('')
    const [editableOcrText, setEditableOcrText] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const wordCount = content.replace(/\s/g, '').length
    const wordLimit = question.word_limit || 500
    const isOverLimit = wordCount > wordLimit

    // 获取材料内容（优先使用试卷材料，其次是题目自带材料）
    const materialsContent = exam?.materials_content || question.materials_content

    // 计时器
    useEffect(() => {
        if (isPaused) return
        const timer = setInterval(() => {
            setTimeSpent(prev => prev + 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [isPaused])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const handleBack = () => {
        if (exam) {
            router.push(`/exam/${exam.id}`)
        } else {
            router.back()
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 预览
        const reader = new FileReader()
        reader.onload = (e) => {
            setImagePreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)

        // 上传并OCR识别（带进度条）
        try {
            setUploadingImage(true)
            setUploadProgress({ stage: 'compressing', progress: 0, message: '准备中...' })

            const result = await uploadImageWithProgress(file, (progress) => {
                setUploadProgress(progress)
            })

            setImageUrl(result.url)

            // 如果OCR成功识别出文字，弹出审核弹窗让用户确认
            if (result.text && result.text.length > 10) {
                setPendingOcrText(result.text)
                setEditableOcrText(result.text)
                setShowOcrReviewModal(true)
                // 立即清除进度条
                setUploadProgress(null)
            } else {
                // OCR 识别失败或文字太少，提示用户
                setTimeout(() => setUploadProgress(null), 3000)
            }

        } catch (err: any) {
            console.error('图片上传失败:', err)
            // 错误消息已由 imageUpload.ts 设置，不需要再覆盖
            // 只需要在5秒后清除状态
            setTimeout(() => {
                setUploadProgress(null)
                setImagePreview(null)
            }, 5000)
        } finally {
            setUploadingImage(false)
        }
    }

    // OCR 审核确认：用户确认识别内容
    const handleOcrConfirm = () => {
        setContent(editableOcrText)
        setShowOcrReviewModal(false)
        setPendingOcrText('')
        setEditableOcrText('')
    }

    // OCR 审核取消：用户拒绝识别内容
    const handleOcrCancel = () => {
        setShowOcrReviewModal(false)
        setPendingOcrText('')
        setEditableOcrText('')
    }

    const handleRemoveImage = () => {
        setImageUrl(null)
        setImagePreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async () => {
        // 图片模式：如果有OCR识别的文字，优先使用文字；否则使用图片URL
        const answerContent = answerMode === 'image'
            ? (content.length > 10 ? content : `[图片作答] ${imageUrl}`)
            : content

        // 检查内容
        if (answerContent.length < 10 && !imageUrl) {
            alert('作答内容太少，请至少输入10个字')
            return
        }

        // 图片模式需要检查图片
        if (answerMode === 'image' && !imageUrl) {
            alert('请先上传作答图片')
            return
        }

        try {
            setSubmitError(null)
            setShowSubmitModal(true)

            // 使用异步提交
            const response = await submitAnswerAsync(question.id, answerContent, timeSpent)

            // 开始轮询状态
            pollGradingStatus(response.answer_id, (result) => {
                // 不再自动跳转，让用户在弹窗中点击“查看详细报告”
                console.log('Grading completed, waiting for user to click view report.');
            })
        } catch (err) {
            console.error('提交失败:', err)
            const errorMessage = err instanceof Error ? err.message : '提交失败，请稍后重试'
            setSubmitError(errorMessage)
        }
    }

    const handleCloseModal = () => {
        setShowSubmitModal(false)
        resetAsyncStatus()
        // Allow user to stay on page or go back?
        // Original behavior: onBack()
        handleBack()
    }

    return (
        <div className="answer-page">
            <div className="answer-header">
                <button className="back-btn" onClick={handleBack}>
                    <span>←</span> {exam ? '返回试卷' : '返回题库'}
                </button>
                <div className="timer-section">
                    <div className={`timer ${isPaused ? 'paused' : ''}`}>
                        <span className="timer-icon">⏱️</span>
                        <span className="timer-value">{formatTime(timeSpent)}</span>
                    </div>
                    <button
                        className="pause-btn"
                        onClick={() => setIsPaused(!isPaused)}
                    >
                        {isPaused ? '▶️ 继续' : '⏸️ 暂停'}
                    </button>
                </div>
            </div>

            <div className="answer-main">
                {/* 材料区域 */}
                {materialsContent && (
                    <div className={`materials-panel ${showMaterials ? 'expanded' : 'collapsed'}`}>
                        <div
                            className="materials-header"
                            onClick={() => setShowMaterials(!showMaterials)}
                        >
                            <h3>📄 给定资料</h3>
                            <span className="toggle-btn">
                                {showMaterials ? '收起 ▲' : '展开 ▼'}
                            </span>
                        </div>
                        {showMaterials && (
                            <div className="materials-body">
                                {materialsContent.split('\n').map((para, idx) => (
                                    <p key={idx}>{para}</p>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="answer-content">
                    <div className="question-panel">
                        <div className="question-header">
                            <span className="question-badge">
                                {question.year} {question.exam_type}
                            </span>
                            <span className="question-type-badge">
                                {question.question_type}
                            </span>
                        </div>
                        <h2 className="question-text">{question.title}</h2>
                        <div className="question-requirements">
                            <div className="requirement">
                                <span className="req-label">字数要求</span>
                                <span className="req-value">{question.word_limit}字以内</span>
                            </div>
                            <div className="requirement">
                                <span className="req-label">题目分值</span>
                                <span className="req-value">{question.score}分</span>
                            </div>
                        </div>
                    </div>

                    <div className="editor-panel">
                        {/* 作答模式切换 */}
                        <div className="mode-switcher">
                            <button
                                className={`mode-btn ${answerMode === 'text' ? 'active' : ''}`}
                                onClick={() => setAnswerMode('text')}
                            >
                                ✏️ 文字输入
                            </button>
                            <button
                                className={`mode-btn ${answerMode === 'image' ? 'active' : ''}`}
                                onClick={() => setAnswerMode('image')}
                            >
                                📷 拍照上传
                            </button>
                        </div>

                        {answerMode === 'text' ? (
                            <>
                                <div className="editor-header">
                                    <h3 className="editor-title">作答区域</h3>
                                    <div className="word-counter">
                                        <span className={`word-count ${isOverLimit ? 'over-limit' : ''}`}>
                                            {wordCount}
                                        </span>
                                        <span className="word-limit">/ {wordLimit} 字</span>
                                    </div>
                                </div>

                                <textarea
                                    ref={textareaRef}
                                    className={`editor-textarea ${isOverLimit ? 'over-limit' : ''}`}
                                    placeholder="请在此输入您的答案...

提示：
1. 仔细阅读题目要求，注意字数限制
2. 合理安排答题结构，分点作答
3. 语言要规范，避免口语化表达"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    disabled={isSubmitting}
                                />

                                <div className="editor-footer">
                                    <div className="editor-tips">
                                        <span className="tip-icon">💡</span>
                                        <span className="tip-text">
                                            {isOverLimit
                                                ? `已超出${wordCount - wordLimit}字，请精简内容`
                                                : `还可以输入${wordLimit - wordCount}字`
                                            }
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="image-upload-panel">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                />

                                {imagePreview ? (
                                    <div className="image-preview">
                                        <img src={imagePreview} alt="作答预览" />
                                        <button
                                            className="remove-image-btn"
                                            onClick={handleRemoveImage}
                                            disabled={uploadingImage}
                                        >
                                            ✕ 移除
                                        </button>
                                        {uploadProgress && (
                                            <div className={`upload-overlay ${uploadProgress.stage}`}>
                                                <div className="upload-progress-content">
                                                    <div className="progress-bar-container">
                                                        <div
                                                            className="progress-bar-fill"
                                                            style={{ width: `${uploadProgress.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="progress-text">
                                                        {uploadProgress.message}
                                                    </span>
                                                    {uploadProgress.stage !== 'completed' && uploadProgress.stage !== 'error' && (
                                                        <span className="progress-percent">
                                                            {uploadProgress.progress}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        className="upload-placeholder"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <span className="upload-icon">📷</span>
                                        <p className="upload-text">点击拍照或选择图片</p>
                                        <p className="upload-hint">支持 jpg, png, gif 格式</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="submit-section">
                            <button
                                className="btn-secondary"
                                onClick={() => {
                                    setContent('')
                                    handleRemoveImage()
                                }}
                                disabled={isSubmitting}
                            >
                                清空内容
                            </button>
                            <button
                                className="btn btn-primary submit-btn"
                                onClick={handleSubmit}
                                disabled={isSubmitting || (answerMode === 'text' && wordCount < 10) || (answerMode === 'image' && !imageUrl)}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading-spinner"></span>
                                        AI 批改中...
                                    </>
                                ) : (
                                    <>提交批改 ✨</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 提交状态模态框 - 使用新的智能进度条组件 */}
            <GradingLoadingOverlay
                isVisible={showSubmitModal}
                status={{
                    status: asyncStatus.status,
                    progress: asyncStatus.progress,
                    message: asyncStatus.message,
                    error: submitError || asyncStatus.error
                }}
                onClose={handleCloseModal}
                onViewResult={() => {
                    // 结果由 pollGradingStatus 自动处理跳转，或者手动触发
                    if (asyncStatus.answerId) {
                        router.push(`/report/${asyncStatus.answerId}`)
                    }
                }}
            />

            {/* OCR 审核弹窗 */}
            {showOcrReviewModal && (
                <div className="modal-overlay">
                    <div className="modal ocr-review-modal">
                        <div className="modal-header">
                            <h3>📝 识别结果审核</h3>
                            <button className="close-btn" onClick={handleOcrCancel}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p className="ocr-review-hint">
                                请检查以下识别内容，您可以直接编辑修正错误后提交：
                            </p>

                            <div className="ocr-review-content">
                                {/* 左侧：图片预览 */}
                                <div className="ocr-image-preview">
                                    <h4>📷 原图</h4>
                                    {imagePreview && (
                                        <img src={imagePreview} alt="上传的图片" />
                                    )}
                                </div>

                                {/* 右侧：识别文字 */}
                                <div className="ocr-text-edit">
                                    <h4>✍️ 识别文字（可编辑）</h4>
                                    <textarea
                                        value={editableOcrText}
                                        onChange={(e) => setEditableOcrText(e.target.value)}
                                        placeholder="识别的文字内容..."
                                        rows={12}
                                    />
                                    <div className="ocr-text-stats">
                                        已识别 {editableOcrText.replace(/\s/g, '').length} 字
                                        {pendingOcrText !== editableOcrText && (
                                            <span className="edited-badge">已编辑</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={handleOcrCancel}
                            >
                                取消
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleOcrConfirm}
                            >
                                ✅ 确认使用此内容
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
