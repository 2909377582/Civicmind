"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronRight } from 'lucide-react';
import { examApi } from '@/services/api';
import type { ExamsByYear, ExamListItem } from '@/services/api';
import './ExamListMobile.css';

interface ExamListMobileProps {
    initialData: ExamsByYear[];
}

export default function ExamListMobile({ initialData }: ExamListMobileProps) {
    const { data: examsByYear = initialData, isLoading } = useSWR('exams/list', () => examApi.list(), {
        fallbackData: initialData,
    });

    // We only set the initial expanded year once
    const [expandedYear, setExpandedYear] = useState<number | null>(
        initialData && initialData.length > 0 ? initialData[0].year : null
    );

    // Sync expanded year only if it's currently null and data arrives for the first time
    const [hasAttemptedAutoExpand, setHasAttemptedAutoExpand] = useState(false);
    useEffect(() => {
        if (!hasAttemptedAutoExpand && examsByYear && examsByYear.length > 0) {
            if (expandedYear === null) {
                setExpandedYear(examsByYear[0].year);
            }
            setHasAttemptedAutoExpand(true);
        }
    }, [examsByYear, expandedYear, hasAttemptedAutoExpand]);

    // Render loading or empty state
    const renderContent = () => {
        if (examsByYear.length === 0) {
            if (isLoading) {
                return (
                    <div className="mobile-loading-state">
                        <div className="loading-spinner"></div>
                        <p>正在努力加载试卷...</p>
                    </div>
                );
            }
            return (
                <div className="mobile-empty-state">
                    <p>暂无试卷数据</p>
                </div>
            );
        }

        return examsByYear.map((yearGroup: ExamsByYear) => (
            <div key={yearGroup.year} className="mobile-year-section">
                <div
                    className={`mobile-year-header ${expandedYear === yearGroup.year ? 'expanded' : ''}`}
                    onClick={() => {
                        setExpandedYear(expandedYear === yearGroup.year ? null : yearGroup.year);
                    }}
                >
                    <span className="mobile-year-badge">{yearGroup.year}年</span>
                    <span className={`mobile-expand-icon ${expandedYear === yearGroup.year ? 'is-expanded' : ''}`}>
                        <ChevronRight size={18} />
                    </span>
                </div>

                {expandedYear === yearGroup.year && (
                    <div className="mobile-exams-list">
                        {yearGroup.exams.map((exam: ExamListItem) => (
                            <Link key={exam.id} href={`/exam/${exam.id}`} className="mobile-exam-card">
                                <div className="mobile-card-top">
                                    <div className="mobile-exam-icon">
                                        {getExamTypeIcon(exam.exam_type)}
                                    </div>
                                    <div className="mobile-exam-info">
                                        <h3 className="mobile-exam-name">{exam.exam_name}</h3>
                                        <div className="mobile-exam-tags">
                                            <span className={`mobile-tag ${getExamTypeBadgeClass(exam.exam_type)}`}>
                                                {exam.exam_type}
                                            </span>
                                            {exam.exam_level && (
                                                <span className="mobile-tag level-tag">{exam.exam_level}</span>
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
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="exam-list-mobile">
            <h2 className="mobile-page-title">真题试卷</h2>
            <div className="mobile-years-container">
                {renderContent()}
            </div>
        </div>
    );
}

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
