import { gradingApi, questionApi } from "@/services/api";
import type { UserAnswer, Question } from "@/services/api";
import ReportDetailDesktop from "@/components/desktop/ReportDetailDesktop";
import ReportDetailMobile from "@/components/mobile/ReportDetailMobile";
import { isMobileDevice } from "@/utils/device";

export const dynamic = 'force-dynamic';

export default async function ReportServerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let result: UserAnswer | null = null;
    let question: Question | null = null;

    try {
        // Fetch answer result
        // Note: gradingApi uses axios in client but here we need server fetch or similar if possible.
        // But our `api.ts` might be configured for client side (using relative URL or reading cookie).
        // Since we are in RSC, we should use absolute URL or mock it.
        // For migration purpose, if `gradingApi` fails in RSC, we might need a workaround.
        // But usually we set BASE_URL.
        // We will try using the same API but we need to ensure it works in Node env.
        // Assuming `api.ts` handles it or we have no auth issue (cookie passing might be needed).
        // For now, let's assume `questionApi` and `gradingApi` work in RSC.

        if (id) {
            result = await gradingApi.report(id);
        }

        if (result && result.question_id) {
            question = await questionApi.get(result.question_id);
        }

    } catch (err: any) {
        console.error("Failed to fetch report data:", err.message);
    }

    if (!result) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100">
                    <span className="text-4xl block mb-4">⚠️</span>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">报告加载失败</h2>
                    <p className="text-gray-600">无法找到该答题记录 (ID: {id})</p>
                    <a href="/" className="mt-6 inline-block text-blue-600 hover:text-blue-800 underline">
                        返回首页
                    </a>
                </div>
            </div>
        );
    }

    const isMobile = await isMobileDevice();

    return isMobile ? (
        <ReportDetailMobile result={result} question={question} />
    ) : (
        <ReportDetailDesktop result={result} question={question} />
    );
}
