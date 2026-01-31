"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Exam, Question } from '@/services/api';
import './ExamDetailMobile.css';

interface ExamDetailMobileProps {
    initialExam: Exam;
    initialQuestions: Question[];
}

export default function ExamDetailMobile({ initialExam, initialQuestions }: ExamDetailMobileProps) {
    const router = useRouter();
    // Use state to allow updates but init with props
    const [exam] = useState<Exam>(initialExam);
    const [questions] = useState<Question[]>(initialQuestions);

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

    return (
        <div className="exam-detail-mobile">
            {/* Header Area */}
            <div className="m-detail-header">
                <button className="m-back-btn" onClick={() => router.push('/')}>
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
                        onClick={() => router.push(`/answer/${q.id}`)}
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
