/**
 * 认证上下文
 * 管理用户登录状态和认证操作
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import type { AuthUser, AuthSession } from '../services/api';

interface AuthContextType {
    user: AuthUser | null;
    session: AuthSession | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<{ error?: string }>;
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// localStorage keys
const STORAGE_KEY_USER = 'civicmind_user';
const STORAGE_KEY_SESSION = 'civicmind_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);

    // 初始化：从 localStorage 恢复会话
    useEffect(() => {
        const savedUser = localStorage.getItem(STORAGE_KEY_USER);
        const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);

        if (savedUser && savedSession) {
            try {
                const parsedUser = JSON.parse(savedUser);
                const parsedSession = JSON.parse(savedSession);

                // 检查 token 是否过期
                if (parsedSession.expires_at && Date.now() / 1000 < parsedSession.expires_at) {
                    setUser(parsedUser);
                    setSession(parsedSession);
                } else {
                    // Token 过期，清除存储
                    localStorage.removeItem(STORAGE_KEY_USER);
                    localStorage.removeItem(STORAGE_KEY_SESSION);
                }
            } catch (e) {
                console.error('Failed to parse saved auth data:', e);
                localStorage.removeItem(STORAGE_KEY_USER);
                localStorage.removeItem(STORAGE_KEY_SESSION);
            }
        }
        setLoading(false);
    }, []);

    // 保存会话到 localStorage
    const saveSession = useCallback((user: AuthUser | null, session: AuthSession | null) => {
        if (user && session) {
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
            localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
        } else {
            localStorage.removeItem(STORAGE_KEY_USER);
            localStorage.removeItem(STORAGE_KEY_SESSION);
        }
    }, []);

    // 注册
    const signUp = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
        try {
            const result = await authApi.register(email, password);

            if (result.user && result.session) {
                setUser(result.user);
                setSession(result.session);
                saveSession(result.user, result.session);
            }

            return {};
        } catch (error: any) {
            console.error('Sign up error:', error);
            return { error: error.message || '注册失败' };
        }
    }, [saveSession]);

    // 登录
    const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
        try {
            const result = await authApi.login(email, password);

            if (result.user && result.session) {
                setUser(result.user);
                setSession(result.session);
                saveSession(result.user, result.session);
            }

            return {};
        } catch (error: any) {
            console.error('Sign in error:', error);
            return { error: error.message || '登录失败' };
        }
    }, [saveSession]);

    // 登出
    const signOut = useCallback(async () => {
        try {
            await authApi.logout();
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            setUser(null);
            setSession(null);
            saveSession(null, null);
        }
    }, [saveSession]);

    return (
        <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

/**
 * 获取当前的认证 Token
 * 用于 API 请求附加 Authorization Header
 */
export function getAuthToken(): string | null {
    const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!savedSession) return null;

    try {
        const session = JSON.parse(savedSession);
        // 检查是否过期
        if (session.expires_at && Date.now() / 1000 < session.expires_at) {
            return session.access_token;
        }
    } catch (e) {
        console.error('Failed to parse session:', e);
    }

    return null;
}
