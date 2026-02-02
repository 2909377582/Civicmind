/**
 * 认证服务
 * 基于 Supabase Auth 实现用户注册、登录、登出等功能
 */
import { getSupabase } from '../utils/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface AuthResult {
    user: User | null;
    session: Session | null;
    error?: string;
}

export class AuthService {
    private db = getSupabase();

    /**
     * 用户注册
     */
    async signUp(email: string, password: string): Promise<AuthResult> {
        const { data, error } = await this.db.auth.signUp({
            email,
            password,
        });

        if (error) {
            console.error('[AuthService] signUp error:', error);
            return {
                user: null,
                session: null,
                error: error.message,
            };
        }

        return {
            user: data.user,
            session: data.session,
        };
    }

    /**
     * 用户登录
     */
    async signIn(email: string, password: string): Promise<AuthResult> {
        const { data, error } = await this.db.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('[AuthService] signIn error:', error);
            return {
                user: null,
                session: null,
                error: error.message,
            };
        }

        return {
            user: data.user,
            session: data.session,
        };
    }

    /**
     * 用户登出
     */
    async signOut(): Promise<{ error?: string }> {
        const { error } = await this.db.auth.signOut();

        if (error) {
            console.error('[AuthService] signOut error:', error);
            return { error: error.message };
        }

        return {};
    }

    /**
     * 验证 JWT Token 并获取用户信息
     */
    async verifyToken(accessToken: string): Promise<User | null> {
        try {
            const { data, error } = await this.db.auth.getUser(accessToken);

            if (error || !data.user) {
                console.error('[AuthService] verifyToken error:', error);
                return null;
            }

            return data.user;
        } catch (err) {
            console.error('[AuthService] verifyToken exception:', err);
            return null;
        }
    }

    /**
     * 获取当前用户（通过 Token）
     */
    async getCurrentUser(accessToken: string): Promise<User | null> {
        return this.verifyToken(accessToken);
    }
}
