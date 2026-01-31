/**
 * 应用配置
 */
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    app: {
        name: process.env.APP_NAME || 'CivicMind',
        version: process.env.APP_VERSION || '1.0.0',
        port: parseInt(process.env.PORT || '3000'),
        env: process.env.NODE_ENV || 'development',
    },
    supabase: {
        url: process.env.SUPABASE_URL || '',
        key: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '',
    },
    ai: {
        apiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || '',
        baseUrl: process.env.AI_API_BASE_URL || 'https://api.deepseek.com',
        model: process.env.AI_MODEL || 'deepseek-chat',
        geminiKey: process.env.GEMINI_API_KEY || '',
    },
    security: {
        adminSecret: process.env.ADMIN_SECRET || 'admin123456',
    },
    grading: {
        defaultSemanticThreshold: parseFloat(process.env.DEFAULT_SEMANTIC_THRESHOLD || '0.70'),
    },
};
