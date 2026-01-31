import { useState } from 'react'
import type { Question, UserAnswer, GradingResult } from '../services/api'
import './ReportPage.css'
import ScoringPointTable from '../components/ScoringPointTable'
import LogicComparisonView from '../components/LogicComparisonView'

// 解析润色文本中的 markdown 格式修改痕迹
// ~~删除线~~ 和 **加粗** 格式
function renderPolishedText(text: string): React.ReactNode[] {
    if (!text) return [];

    const parts: React.ReactNode[] = [];
    // 匹配 ~~删除文字~~ **新增文字** 或单独的 ~~删除~~ 或 **加粗**
    const regex = /(~~([^~]+)~~\s*\*\*([^*]+)\*\*|~~([^~]+)~~|\*\*([^*]+)\*\*)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
        // 添加匹配之前的普通文本
        if (match.index > lastIndex) {
            parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
        }

        if (match[2] && match[3]) {
            // ~~删除~~ **新增** 组合格式
            parts.push(
                <span key={key++} className="polish-change">
                    <span className="deleted">{match[2]}</span>
                    <span className="added">{match[3]}</span>
                </span>
            );
        } else if (match[4]) {
            // 单独的 ~~删除~~
            parts.push(<span key={key++} className="deleted">{match[4]}</span>);
        } else if (match[5]) {
            // 单独的 **加粗**（新增内容）
            parts.push(<span key={key++} className="added">{match[5]}</span>);
        }

        lastIndex = match.index + match[0].length;
    }

    // 添加剩余的普通文本
    if (lastIndex < text.length) {
        parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return parts;
}

interface ReportPageProps {
    result: UserAnswer
    question: Question | null
    onBack: () => void
}

