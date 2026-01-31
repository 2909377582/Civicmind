
import { getSupabase } from './src/utils/supabase';

const db = getSupabase();

async function checkExams() {
    console.log('Checking exams...');
    const { data: exams, error } = await db.from('exams').select('id, exam_name, created_at');

    if (error) {
        console.error('Error fetching exams:', error);
        return;
    }

    if (!exams || exams.length === 0) {
        console.log('No exams found.');
        return;
    }

    console.log('Total exams:', exams.length);
    console.table(exams);

    // check for duplicates by name
    const names = exams.map(e => e.exam_name);
    const duplicates = names.filter((item, index) => names.indexOf(item) !== index);
    if (duplicates.length > 0) {
        console.log('Duplicate names found:', duplicates);
    } else {
        console.log('No duplicate names found.');
    }
}

checkExams();
