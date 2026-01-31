import { useState } from 'react';
import { useUserContext } from '../../contexts/UserContext';
import { gradingApi } from '../../services/api';
import './HistoryMobile.css';

interface HistoryMobileProps {
    onViewReport: (answerId: string) => void;
}

export default function HistoryMobile({ onViewReport }: HistoryMobileProps) {
    const { stats, loading, refetch } = useUserContext();
    const history = stats.history;
    const [deleting, setDeleting] = useState<string | null>(null);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('确定删除此记录？')) return;

        try {
            setDeleting(id);
            await gradingApi.deleteRecord(id);
            await refetch();
        } catch (err) {
            alert('删除失败');
        } finally {
            setDeleting(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="mobile-loading">加载中...</div>;
    if (history.length === 0) return <div className="mobile-empty">暂无练习记录</div>;

    return (
        <div className="history-mobile">
            <h2 className="mobile-page-title">练习历史</h2>

            {/* Stats Row */}
            <div className="mobile-stats-row">
                <div className="mobile-stat-item">
                    <span className="m-stat-val">{stats.total_count}</span>
                    <span className="m-stat-lbl">练习数</span>
                </div>
                <div className="mobile-stat-item">
                    <span className="m-stat-val">{Math.round(stats.avg_score_rate * 100)}%</span>
                    <span className="m-stat-lbl">平均分率</span>
                </div>
                <div className="mobile-stat-item">
                    <span className="m-stat-val">{stats.continuous_days}</span>
                    <span className="m-stat-lbl">坚持天数</span>
                </div>
            </div>

            <div className="mobile-history-list">
                {history.map(item => (
                    <div
                        key={item.id}
                        className="mobile-history-item"
                        onClick={() => item.grading_status === 'completed' && onViewReport(item.id)}
                    >
                        <div className="m-history-top">
                            <span className="m-history-title">{item.question_title}</span>
                            <span className={`m-status-tag ${item.grading_status}`}>
                                {item.grading_status === 'completed' ? `${item.total_score}分` :
                                    item.grading_status === 'processing' ? '批改中' :
                                        item.grading_status === 'error' ? '失败' : '等待'}
                            </span>
                        </div>
                        <div className="m-history-mid">
                            <span className="m-history-type">{item.question_type || '申论'}</span>
                            <span className="m-history-date">{formatDate(item.created_at)}</span>
                        </div>

                        {/* Progress Bar for Processing items */}
                        {item.grading_status === 'processing' && (
                            <div className="m-progress-bar">
                                <div className="m-progress-fill" style={{ width: `${item.progress}%` }}></div>
                            </div>
                        )}

                        <div className="m-history-btm">
                            {item.grading_status === 'completed' && (
                                <span className="m-view-link">点击查看报告 &gt;</span>
                            )}
                            <button
                                className="m-delete-btn"
                                onClick={(e) => handleDelete(e, item.id)}
                                disabled={deleting === item.id}
                            >
                                {deleting === item.id ? '...' : '删除'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
