'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import './auth.css';

export default function AuthPage() {
    const router = useRouter();
    const { signIn, signUp } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 基础验证
        if (!email || !password) {
            setError('请填写邮箱和密码');
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        if (password.length < 6) {
            setError('密码至少6位');
            return;
        }

        setLoading(true);

        try {
            const result = isLogin
                ? await signIn(email, password)
                : await signUp(email, password);

            if (result.error) {
                setError(result.error);
            } else {
                router.push('/');
            }
        } catch (err: any) {
            setError(err.message || '操作失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        router.push('/');
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1 className="auth-logo">🎓 CivicMind</h1>
                    <p className="auth-subtitle">公考申论智能批改系统</p>
                </div>

                <div className="auth-card">
                    <div className="auth-tabs">
                        <button
                            className={`auth-tab ${isLogin ? 'active' : ''}`}
                            onClick={() => { setIsLogin(true); setError(''); }}
                        >
                            登录
                        </button>
                        <button
                            className={`auth-tab ${!isLogin ? 'active' : ''}`}
                            onClick={() => { setIsLogin(false); setError(''); }}
                        >
                            注册
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {error && <div className="auth-error">{error}</div>}

                        <div className="auth-field">
                            <label htmlFor="email">邮箱</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="请输入邮箱"
                                autoComplete="email"
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="password">密码</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="请输入密码（至少6位）"
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                            />
                        </div>

                        {!isLogin && (
                            <div className="auth-field">
                                <label htmlFor="confirmPassword">确认密码</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="请再次输入密码"
                                    autoComplete="new-password"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={loading}
                        >
                            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
                        </button>
                    </form>

                    <div className="auth-skip">
                        <button onClick={handleSkip} className="auth-skip-btn">
                            暂不登录，先体验一下 →
                        </button>
                        <p className="auth-skip-note">
                            未登录状态下批改记录不会保存到账户
                        </p>
                    </div>
                </div>

                <div className="auth-features">
                    <div className="feature">
                        <span className="feature-icon">📝</span>
                        <span>AI 智能批改</span>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">📊</span>
                        <span>个人练习记录</span>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">🎯</span>
                        <span>精准得分分析</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
