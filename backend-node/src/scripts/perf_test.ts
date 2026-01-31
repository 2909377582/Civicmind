
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

async function runTest() {
    try {
        console.log('Fetching questions...');
        const questionsRes = await axios.get(`${BASE_URL}/questions`, {
            params: { page: 1, limit: 1 }
        });

        const questions = questionsRes.data.data || questionsRes.data;
        if (!questions || questions.length === 0) {
            console.error('No questions found!');
            return;
        }

        const questionId = questions[0].id;
        console.log(`Found question ID: ${questionId}`);

        console.log('Submitting answer for grading...');
        const submitStart = Date.now();
        const submitRes = await axios.post(`${BASE_URL}/grading/submit`, {
            question_id: questionId,
            content: "申论是公务员考试的重要组成部分，主要考察考生的阅读理解能力、综合分析能力、提出和解决问题能力以及文字表达能力。在这个问题中，我们需要关注如何通过制度创新来推动社会治理现代化。首先，要建立健全法律法规...",
            time_spent: 300
        });

        console.log(`Submission successful! Status: ${submitRes.status}`);
        console.log(`Client-side Total Time: ${Date.now() - submitStart}ms`);
        console.log('Grading Result Summary:', {
            total_score: submitRes.data.grading_result?.total_score,
            ai_comment: submitRes.data.grading_result?.ai_feedback?.overall_comment?.substring(0, 50) + '...'
        });

    } catch (error: any) {
        console.error('Error during test:', error.response?.data || error.message);
    }
}

runTest();
