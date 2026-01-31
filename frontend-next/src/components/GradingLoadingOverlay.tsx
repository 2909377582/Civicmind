import React, { useState, useEffect } from 'react';
import './GradingLoadingOverlay.css';

interface GradingLoadingOverlayProps {
    isVisible: boolean;
    status: {
        status: string;
        progress: number;
        message: string;
        error?: string;
    };
    onClose: () => void;
    onViewResult: () => void;
}

const PHASES = [
    { progress: 10, message: "📤 正在准备答案数据...", duration: 3000 },
    { progress: 30, message: "👀 AI 阅卷官正在通读全文，感知立意...", duration: 12000 },
    { progress: 50, message: "🧠 正在重构文章逻辑链，对比高手思路...", duration: 15000 },
    { progress: 75, message: "🎯 正在逐个核对采分点，寻找得分证据...", duration: 12000 },
    { progress: 90, message: "📝 正在生成综合评价与润色建议...", duration: 8000 }
];

const GradingLoadingOverlay: React.FC<GradingLoadingOverlayProps> = ({
    isVisible,
    status,
    onClose,
    onViewResult
}) => {
    const [simulatedProgress, setSimulatedProgress] = useState(0);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [customMessage, setCustomMessage] = useState("");

    // Reset state when shown
    useEffect(() => {
        if (isVisible && status.status === 'pending') {
            setSimulatedProgress(0);
            setCurrentPhaseIndex(0);
            setCustomMessage("");
        }
    }, [isVisible, status.status]);

    // Simulation Timer Logic
    useEffect(() => {
        if (!isVisible || (status.status !== 'processing' && status.status !== 'pending')) return;

        let startTime = Date.now();
        let animationFrame: number;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;

            // Current phase logic
            const phase = PHASES[currentPhaseIndex];

            if (phase) {
                const prevTarget = currentPhaseIndex > 0 ? PHASES[currentPhaseIndex - 1].progress : 0;
                const nextTarget = phase.progress;

                const phaseCompletion = Math.min(1, elapsed / phase.duration);
                const currentSimulated = prevTarget + (nextTarget - prevTarget) * phaseCompletion;

                setSimulatedProgress(currentSimulated);
                setCustomMessage(phase.message);

                if (elapsed >= phase.duration) {
                    if (currentPhaseIndex < PHASES.length - 1) {
                        setCurrentPhaseIndex(prev => prev + 1);
                        startTime = Date.now();
                    }
                }
            }

            if (status.progress > simulatedProgress) {
                if (status.progress - simulatedProgress > 10) {
                    setSimulatedProgress(status.progress);
                }
            }

            if (status.status === 'processing' || status.status === 'pending') {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [isVisible, status.status, currentPhaseIndex, simulatedProgress, status.progress]);

    // completion effect
    useEffect(() => {
        if (status.status === 'completed') {
            setSimulatedProgress(100);
            setCustomMessage("✅ 批改完成！");
        }
    }, [status.status]);


    if (!isVisible) return null;

    const isError = status.status === 'error';
    const isCompleted = status.status === 'completed';

    return (
        <div className="grading-overlay">
            <div className="grading-card">
                <div className="card-header">
                    {isCompleted ? (
                        <div className="icon-wrapper success">🎉</div>
                    ) : isError ? (
                        <div className="icon-wrapper error">❌</div>
                    ) : (
                        <div className="icon-wrapper processing">
                            <span className="spinner">🧠</span>
                        </div>
                    )}
                    <h3>{isCompleted ? '批改完成' : isError ? '出错了' : 'AI 阅卷中'}</h3>
                </div>

                <div className="card-body">
                    {/* Progress Bar */}
                    <div className="progress-track">
                        <div
                            className={`progress-fill-global ${status.status}`}
                            style={{ width: `${isCompleted ? 100 : simulatedProgress}%` }}
                        />
                    </div>

                    <div className="status-text">
                        {isError ? (
                            <span className="error-msg">{status.error || status.message}</span>
                        ) : (
                            <span className="phase-msg">{customMessage || status.message}</span>
                        )}
                        {!isError && <span className="percent">{Math.round(simulatedProgress)}%</span>}
                    </div>

                    {/* Fun hints during wait */}
                    {!isCompleted && !isError && (
                        <div className="fun-fact">
                            💡 提示：AI 正在进行深度思维链分析，通常需要 45-60 秒，请耐心等待...
                        </div>
                    )}

                    {/* Error Details */}
                    {isError && (
                        <div className="error-details">
                            <p>请重试或联系管理员</p>
                        </div>
                    )}
                </div>

                <div className="card-footer">
                    {isCompleted ? (
                        <button className="btn-primary" onClick={onViewResult}>
                            查看分数并阅读报告
                        </button>
                    ) : isError ? (
                        <button className="btn-secondary" onClick={onClose}>
                            关闭
                        </button>
                    ) : (
                        <button className="btn-text" onClick={onClose}>
                            后台处理中 (可关闭窗口)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GradingLoadingOverlay;
