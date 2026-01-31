import { useState } from 'react'
import { useQuestions } from '../services/hooks'
import type { Question } from '../services/api'
import './QuestionList.css'

interface QuestionListProps {
    onSelectQuestion: (question: Question) => void
}

function QuestionList({ onSelectQuestion }: QuestionListProps) {
    const [filters, setFilters] = useState({
        year: '',
        examType: '',
        questionType: ''
    })
    const [searchQuery, setSearchQuery] = useState('')

    // 使用 hooks 从后端获取数据
    const { questions, loading, error, refetch } = useQuestions({
        year: filters.year ? parseInt(filters.year) : undefined,
        exam_type: filters.examType || undefined,
        question_type: filters.questionType || undefined
    })

    const questionTypeColors: Record<string, string> = {
        '归纳概括': 'tag-primary',
        '综合分析': 'tag-warning',
        '贯彻执行': 'tag-success',
        '申发论述': 'tag-error'
    }

    const getDifficultyStars = (difficulty: number) => {
        return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty)
    }

    // 本地搜索过滤
    const filteredQuestions = questions.filter(q => {
        if (searchQuery && !q.title.includes(searchQuery)) return false
        return true
    })

    return (
        <div className="question-list-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">题库中心</h1>
                    <p className="page-subtitle">精选历年真题，权威解析，智能批改</p>
                </div>
            </div>

            <div className="filters-section">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="搜索题目关键词..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <select
                        className="filter-select"
                        value={filters.year}
                        onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                    >
                        <option value="">全部年份</option>
                        <option value="2024">2024年</option>
                        <option value="2023">2023年</option>
                        <option value="2022">2022年</option>
                        <option value="2021">2021年</option>
                    </select>

                    <select
                        className="filter-select"
                        value={filters.examType}
                        onChange={(e) => setFilters({ ...filters, examType: e.target.value })}
                    >
                        <option value="">全部考试</option>
                        <option value="国考">国考</option>
                        <option value="省考">省考</option>
                        <option value="事业单位">事业单位</option>
                    </select>

                    <select
                        className="filter-select"
                        value={filters.questionType}
                        onChange={(e) => setFilters({ ...filters, questionType: e.target.value })}
                    >
                        <option value="">全部题型</option>
                        <option value="归纳概括">归纳概括</option>
                        <option value="综合分析">综合分析</option>
                        <option value="贯彻执行">贯彻执行</option>
                        <option value="申发论述">申发论述</option>
                    </select>
                </div>
            </div>

            {loading && (
                <div className="loading-state">
                    <div className="loading-spinner">⏳</div>
                    <p>正在加载题目...</p>
                </div>
            )}

            {error && (
                <div className="error-state">
                    <span className="error-icon">⚠️</span>
                    <p className="error-text">加载失败：{error}</p>
                    <button className="btn btn-primary" onClick={refetch}>
                        重试
                    </button>
                </div>
            )}

            {!loading && !error && (
                <div className="questions-grid">
                    {filteredQuestions.map((question, index) => (
                        <div
                            key={question.id}
                            className="question-card animate-fade-in"
                            style={{ animationDelay: `${index * 0.05}s` }}
                            onClick={() => onSelectQuestion(question)}
                        >
                            <div className="question-card-header">
                                <div className="question-meta">
                                    <span className="question-year">{question.year}</span>
                                    <span className="question-exam">{question.exam_type}</span>
                                    {question.exam_level && (
                                        <span className="question-level">{question.exam_level}</span>
                                    )}
                                </div>
                                <span className={`tag ${questionTypeColors[question.question_type]}`}>
                                    {question.question_type}
                                </span>
                            </div>

                            <h3 className="question-title">{question.title}</h3>

                            <div className="question-info">
                                <div className="info-item">
                                    <span className="info-label">字数限制</span>
                                    <span className="info-value">{question.word_limit}字</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">分值</span>
                                    <span className="info-value">{question.score}分</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">难度</span>
                                    <span className="info-value difficulty">
                                        {getDifficultyStars(question.difficulty)}
                                    </span>
                                </div>
                            </div>

                            <div className="question-tags">
                                {question.tags.map((tag, i) => (
                                    <span key={i} className="tag">{tag}</span>
                                ))}
                            </div>

                            <button className="start-btn">
                                开始作答 <span>→</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {!loading && !error && filteredQuestions.length === 0 && (
                <div className="empty-state">
                    <span className="empty-icon">📭</span>
                    <p className="empty-text">没有找到符合条件的题目</p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setFilters({ year: '', examType: '', questionType: '' })}
                    >
                        清除筛选条件
                    </button>
                </div>
            )}
        </div>
    )
}

export default QuestionList
