/**
 * 应用配置
 */
import dotenv from 'dotenv';
dotenv.config();

console.log('[Config] Environment Check:', {
    NODE_ENV: process.env.NODE_ENV,
    HAS_SUPABASE_URL: !!process.env.SUPABASE_URL,
    HAS_SUPABASE_KEY: !!process.env.SUPABASE_KEY,
    HAS_SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    HAS_AI_KEY: !!process.env.AI_API_KEY,
    HAS_DEEPSEEK_KEY: !!process.env.DEEPSEEK_API_KEY
});

export const config = {
    app: {
        name: process.env.APP_NAME || 'CivicMind',
        version: process.env.APP_VERSION || '1.0.0',
        port: parseInt(process.env.PORT || '3000'),
        env: process.env.NODE_ENV || 'development',
        allowedOrigins: process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',')
            : [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:3001',
                'http://127.0.0.1:3001',
                'https://www.civicmind.cloud',
                'https://civicmind.cloud'
            ],
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
