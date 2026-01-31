/**
 * 管理员鉴权中间件
 */
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function adminAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['x-admin-token'] as string;

    if (!token || token !== config.security.adminSecret) {
        return res.status(401).json({ detail: '未授权访问' });
    }

    next();
}