function ReportPage({ result, question, onBack }: ReportPageProps) {
    // 尝试获取 gradingResult，兼容可能是 JSON 字符串或嵌套的情况
    let gradingResult = result.grading_result as GradingResult;
    const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'logic' | 'polish' | 'upgrade'>('overview')

    // 如果 result 本身就是 grading result (兼容旧 API)
    if (!gradingResult && (result as any).total_score !== undefined) {
        gradingResult = result as unknown as GradingResult;
    }

    // 打印调试日志
    console.log('ReportPage render:', result, gradingResult);

    // 检查是否还在加载中
    if (!gradingResult && !(result as any).ai_feedback) {
        return (
            <div className="loading-state">
                <div className="loading-content">
                    <span className="loading-spinner"></span>
                    <p>等待评分结果...</p>
                    <p className="debug-info" style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                        DEBUG: Answer ID {result.id}, Status: {result.is_graded ? 'Graded' : 'Pending'}
                    </p>
                </div>
            </div>
        );
    }

    const getScoreLevel = (ratio: number) => {
        if (ratio >= 0.8) return { label: '优秀', color: 'success' }
        if (ratio >= 0.6) return { label: '良好', color: 'primary' }
        if (ratio >= 0.4) return { label: '及格', color: 'warning' }
        return { label: '待提升', color: 'error' }
    }

    const maxScore = gradingResult.max_score || question?.score || 10;

    // 核心修复：从 scoring_details 累加计算内容得分
    const scoringDetails = gradingResult.ai_feedback?.scoring_details || [];
    const calculatedContentScore = scoringDetails.reduce((sum: number, d: any) => sum + (d.earned || 0), 0);
    const calculatedContentMaxScore = scoringDetails.reduce((sum: number, d: any) => sum + (d.score || 0), 0);

    // 如果有 scoring_details，使用累加得分；否则使用后端返回值
    const contentScore = scoringDetails.length > 0 ? calculatedContentScore : (gradingResult.content_score || 0);
    const contentMaxScore = scoringDetails.length > 0 ? calculatedContentMaxScore : (gradingResult.content_max_score || maxScore);

    // 总分 = 内容得分（采分点累加），不加其他分数
    const totalScore = contentScore;

    const scoreRatio = contentMaxScore > 0 ? totalScore / contentMaxScore : 0;
    const scoreLevel = getScoreLevel(scoreRatio)

    // Check if it's an essay question (Question 4 / Big Essay)
    const isEssay = question?.question_type === '申论作文' ||
        question?.question_type === '大作文' ||
        question?.title.includes('作文') ||
        maxScore === 40;

    return (
        <div className="report-page">
            <div className="report-header">
                <button className="back-btn" onClick={onBack}>
                    <span>←</span> 返回题库
                </button>
                <h1 className="report-title">批改报告</h1>
                <button className="btn btn-secondary">
                    <span>📥</span> 导出 PDF
                </button>
            </div>

            {/* Score Summary */}
            <div className="score-summary">
                <div className="score-main">
                    <div className="score-circle">
                        <svg className="score-ring" viewBox="0 0 100 100">
                            <circle
                                className="score-ring-bg"
                                cx="50"
                                cy="50"
                                r="45"
                            />
                            <circle
                                className={`score-ring-progress ${scoreLevel.color}`}
                                cx="50"
                                cy="50"
                                r="45"
                                strokeDasharray={`${scoreRatio * 283} 283`}
                            />
                        </svg>
                        <div className="score-value">
                            <span className="score-number">{totalScore}</span>
                            <span className="score-max">/ {maxScore}</span>
                        </div>
                    </div>
                    <div className="score-info">
                        <span className={`score-level tag tag-${scoreLevel.color}`}>
                            {scoreLevel.label}
                        </span>
                        <span className="score-percentile">超过 72% 的作答者</span>
                    </div>
                </div>

                {/* 采分点得分明细 */}
                <div className="scoring-points-mini">
                    {scoringDetails.slice(0, 5).map((detail: any, index: number) => (
                        <div key={index} className={`point-mini ${detail.status}`}>
                            <span className={`point-status-badge ${detail.status}`}>
                                {detail.status === 'full' ? '完全命中' : detail.status === 'partial' ? '部分命中' : '未命中'}
                            </span>
                            <span className="point-score">
                                <span className={detail.status === 'missed' ? 'score-zero' : 'score-earned'}>
                                    {detail.earned || 0}
                                </span>
                                /{detail.score || 0}
                            </span>
                            <span className="point-text" title={detail.point}>
                                {(detail.point || '').substring(0, 10)}{(detail.point || '').length > 10 ? '...' : ''}
                            </span>
                        </div>
                    ))}
                    {scoringDetails.length === 0 && (
                        <div className="no-points">暂无采分点数据</div>
                    )}
                </div>

                <div className="score-stats">
                    <div className="stat-card">
                        <span className="stat-icon">🎯</span>
                        <div className="stat-content">
                            <span className="stat-value">{gradingResult.points_hit}/{gradingResult.points_total}</span>
                            <span className="stat-label">采分点命中</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">📊</span>
                        <div className="stat-content">
                            <span className="stat-value">{Math.round(gradingResult.hit_rate * 100)}%</span>
                            <span className="stat-label">命中率</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">📝</span>
                        <div className="stat-content">
                            <span className="stat-value">{result.word_count}</span>
                            <span className="stat-label">字数</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">⏱️</span>
                        <div className="stat-content">
                            <span className="stat-value">{Math.floor((result.time_spent || 0) / 60)}分钟</span>
                            <span className="stat-label">用时</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="report-tabs">
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <span>📋</span> 总体评价
                </button>
                <button
                    className={`tab-btn ${activeTab === 'points' ? 'active' : ''}`}
                    onClick={() => setActiveTab('points')}
                >
                    <span>🎯</span> 采分点分析
                </button>
                <button
                    className={`tab-btn ${activeTab === 'logic' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logic')}
                >
                    <span>🧠</span> 逻辑训练
                </button>
                <button
                    className={`tab-btn ${activeTab === 'polish' ? 'active' : ''}`}
                    onClick={() => setActiveTab('polish')}
                >
                    <span>✨</span> 润色建议
                </button>
                {isEssay && (
                    <button
                        className={`tab-btn ${activeTab === 'upgrade' ? 'active' : ''}`}
                        onClick={() => setActiveTab('upgrade')}
                    >
                        <span>🚀</span> 升格范文
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="report-content">
                {activeTab === 'overview' && (
                    <div className="tab-panel animate-fade-in">
                        <div className="feedback-card">
                            <h3 className="feedback-title">💬 AI 点评</h3>
                            <p className="feedback-comment">{gradingResult.ai_feedback?.overall_comment}</p>
                        </div>

                        <div className="feedback-grid">
                            <div className="feedback-card success-card">
                                <h3 className="feedback-title">✅ 亮点</h3>
                                <ul className="feedback-list">
                                    {(gradingResult.ai_feedback?.strengths || []).map((s: string, i: number) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="feedback-card warning-card">
                                <h3 className="feedback-title">⚠️ 不足</h3>
                                <ul className="feedback-list">
                                    {(gradingResult.ai_feedback?.weaknesses || []).map((w: string, i: number) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="feedback-card">
                            <h3 className="feedback-title">💡 改进建议</h3>
                            <ul className="suggestion-list">
                                {(gradingResult.ai_feedback?.suggestions || []).map((s: string, i: number) => (
                                    <li key={i} className="suggestion-item">
                                        <span className="suggestion-number">{i + 1}</span>
                                        <span className="suggestion-text">{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="user-answer-section">
                            <h3 className="section-title">📝 你的作答</h3>
                            <div className="user-answer-content">
                                {result.content || '（作答内容）'}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'points' && (
                    <div className="tab-panel animate-fade-in">
                        {gradingResult.ai_feedback?.scoring_details ? (
                            <ScoringPointTable details={gradingResult.ai_feedback.scoring_details} />
                        ) : (
                            <div className="points-list">
                                {(gradingResult.point_matches || []).map((point: any, index: number) => (
                                    <div
                                        key={index}
                                        className={`point-card ${point.is_matched ? 'hit' : 'miss'}`}
                                    >
                                        <div className="point-header">
                                            <span className="point-number">采分点 {index + 1}</span>
                                            <span className={`point-status tag ${point.is_matched ? 'tag-success' : 'tag-error'}`}>
                                                {point.is_matched ? '✓ 命中' : '✗ 未命中'}
                                            </span>
                                        </div>
                                        <p className="point-content">{point.point_content}</p>
                                        <div className="point-score">
                                            得分：{point.score_earned} 分
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'logic' && (
                    <div className="tab-panel animate-fade-in">
                        {gradingResult.ai_feedback?.logic_analysis ? (
                            <LogicComparisonView analysis={gradingResult.ai_feedback.logic_analysis} />
                        ) : (
                            <div className="empty-state">
                                <p>暂无逻辑分析数据，请重新批改以获取。</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'polish' && (
                    <div className="tab-panel animate-fade-in">
                        {/* 润色标注区域 */}
                        <div className="polish-section">
                            <h3 className="section-title">📝 润色标注（原文 + 修改）</h3>
                            <p className="polish-hint">
                                <span className="deleted-hint">删除线红色</span> 为原文表述，
                                <span className="added-hint">绿色</span> 为润色后的表述
                            </p>
                            <div className="polish-diff-content">
                                {(gradingResult.ai_feedback?.polished_with_marks || gradingResult.ai_feedback?.polished_version) ? (
                                    <div className="diff-text">
                                        {renderPolishedText(gradingResult.ai_feedback?.polished_with_marks || gradingResult.ai_feedback?.polished_version || '')}
                                    </div>
                                ) : (
                                    <div className="diff-text">
                                        <div className="no-upgrades">
                                            <p>暂无润色标注</p>
                                            <p className="hint">请重新提交作答生成润色建议</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 逐条修改说明区域 */}
                        <div className="polish-section upgrade-reasons">
                            <h3 className="section-title">💡 逐条修改说明</h3>
                            <p className="polish-hint">了解每处修改的原因，学习如何写出更好的文章</p>
                            <div className="upgrade-list">
                                {(gradingResult.ai_feedback?.sentence_upgrades || []).length > 0 ? (
                                    (gradingResult.ai_feedback?.sentence_upgrades || []).map((item: any, idx: number) => (
                                        <div key={idx} className="upgrade-item">
                                            <div className="upgrade-row">
                                                <div className="upgrade-before">
                                                    <span className="label">原句</span>
                                                    <span className="text">{item.original}</span>
                                                </div>
                                                <span className="arrow">→</span>
                                                <div className="upgrade-after">
                                                    <span className="label">改后</span>
                                                    <span className="text">{item.upgraded}</span>
                                                </div>
                                            </div>
                                            <div className="upgrade-reason">
                                                <span className="reason-label">📖 修改原因：</span>
                                                <span className="reason-text">{item.reason || '提升表达规范性'}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-upgrades">
                                        <p>暂无逐条修改说明</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'upgrade' && isEssay && (
                    <div className="tab-panel animate-fade-in">
                        <div className="upgrade-intro">
                            <span className="upgrade-icon">🚀</span>
                            <p className="upgrade-text">
                                基于你的作答进行润色优化，以下是完整的修改后版本，可直接阅读参考
                            </p>
                        </div>

                        <div className="upgrade-content">
                            <h3 className="upgrade-title">升格范文（完整版本）</h3>
                            <div className="upgraded-answer">
                                {gradingResult.ai_feedback?.polished_clean
                                    || gradingResult.ai_feedback?.upgraded_version
                                    || '（暂无范文，请重新提交作答生成）'}
                            </div>
                        </div>

                        <div className="upgrade-tips">
                            <h4 className="tips-subtitle">学习要点</h4>
                            <ul className="learning-points">
                                <li>注意范文的结构安排和逻辑层次</li>
                                <li>学习专业术语和正式表达（法言法语）</li>
                                <li>对比自己的答案，找出可以提升的地方</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="report-actions">
                <button className="btn btn-secondary" onClick={onBack}>
                    继续练习
                </button>
                <button className="btn btn-primary">
                    收藏本题
                </button>
            </div>
        </div>
    )
}

export default ReportPage
