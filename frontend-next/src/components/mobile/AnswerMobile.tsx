"use client";

import React from 'react';
import type { Question, Exam } from '@/services/api';
import './AnswerMobile.css';

interface AnswerMobileProps {
    question: Question;
    exam: Exam | null;
    content: string;
    setContent: (val: string) => void;
    timeSpent: number;
    formatTime: (sec: number) => string;
    isPaused: boolean;
    setIsPaused: (val: boolean) => void;
    answerMode: 'text' | 'image';
    setAnswerMode: (val: 'text' | 'image') => void;
    handleBack: () => void;
    handleSubmit: () => Promise<void>;
    isSubmitting: boolean;
    handleRemoveImage: () => void;
    imagePreview: string | null;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    fileInputRef: React.RefObject<HTMLInputElement>;
}

export default function AnswerMobile({
    question,
    exam,
    content,
    setContent,
    timeSpent,
    formatTime,
    isPaused,
    setIsPaused,
    answerMode,
    setAnswerMode,
    handleBack,
    handleSubmit,
    isSubmitting,
    handleRemoveImage,
    imagePreview,
    handleImageUpload,
    fileInputRef
}: AnswerMobileProps) {

    const wordCount = content.replace(/\s/g, '').length;
    const wordLimit = question.word_limit || 250;

    return (
        <div className="answer-mobile">
            {/* Header */}
            <header className="am-header">
                <button className="am-back-btn" onClick={handleBack}>
                    <span>←</span> 返回试卷
                </button>

                <div className="am-timer-card">
                    <span className="am-timer-icon">⏱️</span>
                    <span className="am-timer-value">{formatTime(timeSpent)}</span>
                </div>

                <button className="am-pause-btn" onClick={() => setIsPaused(!isPaused)}>
                    <span className="am-pause-icon">{isPaused ? '▶️' : '||'}</span>
                    <span>{isPaused ? '继续' : '暂停'}</span>
                </button>
            </header>

            {/* Question Card */}
            <div className="am-question-card">
                <div className="am-q-header">
                    <span className="am-badge am-badge-year">{question.year} {question.exam_type}</span>
                    <span className="am-badge am-badge-type">{question.question_type}</span>
                </div>

                <h1 className="am-q-title">{question.title}</h1>

                <div className="am-q-divider"></div>

                <div className="am-q-meta-grid">
                    <div className="am-meta-item">
                        <span className="am-meta-label">字数要求</span>
                        <span className="am-meta-value">{wordLimit}字以内</span>
                    </div>
                    <div className="am-meta-item">
                        <span className="am-meta-label">题目分值</span>
                        <span className="am-meta-value">{question.score}分</span>
                    </div>
                </div>
            </div>

            {/* Editor Card */}
            <div className="am-editor-card">
                <div className="am-mode-tabs">
                    <button
                        className={`am-mode-btn ${answerMode === 'text' ? 'active text-mode' : ''}`}
                        onClick={() => setAnswerMode('text')}
                    >
                        <span className="mode-icon">✏️</span> 文字输入
                    </button>
                    <button
                        className={`am-mode-btn ${answerMode === 'image' ? 'active' : ''}`}
                        onClick={() => setAnswerMode('image')}
                    >
                        <span className="mode-icon">📷</span> 拍照上传
                    </button>
                </div>

                {answerMode === 'text' ? (
                    <>
                        <div className="am-section-title-row">
                            <h3 className="am-section-title">作答区域</h3>
                            <div className="am-word-counter">
                                <span className="am-word-count-now">{wordCount}</span> / {wordLimit} 字
                            </div>
                        </div>

                        <div className="am-textarea-wrapper">
                            <textarea
                                className="am-textarea"
                                placeholder="请在此输入您的答案...&#10;&#10;提示：&#10;1. 仔细阅读题目要求，注意字数限制&#10;2. 合理安排答题结构，分点作答&#10;3. 语言要规范，避免口语化表达"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="am-tip-row">
                            <span className="am-tip-icon">💡</span>
                            <span>还可以输入 {Math.max(0, wordLimit - wordCount)} 字</span>
                        </div>
                    </>
                ) : (
                    <div className="am-image-upload-area">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />
                        {imagePreview ? (
                            <div className="am-image-preview-container">
                                <img src={imagePreview} className="am-image-preview" alt="预览" />
                                <button className="am-remove-img" onClick={handleRemoveImage}>✕ 移除</button>
                            </div>
                        ) : (
                            <div className="am-upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                                <div className="am-upload-icon">📷</div>
                                <p>点击拍照或上传作答图片</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="am-actions">
                    <button
                        className="am-btn-clear"
                        onClick={() => setContent('')}
                        disabled={isSubmitting}
                    >
                        清空内容
                    </button>
                    <button
                        className="am-btn-submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting || (answerMode === 'text' && wordCount < 10)}
                    >
                        {isSubmitting ? '正在提交...' : '提交批改 ✨'}
                    </button>
                </div>
            </div>
        </div>
    );
}
