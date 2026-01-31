import React from 'react';
import type { ScoringDetail } from '@/services/api';
import './ScoringPointTable.css';

interface ScoringPointTableProps {
    details: ScoringDetail[];
}

const ScoringPointTable: React.FC<ScoringPointTableProps> = ({ details }) => {
    if (!details || details.length === 0) {
        return <div className="no-scoring-details">暂无采分点详情</div>;
    }

    return (
        <div className="scoring-point-table-container">
            <h3 className="section-title">🎯 采分点精准匹配</h3>
            <div className="table-responsive">
                <table className="scoring-point-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>状态</th>
                            <th style={{ width: '60px' }}>得分</th>
                            <th>采分点内容</th>
                            <th>证据 / 建议</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map((item, index) => (
                            <tr key={index} className={`score-row ${item.status}`}>
                                <td className="status-cell">
                                    {item.status === 'full' && <span className="status-badge full">完全命中</span>}
                                    {item.status === 'partial' && <span className="status-badge partial">部分命中</span>}
                                    {item.status === 'missed' && <span className="status-badge missed">未命中</span>}
                                </td>
                                <td className="score-cell">
                                    <span className={item.status === 'missed' ? 'score-zero' : 'score-earned'}>
                                        {item.earned || 0}
                                    </span>
                                    <span className="score-total">/{item.score}</span>
                                </td>
                                <td className="content-cell">
                                    <span className="point-content">{item.point}</span>
                                </td>
                                <td className="evidence-cell">
                                    {item.evidence && (
                                        <div className="evidence-box">
                                            <span className="label">你的作答：</span>
                                            <span className="text">“{item.evidence}”</span>
                                        </div>
                                    )}
                                    {item.missing_keywords && item.missing_keywords.length > 0 && (
                                        <div className="missing-keywords-box">
                                            <span className="label">缺失关键词：</span>
                                            <div className="keywords-list">
                                                {item.missing_keywords.map((kw, i) => (
                                                    <span key={i} className="keyword-tag">{kw}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ScoringPointTable;
