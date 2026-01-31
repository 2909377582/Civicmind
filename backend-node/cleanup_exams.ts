
import { getSupabase } from './src/utils/supabase';

const db = getSupabase();

async function cleanupExams() {
    console.log('Cleaning up duplicate exams...');
    const { data: exams, error } = await db.from('exams').select('id, exam_name, created_at').order('created_at', { ascending: true });

    if (error || !exams) {
        console.error('Error fetching exams:', error);
        return;
    }

    const seenNames = new Set();
    const toDelete: string[] = [];

    for (const exam of exams) {
        if (seenNames.has(exam.exam_name)) {
            console.log(`Found duplicate: ${exam.exam_name} (ID: ${exam.id})`);
            toDelete.push(exam.id);
        } else {
            seenNames.add(exam.exam_name);
        }
    }

    if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicates...`);
        const { error: deleteError } = await db.from('exams').delete().in('id', toDelete);
        if (deleteError) {
            console.error('Delete failed:', deleteError);
        } else {
            console.log('Duplicates deleted successfully.');
        }
    } else {
        console.log('No duplicates found.');
    }
}

cleanupExams();
