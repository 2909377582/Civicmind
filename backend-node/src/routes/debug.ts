
import express from 'express';
import { getSupabase } from '../utils/supabase';

const router = express.Router();
const supabase = getSupabase();

router.get('/db-check', async (req, res) => {
    try {
        const results: any = {};

        // Check answers table (old/wrong one)
        const { count: answersCount, error: answersError } = await supabase
            .from('answers')
            .select('*', { count: 'exact', head: true });
        results.answers_table = { count: answersCount, error: answersError };

        // Check standard_answers table (correct one)
        const { count: saCount, error: saError } = await supabase
            .from('standard_answers')
            .select('*', { count: 'exact', head: true });
        results.standard_answers_table = { count: saCount, error: saError };

        // Test insert into 'answers' table with scoring_points
        const testId = '00000000-0000-0000-0000-000000000000'; // Dummy ID
        // Need a valid question ID? Or can I insert with dummy? UUID FK might fail if question doesn't exist.
        // I will try to fetch a valid question first.

        const { data: qData } = await supabase.from('questions').select('id').limit(1).single();
        if (qData) {
            const { error: insertError } = await supabase.from('answers').insert({
                question_id: qData.id,
                full_answer: 'Test Answer',
                scoring_points: [{ content: 'Test Point', score: 1 }],
                source_type: 'test'
            });
            results.test_insert_answers = { success: !insertError, error: insertError };
        } else {
            results.test_insert_answers = { error: 'No questions found to link' };
        }

        // Get recent standard answers
        const { data: recent, error: recentError } = await supabase
            .from('standard_answers')
            .select('id, question_id, created_at, full_answer')
            .order('created_at', { ascending: false })
            .limit(5);
        results.recent_standard_answers = { data: recent, error: recentError };

        res.json(results);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
