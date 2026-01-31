import { questionApi, examApi } from "@/services/api";
import AnswerPage from "@/components/AnswerPage";
import { isMobileDevice } from "@/utils/device";

export const dynamic = 'force-dynamic';

export default async function AnswerServerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let initialQuestion = null;
    let initialExam = null;

    try {
        initialQuestion = await questionApi.get(id);
        if (initialQuestion && initialQuestion.exam_id) {
            try {
                initialExam = await examApi.get(initialQuestion.exam_id);
            } catch (err) {
                console.warn("Failed to fetch exam for question:", err);
                // Ignore exam fetch error, we can still show question
            }
        }
    } catch (err) {
        console.error("Failed to fetch question:", err);
    }

    if (!initialQuestion) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <span className="text-4xl">⚠️</span>
                    <p className="mt-4 text-gray-600">加载题目失败或题目不存在</p>
                </div>
            </div>
        );
    }

    const isMobile = await isMobileDevice();

    return (
        <main className="min-h-screen bg-gray-50">
            <AnswerPage
                initialQuestion={initialQuestion}
                initialExam={initialExam}
                isMobile={isMobile}
            />
        </main>
    );
}
