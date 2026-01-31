import { examApi } from "@/services/api";
import ExamListMobile from "@/components/mobile/ExamListMobile";
import ExamListDesktop from "@/components/desktop/ExamListDesktop";
import { isMobileDevice } from "@/utils/device";

// Enable Incremental Static Regeneration (ISR) - Cache refreshed every 10 minutes
export const revalidate = 600;

export default async function Home() {
  let initialData: any[] = [];
  try {
    initialData = await examApi.list();
  } catch (err) {
    console.error("Failed to fetch exam list:", err);
  }

  const isMobile = await isMobileDevice();

  return (
    <main className="min-h-screen bg-gray-50">
      {isMobile ? (
        <ExamListMobile initialData={initialData} />
      ) : (
        <ExamListDesktop initialData={initialData} />
      )}
    </main>
  );
}
