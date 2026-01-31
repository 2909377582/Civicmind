import React from 'react';
import type { LogicAnalysis } from '../services/api';
import './LogicComparisonView.css';

interface LogicComparisonViewProps {
    analysis: LogicAnalysis;
}

const LogicComparisonView: React.FC<LogicComparisonViewProps> = ({ analysis }) => {
    if (!analysis) return null;

    const { user_logic_chain, master_logic_chain, gaps, suggestions } = analysis;

    return (
        <div className="logic-comparison-container">
            <h3 className="section-title">🧠 逻辑链条重构 (思维训练)</h3>

            <div className="logic-columns">
                {/* 你的逻辑列 */}
                <div className="logic-column user-logic">
                    <div className="column-header">
                        <span className="icon">👤</span> 你的逻辑链
                    </div>
                    <div className="steps-container">
                        {user_logic_chain.map((step, i) => (
                            <div key={i} className="logic-step">
                                <div className="step-number">{i + 1}</div>
                                <div className="step-content">{step}</div>
                                {i < user_logic_chain.length - 1 && <div className="step-arrow">↓</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 对比分隔 */}
                <div className="logic-divider">
                    <div className="divider-line"></div>
                    <div className="vs-badge">VS</div>
                    <div className="divider-line"></div>
                </div>

                {/* 高手逻辑列 */}
                <div className="logic-column master-logic">
                    <div className="column-header">
                        <span className="icon">🎓</span> 高手逻辑链 (理想)
                    </div>
                    <div className="steps-container">
                        {master_logic_chain.map((step, i) => (
                            <div key={i} className="logic-step master">
                                <div className="step-number">{i + 1}</div>
                                <div className="step-content">{step}</div>
                                {i < master_logic_chain.length - 1 && <div className="step-arrow">↓</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Gap 分析区域 */}
            {(gaps.length > 0 || suggestions.length > 0) && (
                <div className="logic-analysis-footer">
                    {gaps.length > 0 && (
                        <div className="analysis-block warning">
                            <h4>⚠️ 逻辑断层诊断</h4>
                            <ul>
                                {gaps.map((gap, i) => (
                                    <li key={i}>{gap}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {suggestions.length > 0 && (
                        <div className="analysis-block suggestion">
                            <h4>💡 改进建议</h4>
                            <ul>
                                {suggestions.map((sug, i) => (
                                    <li key={i}>{sug}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LogicComparisonView;
