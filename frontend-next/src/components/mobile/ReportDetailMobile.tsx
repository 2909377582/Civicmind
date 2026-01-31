"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, UserAnswer, GradingResult } from '@/services/api';
import PolishedText from '@/components/shared/PolishedText';
import './ReportDetailMobile.css';

interface ReportDetailMobileProps {
    result: UserAnswer;
    question: Question | null;
}

export default function ReportDetailMobile({ result, question }: ReportDetailMobileProps) {
    const router = useRouter();
    let gradingResult = result.grading_result as GradingResult;
    // 兼容旧数据结构
    if (!gradingResult && (result as any).total_score !== undefined) {
        gradingResult = result as unknown as GradingResult;
    }

    const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'polish'>('overview');

    if (!gradingResult && !(result as any).ai_feedback) {
        return (
            <div className="mobile-loading-state">
                <div className="mobile-spinner"></div>
                <p>正在生成评分报告...</p>
            </div>
        );
    }

    const maxScore = gradingResult.max_score || question?.score || 10;

    // 计算分数逻辑
    const scoringDetails = gradingResult.ai_feedback?.scoring_details || [];
    const calculatedContentScore = scoringDetails.reduce((sum: number, d: any) => sum + (d.earned || 0), 0);
    const contentScore = scoringDetails.length > 0 ? calculatedContentScore : (gradingResult.content_score || 0);
    const totalScore = contentScore;

    const scoreRatio = maxScore > 0 ? totalScore / maxScore : 0;

    const getScoreColor = (ratio: number) => {
        if (ratio >= 0.8) return '#10b981'; // Success
        if (ratio >= 0.6) return '#3b82f6'; // Primary
        if (ratio >= 0.4) return '#f59e0b'; // Warning
        return '#ef4444'; // Error
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <div className="report-mobile">
            {/* 顶部总分卡片 */}
            <div className="m-report-header">
                <button className="m-nav-back" onClick={handleBack}>← 返回</button>
                <div className="m-score-card">
                    <div className="m-score-circle">
                        <svg viewBox="0 0 36 36" className="m-circular-chart">
                            <path className="m-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path
                                className="m-circle"
                                strokeDasharray={`${scoreRatio * 100}, 100`}
                                stroke={getScoreColor(scoreRatio)}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <div className="m-score-text">
                            <span className="m-score-val">{totalScore}</span>
                            <span className="m-score-max">/{maxScore}</span>
                        </div>
                    </div>
                    <div className="m-score-stats">
                        <div className="m-stat-item">
                            <span className="m-stat-label">用时</span>
                            <span className="m-stat-val">{Math.floor((result.time_spent || 0) / 60)}分</span>
                        </div>
                        <div className="m-stat-item">
                            <span className="m-stat-label">字数</span>
                            <span className="m-stat-val">{result.word_count}</span>
                        </div>
                        <div className="m-stat-item">
                            <span className="m-stat-label">命中率</span>
                            <span className="m-stat-val">{Math.round(gradingResult.hit_rate * 100)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 分段控制器 Tabs */}
            <div className="m-report-tabs">
                <button
                    className={`m-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    综评
                </button>
                <button
                    className={`m-tab-item ${activeTab === 'points' ? 'active' : ''}`}
                    onClick={() => setActiveTab('points')}
                >
                    采分点
                </button>
                <button
                    className={`m-tab-item ${activeTab === 'polish' ? 'active' : ''}`}
                    onClick={() => setActiveTab('polish')}
                >
                    润色
                </button>
            </div>

            {/* 内容区域 */}
            <div className="m-report-content">
                {activeTab === 'overview' && (
                    <div className="m-tab-pane animate-fade-in">
                        <div className="m-card">
                            <h3 className="m-card-title">💡 此处有AI点评审</h3>
                            <p className="m-ai-comment">{gradingResult.ai_feedback?.overall_comment}</p>
                        </div>

                        {(gradingResult.ai_feedback?.suggestions || []).length > 0 && (
                            <div className="m-card">
                                <h3 className="m-card-title">🚀 改进建议</h3>
                                <ul className="m-suggestion-list">
                                    {gradingResult.ai_feedback?.suggestions.map((s, i) => (
                                        <li key={i} className="m-suggestion-item">
                                            <span className="m-sug-idx">{i + 1}</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="m-card">
                            <h3 className="m-card-title">📝 你的作答</h3>
                            <div className="m-user-answer">
                                {result.content}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'points' && (
                    <div className="m-tab-pane animate-fade-in">
                        {scoringDetails.length > 0 ? (
                            <div className="m-points-list">
                                {scoringDetails.map((detail: any, index: number) => (
                                    <div key={index} className={`m-point-item ${detail.status}`}>
                                        <div className="m-point-icon">
                                            {detail.status === 'full' ? '✅' : detail.status === 'partial' ? '⚠️' : '❌'}
                                        </div>
                                        <div className="m-point-body">
                                            <div className="m-point-row">
                                                <span className="m-point-txt">{detail.point}</span>
                                                <span className={`m-point-score ${detail.status}`}>
                                                    {detail.earned}/{detail.score}
                                                </span>
                                            </div>
                                            {detail.status !== 'full' && (
                                                <div className="m-point-gap">
                                                    缺失: {(detail.missing_keywords || []).join('、')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="m-empty-state">暂无详细采分点数据</div>
                        )}
                    </div>
                )}

                {activeTab === 'polish' && (
                    <div className="m-tab-pane animate-fade-in">
                        <div className="m-card">
                            <h3 className="m-card-title">✨ 润色对比</h3>
                            <p className="m-hint-text">红色删除线为原文，绿色为AI修改建议</p>
                            <div className="m-polish-content">
                                <PolishedText
                                    text={gradingResult.ai_feedback?.polished_with_marks || gradingResult.ai_feedback?.polished_version || '暂无润色数据'}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="m-footer-spacer"></div>
            <div className="m-fixed-footer">
                <button className="m-footer-btn secondary" onClick={handleBack}>继续练习</button>
                <button className="m-footer-btn primary">查看解析</button>
            </div>
        </div>
    );
}
