import { useUserContext } from '../contexts/UserContext'
import './Sidebar.css'

interface SidebarProps {
    currentPage: string
    onNavigate: (page: 'exams' | 'questions' | 'materials' | 'history') => void
    onViewReport?: (answerId: string) => void
    onManageHistory?: () => void  // 进入历史记录管理页面
}

function Sidebar({ currentPage, onNavigate, onViewReport, onManageHistory }: SidebarProps) {
    const { stats, loading } = useUserContext()

    const menuItems = [
        { id: 'exams', icon: '📋', label: '试卷库', description: '按年份选择试卷' },
        { id: 'materials', icon: '💡', label: '素材积累', description: '金句与范文' },
    ]

    return (
        <aside className="sidebar">
            <div className="sidebar-menu">
                <div className="menu-section">
                    <h3 className="menu-title">功能导航</h3>
                    <nav className="menu-list">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                className={`menu-item ${currentPage === item.id ? 'active' : ''}`}
                                onClick={() => onNavigate(item.id as any)}
                            >
                                <span className="menu-icon">{item.icon}</span>
                                <div className="menu-text">
                                    <span className="menu-label">{item.label}</span>
                                    <span className="menu-desc">{item.description}</span>
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="menu-section">
                    <h3 className="menu-title">学习统计</h3>
                    <div className="stats-card">
                        <div className="stat-item">
                            <span className="stat-value">{loading ? '...' : stats.total_count}</span>
                            <span className="stat-label">已练习</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{loading ? '...' : `${Math.round(stats.avg_score_rate * 100)}%`}</span>
                            <span className="stat-label">平均得分率</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{loading ? '...' : stats.continuous_days}</span>
                            <span className="stat-label">连续天数</span>
                        </div>
                    </div>
                </div>

                <div className="menu-section">
                    <div className="menu-title-row">
                        <h3 className="menu-title">历次批改记录</h3>
                        {onManageHistory && (
                            <button className="history-arrow" onClick={onManageHistory} title="查看全部记录">
                                →
                            </button>
                        )}
                    </div>
                    <div className="history-list">
                        {loading ? (
                            <div className="history-loading">加载中...</div>
                        ) : stats.history.length > 0 ? (
                            stats.history.slice(0, 5).map(h => (
                                <div key={h.id} className="history-item">
                                    <div className="history-info">
                                        <span className="history-title" title={h.question_title}>
                                            {h.question_title.substring(0, 15)}{h.question_title.length > 15 ? '...' : ''}
                                        </span>
                                        <span className="history-date">
                                            {new Date(h.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="history-status">
                                        {h.grading_status === 'completed' ? (
                                            <span className="status-score">{h.total_score}分</span>
                                        ) : h.grading_status === 'error' ? (
                                            <span className="status-error">批改失败</span>
                                        ) : (
                                            <div className="status-progress">
                                                <div className="mini-progress-bar">
                                                    <div
                                                        className="mini-progress-fill"
                                                        style={{ width: `${h.progress}%` }}
                                                    />
                                                </div>
                                                <span className="status-pending">
                                                    {h.grading_status === 'processing' ? '批改中' : '等待中'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {h.grading_status === 'completed' && (
                                        <button className="btn-view" onClick={() => {
                                            if (onViewReport) {
                                                onViewReport(h.id)
                                            }
                                        }}>查看</button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="history-empty">暂无记录</div>
                        )}
                    </div>
                </div>

                <div className="menu-section">
                    <h3 className="menu-title">快速入口</h3>
                    <div className="quick-links">
                        <a href="#" className="quick-link">
                            <span>🔥</span> 热门真题
                        </a>
                    </div>
                </div>
            </div>

            <div className="sidebar-footer">
                <div className="pro-banner">
                    <div className="pro-icon">⭐</div>
                    <div className="pro-text">
                        <span className="pro-title">升级专业版</span>
                        <span className="pro-desc">解锁全部题库与高级功能</span>
                    </div>
                </div>
            </div>
        </aside>
    )
}

export default Sidebar
