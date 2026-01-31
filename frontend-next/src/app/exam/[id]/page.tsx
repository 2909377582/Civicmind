import { examApi } from "@/services/api";
import type { Exam, Question } from "@/services/api";
import ExamDetailMobile from "@/components/mobile/ExamDetailMobile";
import ExamDetailDesktop from "@/components/desktop/ExamDetailDesktop";
import { isMobileDevice } from "@/utils/device";

export const dynamic = 'force-dynamic';

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let initialExam: Exam | null = null;
    let initialQuestions: Question[] = [];

    try {
        const [exam, questions] = await Promise.all([
            examApi.get(id),
            examApi.questions(id),
        ]);
        initialExam = exam;
        initialQuestions = questions;
    } catch (err) {
        console.error("Failed to fetch exam detail:", err);
        // In a real app, we might return notFound() here if exam is missing
    }

    if (!initialExam) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <span className="text-4xl">⚠️</span>
                    <p className="mt-4 text-gray-600">加载试卷失败或试卷不存在</p>
                </div>
            </div>
        );
    }

    const isMobile = await isMobileDevice();

    return (
        <main className="min-h-screen bg-gray-50">
            {isMobile ? (
                <ExamDetailMobile initialExam={initialExam} initialQuestions={initialQuestions} />
            ) : (
                <ExamDetailDesktop initialExam={initialExam} initialQuestions={initialQuestions} />
            )}
        </main>
    );
}
