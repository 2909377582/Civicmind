'use client';

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gradingApi, GradingHistoryItem } from '@/services/api'
import { useUserContext } from '@/contexts/UserContext'
import './HistoryDesktop.css'

interface HistoryDesktopProps {
    initialData?: GradingHistoryItem[];
}

const HistoryDesktop: React.FC<HistoryDesktopProps> = ({ initialData = [] }) => {
    const router = useRouter()
    const { stats, loading, refetch } = useUserContext()

    // Choose between server data and client context data
    const history = initialData.length > 0 ? initialData : stats.history;

    const [deleting, setDeleting] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这条批改记录吗？此操作不可恢复。')) {
            return
        }

        try {
            setDeleting(id)
            await gradingApi.deleteRecord(id)
            await refetch() // Refresh global state
        } catch (err) {
            console.error('删除失败:', err)
            alert('删除失败，请稍后重试')
        } finally {
            setDeleting(null)
        }
    }

    const onViewReport = (answerId: string) => {
        router.push(`/report/${answerId}`)
    }

    const onBack = () => {
        router.back()
    }

    const getStatusBadge = (item: GradingHistoryItem) => {
        switch (item.grading_status) {
            case 'completed':
                return <span className="status-badge completed">已完成</span>
            case 'processing':
                return <span className="status-badge processing">批改中</span>
            case 'pending':
                return <span className="status-badge pending">等待中</span>
            case 'error':
                return <span className="status-badge error">失败</span>
            default:
                return null
        }
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr)
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="history-page">
            <div className="page-header">
                <button className="back-btn" onClick={onBack}>
                    ← 返回
                </button>
                <h1 className="page-title">📋 批改记录管理</h1>
                <p className="page-subtitle">查看和管理您的所有批改记录</p>
            </div>

            <div className="history-stats">
                <div className="stat-card">
                    <span className="stat-number">{history.length}</span>
                    <span className="stat-label">总记录</span>
                </div>
                <div className="stat-card">
                    <span className="stat-number">
                        {history.filter(h => h.grading_status === 'completed').length}
                    </span>
                    <span className="stat-label">已完成</span>
                </div>
                <div className="stat-card">
                    <span className="stat-number">
                        {history.filter(h => h.grading_status === 'pending' || h.grading_status === 'processing').length}
                    </span>
                    <span className="stat-label">进行中</span>
                </div>
            </div>

            {(loading && initialData.length === 0) ? (
                <div className="loading-state">
                    <div className="loading-spinner">⏳</div>
                    <p>加载中...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📭</span>
                    <p className="empty-text">暂无批改记录</p>
                    <p className="empty-hint">完成作答后，批改记录会显示在这里</p>
                </div>
            ) : (
                <div className="history-groups">
                    {(() => {
                        // 1. 分组
                        const groups: Record<string, GradingHistoryItem[]> = {};
                        history.forEach(item => {
                            const key = item.exam_title || '其他单项练习';
                            if (!groups[key]) groups[key] = [];
                            groups[key].push(item);
                        });

                        // 2. 排序（按组内最新提交时间倒序）
                        const sortedGroups = Object.entries(groups).sort(([, aItems], [, bItems]) => {
                            const timeA = Math.max(...aItems.map(i => new Date(i.created_at).getTime()));
                            const timeB = Math.max(...bItems.map(i => new Date(i.created_at).getTime()));
                            return timeB - timeA;
                        });

                        return sortedGroups.map(([groupTitle, items]) => {
                            const completedItems = items.filter(i => i.grading_status === 'completed' && i.total_score !== null);
                            const totalExamScore = completedItems.reduce((sum, i) => sum + (i.total_score || 0), 0);
                            const totalExamMax = completedItems.reduce((sum, i) => sum + (i.max_score || 0), 0);
                            const isAllCompletedInGroup = completedItems.length === items.length && items.length > 0;

                            return (
                                <div key={groupTitle} className="exam-history-group">
                                    <div className="group-header">
                                        <div className="group-title-wrapper">
                                            <h3 className="group-title">
                                                <span className="exam-icon">📄</span>
                                                {groupTitle}
                                                <span className="exam-count">（{items.length}题）</span>
                                            </h3>
                                            {completedItems.length > 0 && (
                                                <div className="group-total-score">
                                                    <span className="label">{isAllCompletedInGroup ? '整套总分：' : '已得总分：'}</span>
                                                    <span className="value">
                                                        <span className="earned">{totalExamScore.toFixed(1)}</span>
                                                        <span className="separator">/</span>
                                                        <span className="total">{totalExamMax}</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="history-table-container">
                                        <table className="history-table">
                                            <thead>
                                                <tr>
                                                    <th>题目</th>
                                                    <th>提交时间</th>
                                                    <th>状态</th>
                                                    <th>得分</th>
                                                    <th>操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map(item => (
                                                    <tr key={item.id}>
                                                        <td className="question-cell">
                                                            <span className="question-title" title={item.question_title}>
                                                                {item.question_title}
                                                            </span>
                                                            {item.question_type && (
                                                                <span className="question-type">{item.question_type}</span>
                                                            )}
                                                        </td>
                                                        <td className="date-cell">
                                                            {formatDate(item.created_at)}
                                                        </td>
                                                        <td className="status-cell">
                                                            {getStatusBadge(item)}
                                                        </td>
                                                        <td className="score-cell">
                                                            {item.grading_status === 'completed' && item.total_score !== null ? (
                                                                <div className="score-wrapper">
                                                                    <span className="score-earned">{item.total_score}</span>
                                                                    <span className="score-divider">/</span>
                                                                    <span className="score-max">{item.max_score}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="no-score">-</span>
                                                            )}
                                                        </td>
                                                        <td className="actions-cell">
                                                            {item.grading_status === 'completed' && (
                                                                <button
                                                                    className="btn-action btn-view"
                                                                    onClick={() => onViewReport(item.id)}
                                                                >
                                                                    查看
                                                                </button>
                                                            )}
                                                            <button
                                                                className="btn-action btn-delete"
                                                                onClick={() => handleDelete(item.id)}
                                                                disabled={deleting === item.id}
                                                            >
                                                                {deleting === item.id ? '删除中...' : '删除'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            )}
        </div>
    )
}

export default HistoryDesktop
