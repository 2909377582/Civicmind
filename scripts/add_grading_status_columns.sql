-- 添加异步批改所需的新列到 user_answers 表
-- 执行时间: 2026-01-30

-- 添加批改状态列
ALTER TABLE user_answers 
ADD COLUMN IF NOT EXISTS grading_status VARCHAR(20) DEFAULT 'pending';

-- 添加批改错误信息列
ALTER TABLE user_answers 
ADD COLUMN IF NOT EXISTS grading_error TEXT;

-- 为现有已批改的记录更新状态
UPDATE user_answers 
SET grading_status = 'completed' 
WHERE is_graded = true AND grading_status IS NULL;

-- 为未批改的记录设置pending状态
UPDATE user_answers 
SET grading_status = 'pending' 
WHERE is_graded = false AND grading_status IS NULL;

-- 添加索引以加速状态查询
CREATE INDEX IF NOT EXISTS idx_user_answers_grading_status 
ON user_answers(grading_status);

-- 验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_answers' 
  AND column_name IN ('grading_status', 'grading_error');
