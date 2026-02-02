/**
 * 认证 API 路由
 * 处理用户注册、登录、登出等请求
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';
import { userAuth } from '../middleware/userAuth';

const router = Router();
const authService = new AuthService();

// 注册/登录请求验证
const AuthSchema = z.object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少6位'),
});

/**
 * 用户注册
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const parsed = AuthSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ detail: parsed.error.issues[0].message });
        }

        const { email, password } = parsed.data;
        const result = await authService.signUp(email, password);

        if (result.error) {
            // 处理常见的 Supabase 错误消息
            let errorMessage = result.error;
            if (result.error.includes('already registered')) {
                errorMessage = '该邮箱已被注册';
            } else if (result.error.includes('invalid')) {
                errorMessage = '邮箱格式不正确';
            }
            return res.status(400).json({ detail: errorMessage });
        }

        res.status(201).json({
            message: '注册成功',
            user: result.user ? {
                id: result.user.id,
                email: result.user.email,
            } : null,
            session: result.session ? {
                access_token: result.session.access_token,
                refresh_token: result.session.refresh_token,
                expires_at: result.session.expires_at,
            } : null,
        });
    } catch (error: any) {
        console.error('[Auth] register error:', error);
        res.status(500).json({ detail: '注册失败，请稍后重试' });
    }
});

/**
 * 用户登录
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const parsed = AuthSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ detail: parsed.error.issues[0].message });
        }

        const { email, password } = parsed.data;
        const result = await authService.signIn(email, password);

        if (result.error) {
            // 处理常见的 Supabase 错误消息
            let errorMessage = result.error;
            if (result.error.includes('Invalid login credentials')) {
                errorMessage = '邮箱或密码错误';
            } else if (result.error.includes('Email not confirmed')) {
                errorMessage = '请先验证邮箱';
            }
            return res.status(401).json({ detail: errorMessage });
        }

        res.json({
            message: '登录成功',
            user: result.user ? {
                id: result.user.id,
                email: result.user.email,
            } : null,
            session: result.session ? {
                access_token: result.session.access_token,
                refresh_token: result.session.refresh_token,
                expires_at: result.session.expires_at,
            } : null,
        });
    } catch (error: any) {
        console.error('[Auth] login error:', error);
        res.status(500).json({ detail: '登录失败，请稍后重试' });
    }
});

/**
 * 用户登出
 */
router.post('/logout', async (req: Request, res: Response) => {
    try {
        const result = await authService.signOut();

        if (result.error) {
            return res.status(500).json({ detail: result.error });
        }

        res.json({ message: '已登出' });
    } catch (error: any) {
        console.error('[Auth] logout error:', error);
        res.status(500).json({ detail: '登出失败' });
    }
});

/**
 * 获取当前用户信息
 */
router.get('/me', userAuth, async (req: Request, res: Response) => {
    try {
        res.json({
            user: {
                id: req.user!.id,
                email: req.user!.email,
                created_at: req.user!.created_at,
            },
        });
    } catch (error: any) {
        console.error('[Auth] me error:', error);
        res.status(500).json({ detail: '获取用户信息失败' });
    }
});

export default router;
