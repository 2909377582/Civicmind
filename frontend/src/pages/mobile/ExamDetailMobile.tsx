import { useState, useEffect } from 'react';
import { examApi } from '../../services/api';
import type { Exam, Question } from '../../services/api';
import './ExamDetailMobile.css';

interface ExamDetailMobileProps {
    examId: string;
    onSelectQuestion: (question: Question, exam: Exam) => void;
    onBack: () => void;
}

export default function ExamDetailMobile({ examId, onSelectQuestion, onBack }: ExamDetailMobileProps) {
    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [examData, questionsData] = await Promise.all([
                examApi.get(examId),
                examApi.questions(examId)
            ]);
            setExam(examData);
            setQuestions(questionsData);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载试卷失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [examId]);

    const getQuestionTypeClass = (type: string) => {
        switch (type) {
            case '归纳概括': return 'type-summary';
            case '综合分析': return 'type-analysis';
            case '提出对策': return 'type-solution';
            case '贯彻执行': return 'type-execution';
            case '申发论述': return 'type-essay';
            default: return '';
        }
    };

    if (loading) {
        return (
            <div className="mobile-loading-state">
                <div className="mobile-spinner"></div>
                <p>加载试卷详情...</p>
            </div>
        );
    }

    if (error || !exam) {
        return (
            <div className="mobile-error-state">
                <span>⚠️</span>
                <p>{error || '试卷不存在'}</p>
                <button className="mobile-retry-btn" onClick={fetchData}>重试</button>
                <button className="mobile-back-text-btn" onClick={onBack}>返回列表</button>
            </div>
        );
    }

    return (
        <div className="exam-detail-mobile">
            {/* Header Area */}
            <div className="m-detail-header">
                <button className="m-back-btn" onClick={onBack}>
                    ← 返回
                </button>
                <h1 className="m-exam-title">{exam.exam_name}</h1>
                <div className="m-exam-meta-row">
                    <span className="m-meta-badge year">{exam.year}年</span>
                    <span className="m-meta-badge type">{exam.exam_type}</span>
                    <span className="m-meta-text">共 {questions.length} 题</span>
                </div>
            </div>

            {/* Questions List */}
            <div className="m-questions-list">
                <h2 className="m-section-title">题目列表</h2>
                {questions.map((q, index) => (
                    <div
                        key={q.id}
                        className="m-question-card"
                        onClick={() => onSelectQuestion(q, exam)}
                    >
                        <div className="m-q-card-header">
                            <span className="m-q-num">第 {q.question_number || index + 1} 题</span>
                            <span className={`m-q-type ${getQuestionTypeClass(q.question_type)}`}>
                                {q.question_type}
                            </span>
                            <span className="m-q-score">{q.score} 分</span>
                        </div>

                        <h3 className="m-q-title">{q.title}</h3>

                        <div className="m-q-footer">
                            <div className="m-q-info">
                                {q.word_limit && <span className="m-q-limit">限 {q.word_limit} 字</span>}
                            </div>
                            <button className="m-start-btn">开始作答</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
