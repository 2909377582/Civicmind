import HistoryDesktop from "@/components/desktop/HistoryDesktop";
import HistoryMobile from "@/components/mobile/HistoryMobile";
import { isMobileDevice } from "@/utils/device";
import { gradingApi } from "@/services/api";

export const metadata = {
    title: '我的练习历史 - CivicMind',
    description: '查看您的申论练习历史及批改报告',
};

// History changes frequently, so we force-dynamic or use a small revalidate
export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
    const isMobile = await isMobileDevice();

    // Fetch history on the server
    const initialHistory = await gradingApi.history().catch(() => []);

    return isMobile ?
        <HistoryMobile initialData={initialHistory} /> :
        <HistoryDesktop initialData={initialHistory} />;
}
