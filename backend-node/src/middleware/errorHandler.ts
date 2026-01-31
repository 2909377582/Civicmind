/**
 * 全局错误处理中间件
 */
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('Error:', err.message);
    console.error(err.stack);

    res.status(500).json({
        detail: err.message || '服务器内部错误',
    });
}
