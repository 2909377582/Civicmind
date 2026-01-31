-- CivicMind 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行此脚本

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 题目表
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    exam_type VARCHAR(50) NOT NULL,
    exam_level VARCHAR(50),
    region VARCHAR(50),
    question_number INTEGER NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    material_refs TEXT[],
    materials_content TEXT,
    word_limit INTEGER,
    score INTEGER NOT NULL,
    difficulty INTEGER DEFAULT 3,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 标准答案表
CREATE TABLE IF NOT EXISTS standard_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    full_answer TEXT NOT NULL,
    answer_outline TEXT,
    source_type VARCHAR(20) NOT NULL,
    source_name VARCHAR(100),
    source_url TEXT,
    review_status VARCHAR(20) DEFAULT 'pending',
    reviewer_id UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    analysis_approach TEXT,
    material_mapping JSONB,
    common_mistakes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 采分点表
CREATE TABLE IF NOT EXISTS scoring_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_id UUID REFERENCES standard_answers(id) ON DELETE CASCADE,
    point_order INTEGER NOT NULL,
    content TEXT NOT NULL,
    score DECIMAL(3,1) NOT NULL,
    keywords TEXT[] NOT NULL,
    synonyms TEXT[],
    must_contain TEXT[],
    semantic_threshold DECIMAL(3,2) DEFAULT 0.70,
    material_ref TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 评分规则表
CREATE TABLE IF NOT EXISTS scoring_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    content_score_ratio DECIMAL(3,2) DEFAULT 0.70,
    format_score_ratio DECIMAL(3,2) DEFAULT 0.15,
    language_score_ratio DECIMAL(3,2) DEFAULT 0.15,
    format_requirements JSONB,
    over_word_penalty DECIMAL(3,1),
    over_word_threshold INTEGER DEFAULT 0,
    under_word_ratio DECIMAL(3,2) DEFAULT 0.8,
    under_word_penalty DECIMAL(3,1) DEFAULT 2,
    format_error_penalty DECIMAL(3,1) DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 用户作答表
CREATE TABLE IF NOT EXISTS user_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    time_spent INTEGER,
    grading_result JSONB,
    is_graded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE
);

-- 7. 素材表
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(200),
    tags TEXT[],
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 用户收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL, -- 'question', 'material', 'answer'
    item_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_questions_year ON questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_exam_type ON questions(exam_type);
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_standard_answers_question ON standard_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_scoring_points_answer ON scoring_points(answer_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question ON user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);

-- 启用 RLS (Row Level Security)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- 创建公开读取策略（题目和素材对所有人可读）
CREATE POLICY "Questions are viewable by everyone" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Approved answers are viewable by everyone" ON standard_answers
    FOR SELECT USING (review_status = 'approved');

CREATE POLICY "Scoring points are viewable by everyone" ON scoring_points
    FOR SELECT USING (true);
    
CREATE POLICY "Materials are viewable by everyone" ON materials
    FOR SELECT USING (true);

-- 用户只能查看自己的作答记录
CREATE POLICY "Users can view own answers" ON user_answers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers" ON user_answers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户收藏策略
CREATE POLICY "Users can manage own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

COMMENT ON TABLE questions IS '真题表';
COMMENT ON TABLE standard_answers IS '标准答案表';
COMMENT ON TABLE scoring_points IS '采分点表';
COMMENT ON TABLE user_answers IS '用户作答记录表';
COMMENT ON TABLE materials IS '素材库';
