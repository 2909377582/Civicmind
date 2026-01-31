
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInsert() {
    console.log('🔍 模拟插入 2025 年题目...');

    // 1. 获取刚刚创建的那个空试卷
    const { data: exam } = await supabase
        .from('exams')
        .select('*')
        .eq('year', 2025)
        .single();

    if (!exam) {
        console.error('❌ 找不到 2025 试卷');
        return;
    }
    console.log('✅ 找到试卷:', exam.id, exam.exam_name);

    // 2. 尝试插入一个题目 (数据来自日志)
    const questionData = {
        exam_id: exam.id,
        year: 2025,
        exam_type: '省考',
        question_number: 1,
        question_type: '归纳概括',
        title: '建立多元投入机制：按照“省里补助一点，县里配套一点，村民自筹一点”原则...',
        materials_content: '', // 假设为空
        word_limit: 200,
        score: 15,
        material_refs: ["资料1"],
        scoring_criteria: ["资金投入", "考核制度"]
    };

    console.log('🚀 尝试插入题目:', JSON.stringify(questionData, null, 2));

    const { data: q, error: qError } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single();

    if (qError) {
        console.error('❌ 插入题目失败:', qError);
    } else {
        console.log('✅ 插入题目成功:', q.id);
    }
}

debugInsert();
