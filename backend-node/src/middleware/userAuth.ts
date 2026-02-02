/**
 * 用户认证中间件
 * 验证请求中的 JWT Token，提取用户信息
 */
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { User } from '@supabase/supabase-js';

// 扩展 Express Request 类型以包含 user
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

const authService = new AuthService();

/**
 * 从 Authorization Header 提取 Bearer Token
 */
function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7); // 移除 "Bearer " 前缀
}

/**
 * 强制用户认证中间件
 * 未认证的请求将返回 401 错误
 */
export async function userAuth(req: Request, res: Response, next: NextFunction) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ detail: '请先登录' });
    }

    const user = await authService.verifyToken(token);

    if (!user) {
        return res.status(401).json({ detail: '登录已过期，请重新登录' });
    }

    req.user = user;
    next();
}

/**
 * 可选用户认证中间件
 * 如果提供了有效 Token，则附加用户信息；否则继续处理请求（游客模式）
 */
export async function optionalUserAuth(req: Request, res: Response, next: NextFunction) {
    const token = extractToken(req);

    if (token) {
        const user = await authService.verifyToken(token);
        if (user) {
            req.user = user;
        }
    }

    next();
}
