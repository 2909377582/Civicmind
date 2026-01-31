import { useState, useEffect } from 'react'
import { examApi } from '../services/api'
import type { ExamsByYear } from '../services/api'
import './ExamListPage.css'

interface ExamListPageProps {
    onSelectExam: (examId: string) => void
}

function ExamListPage({ onSelectExam }: ExamListPageProps) {
    const [examsByYear, setExamsByYear] = useState<ExamsByYear[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedYear, setExpandedYear] = useState<number | null>(null)

    useEffect(() => {
        const fetchExams = async () => {
            try {
                setLoading(true)
                const data = await examApi.list()
                setExamsByYear(data)
                // 默认展开最新年份
                if (data.length > 0) {
                    setExpandedYear(data[0].year)
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : '加载试卷失败')
            } finally {
                setLoading(false)
            }
        }
        fetchExams()
    }, [])

    const getExamTypeIcon = (type: string) => {
        switch (type) {
            case '国考': return '🏛️'
            case '省考': return '🏢'
            case '事业单位': return '🏫'
            case '选调生': return '🎓'
            default: return '📝'
        }
    }

    const getExamTypeBadgeClass = (type: string) => {
        switch (type) {
            case '国考': return 'badge-national'
            case '省考': return 'badge-provincial'
            case '事业单位': return 'badge-institution'
            default: return 'badge-other'
        }
    }

    if (loading) {
        return (
            <div className="exam-list-page">
                <div className="loading-state">
                    <div className="loading-spinner">⏳</div>
                    <p>正在加载试卷...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="exam-list-page">
                <div className="error-state">
                    <span className="error-icon">⚠️</span>
                    <p className="error-text">{error}</p>
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>
                        重试
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="exam-list-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">📚 真题试卷库</h1>
                    <p className="page-subtitle">选择年份和试卷，查看完整材料，逐题作答</p>
                </div>
            </div>

            <div className="years-container">
                {examsByYear.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <p className="empty-text">暂无试卷数据</p>
                        <p className="empty-hint">请联系管理员添加试卷</p>
                    </div>
                ) : (
                    examsByYear.map((yearGroup) => (
                        <div key={yearGroup.year} className="year-section">
                            <div
                                className={`year-header ${expandedYear === yearGroup.year ? 'expanded' : ''}`}
                                onClick={() => setExpandedYear(
                                    expandedYear === yearGroup.year ? null : yearGroup.year
                                )}
                            >
                                <div className="year-info">
                                    <span className="year-badge">{yearGroup.year}年</span>
                                    <span className="exam-count">{yearGroup.exams.length} 套试卷</span>
                                </div>
                                <span className="expand-icon">
                                    {expandedYear === yearGroup.year ? '▼' : '▶'}
                                </span>
                            </div>

                            {expandedYear === yearGroup.year && (
                                <div className="exams-grid">
                                    {yearGroup.exams.map((exam) => (
                                        <div
                                            key={exam.id}
                                            className="exam-card"
                                            onClick={() => onSelectExam(exam.id)}
                                        >
                                            <div className="exam-card-header">
                                                <span className="exam-icon">
                                                    {getExamTypeIcon(exam.exam_type)}
                                                </span>
                                                <div className="exam-badges">
                                                    <span className={`exam-type-badge ${getExamTypeBadgeClass(exam.exam_type)}`}>
                                                        {exam.exam_type}
                                                    </span>
                                                    {exam.exam_level && (
                                                        <span className={`exam-level-badge ${exam.exam_level === '省市' ? 'level-provincial' : 'level-county'}`}>
                                                            {exam.exam_level}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <h3 className="exam-name">{exam.exam_name}</h3>
                                            <div className="exam-meta">
                                                <div className="meta-item">
                                                    <span className="meta-label">题目数</span>
                                                    <span className="meta-value">{exam.question_count} 道</span>
                                                </div>
                                                <div className="meta-item">
                                                    <span className="meta-label">总分</span>
                                                    <span className="meta-value">{exam.total_score} 分</span>
                                                </div>
                                            </div>
                                            <button className="start-btn">
                                                开始做题 <span>→</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default ExamListPage
