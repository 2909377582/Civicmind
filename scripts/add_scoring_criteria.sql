-- 添加 scoring_criteria 字段到 questions 表
-- 用于存储踩分点/评分标准

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS scoring_criteria TEXT[] DEFAULT '{}';

-- 添加注释
COMMENT ON COLUMN questions.scoring_criteria IS '踩分点/评分标准列表';
