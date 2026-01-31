import HistoryDesktop from "@/components/desktop/HistoryDesktop";
import HistoryMobile from "@/components/mobile/HistoryMobile";
import { isMobileDevice } from "@/utils/device";

export const metadata = {
    title: '我的练习历史 - CivicMind',
    description: '查看您的申论练习历史及批改报告',
};

export default async function HistoryPage() {
    const isMobile = await isMobileDevice();

    return isMobile ? <HistoryMobile /> : <HistoryDesktop />;
}
