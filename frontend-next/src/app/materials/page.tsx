import MaterialsDesktop from "@/components/desktop/MaterialsDesktop";
import MaterialsMobile from "@/components/mobile/MaterialsMobile";
import { isMobileDevice } from "@/utils/device";

export const metadata = {
    title: '素材积累 - CivicMind',
    description: '精选申论金句与官方表达素材库',
};

export default async function MaterialsPage() {
    const isMobile = await isMobileDevice();

    return isMobile ? <MaterialsMobile /> : <MaterialsDesktop />;
}
