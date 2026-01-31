import MaterialsDesktop from "@/components/desktop/MaterialsDesktop";
import MaterialsMobile from "@/components/mobile/MaterialsMobile";
import { isMobileDevice } from "@/utils/device";
import { materialApi } from "@/services/api";

export const metadata = {
    title: '素材积累 - CivicMind',
    description: '精选申论金句与官方表达素材库',
};

// Revalidate data every hour to keep it fresh but fast
export const revalidate = 3600;

export default async function MaterialsPage() {
    const isMobile = await isMobileDevice();

    // Fetch materials on the server to prevent loading flicker on the client
    const initialMaterials = await materialApi.list().catch(() => []);

    return isMobile ?
        <MaterialsMobile initialData={initialMaterials} /> :
        <MaterialsDesktop initialData={initialMaterials} />;
}
