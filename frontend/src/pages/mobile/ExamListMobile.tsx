import { useState, useEffect } from 'react';
import { examApi } from '../../services/api';
import type { ExamsByYear } from '../../services/api';
import './ExamListMobile.css';

interface ExamListMobileProps {
    onSelectExam: (examId: string) => void;
}

export default function ExamListMobile({ onSelectExam }: ExamListMobileProps) {
    const [examsByYear, setExamsByYear] = useState<ExamsByYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedYear, setExpandedYear] = useState<number | null>(null);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                setLoading(true);
                const data = await examApi.list();
                setExamsByYear(data);
                // 默认展开最新年份
                if (data.length > 0) {
                    setExpandedYear(data[0].year);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : '加载试卷失败');
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const getExamTypeIcon = (type: string) => {
        switch (type) {
            case '国考': return '🏛️';
            case '省考': return '🏢';
            case '事业单位': return '🏫';
            case '选调生': return '🎓';
            default: return '📝';
        }
    };

    const getExamTypeBadgeClass = (type: string) => {
        switch (type) {
            case '国考': return 'badge-national';
            case '省考': return 'badge-provincial';
            case '事业单位': return 'badge-institution';
            default: return 'badge-other';
        }
    };

    if (loading) {
        return (
            <div className="mobile-loading-state">
                <div className="mobile-spinner"></div>
                <p>正在加载试卷...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mobile-error-state">
                <span>⚠️</span>
                <p>{error}</p>
                <button className="mobile-retry-btn" onClick={() => window.location.reload()}>重试</button>
            </div>
        );
    }

    return (
        <div className="exam-list-mobile">
            <h2 className="mobile-page-title">真题试卷</h2>

            <div className="mobile-years-container">
                {examsByYear.length === 0 ? (
                    <div className="mobile-empty-state">
                        <p>暂无试卷数据</p>
                    </div>
                ) : (
                    examsByYear.map((yearGroup) => (
                        <div key={yearGroup.year} className="mobile-year-section">
                            <div
                                className={`mobile-year-header ${expandedYear === yearGroup.year ? 'expanded' : ''}`}
                                onClick={() => setExpandedYear(
                                    expandedYear === yearGroup.year ? null : yearGroup.year
                                )}
                            >
                                <span className="mobile-year-badge">{yearGroup.year}年</span>
                                <span className="mobile-expand-icon">
                                    {expandedYear === yearGroup.year ? '▼' : '▶'}
                                </span>
                            </div>

                            {expandedYear === yearGroup.year && (
                                <div className="mobile-exams-list">
                                    {yearGroup.exams.map((exam) => (
                                        <div
                                            key={exam.id}
                                            className="mobile-exam-card"
                                            onClick={() => onSelectExam(exam.id)}
                                        >
                                            <div className="mobile-card-top">
                                                <div className="mobile-exam-icon">{getExamTypeIcon(exam.exam_type)}</div>
                                                <div className="mobile-exam-info">
                                                    <h3 className="mobile-exam-name">{exam.exam_name}</h3>
                                                    <div className="mobile-exam-tags">
                                                        <span className={`mobile-tag ${getExamTypeBadgeClass(exam.exam_type)}`}>
                                                            {exam.exam_type}
                                                        </span>
                                                        {exam.exam_level && (
                                                            <span className="mobile-tag level-tag">
                                                                {exam.exam_level}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mobile-card-bottom">
                                                <span>{exam.question_count} 道题目</span>
                                                <span className="mobile-divider">|</span>
                                                <span>总分 {exam.total_score}</span>
                                                <button className="mobile-start-btn">开始</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
