"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Exam, Question } from '@/services/api';
import './ExamDetailDesktop.css';

interface ExamDetailDesktopProps {
    initialExam: Exam;
    initialQuestions: Question[];
}

export default function ExamDetailDesktop({ initialExam, initialQuestions }: ExamDetailDesktopProps) {
    const router = useRouter();
    const [exam] = useState<Exam>(initialExam);
    const [questions] = useState<Question[]>(initialQuestions);

    const questionTypeColors: Record<string, string> = {
        '归纳概括': 'type-summary',
        '综合分析': 'type-analysis',
        '提出对策': 'type-solution',
        '贯彻执行': 'type-execution',
        '申发论述': 'type-essay'
    };

    return (
        <div className="exam-detail-page">
            <div className="exam-header">
                <button className="back-btn" onClick={() => router.push('/')}>
                    <span>←</span> 返回试卷列表
                </button>
                <div className="exam-info">
                    <h1 className="exam-title">{exam.exam_name}</h1>
                    <div className="exam-badges">
                        <span className="badge badge-year">{exam.year}年</span>
                        <span className="badge badge-type">{exam.exam_type}</span>
                        {exam.exam_level && (
                            <span className="badge badge-level">{exam.exam_level}</span>
                        )}
                        <span className="badge badge-score">总分 {exam.total_score} 分</span>
                    </div>
                </div>
            </div>

            <div className="exam-content">
                {/* 题目列表 (全宽) */}
                <div className="questions-section full-width">
                    <h2 className="section-title">📝 题目列表</h2>
                    <div className="questions-list">
                        {questions.length === 0 ? (
                            <div className="no-questions">
                                <span>📭</span>
                                <p>本试卷暂无题目</p>
                            </div>
                        ) : (
                            questions.map((question, index) => (
                                <div
                                    key={question.id}
                                    className="question-item"
                                    onClick={() => router.push(`/answer/${question.id}`)}
                                >
                                    <div className="question-number">
                                        第 {question.question_number || index + 1} 题
                                    </div>
                                    <div className="question-content">
                                        <div className="question-header">
                                            <span className={`question-type ${questionTypeColors[question.question_type]}`}>
                                                {question.question_type}
                                            </span>
                                            <span className="question-score">{question.score} 分</span>
                                        </div>
                                        <p className="question-title">{question.title}</p>
                                        <div className="question-meta">
                                            {question.word_limit && (
                                                <span className="meta-item">
                                                    字数限制：{question.word_limit}字
                                                </span>
                                            )}
                                            {question.material_refs?.length > 0 && (
                                                <span className="meta-item">
                                                    参考资料：{question.material_refs.join('、')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button className="answer-btn">
                                        开始作答 →
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
