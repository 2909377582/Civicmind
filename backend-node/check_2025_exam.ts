
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function check2025Exam() {
    console.log('🔍 检查 2025 年的试卷...');

    // 1. 查找 2025 年试卷
    const { data: exams, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('year', 2025);

    if (examError) {
        console.error('查询试卷失败:', examError);
        return;
    }

    if (!exams || exams.length === 0) {
        console.log('⚠️ 未找到 2025 年的试卷。');
        return;
    }

    console.log(`✅ 找到 ${exams.length} 套 2025 年试卷:`);

    for (const exam of exams) {
        console.log(`\n📄 [试卷ID: ${exam.id}] ${exam.title || exam.exam_name}`);

        // 2. 查找该试卷的题目
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('id, title, question_number')
            .eq('exam_id', exam.id);

        if (qError) {
            console.error('   ❌ 查询题目失败:', qError);
        } else {
            console.log(`   📝 包含题目数量: ${questions?.length || 0}`);
            questions?.forEach(q => {
                console.log(`      - 第${q.question_number}题: ${q.title.substring(0, 20)}...`);
            });
        }
    }
}

check2025Exam();
