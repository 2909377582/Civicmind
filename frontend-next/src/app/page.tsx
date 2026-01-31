import ExamListDesktop from "@/components/desktop/ExamListDesktop";
import ExamListMobile from "@/components/mobile/ExamListMobile";
import { isMobileDevice } from "@/utils/device";
import { examApi } from "@/services/api";

export default async function Home() {
  const isMobile = await isMobileDevice();

  // Server-side data fetching
  // This allows Next.js to pre-render the page with data
  const initialExams = await examApi.list().catch(() => []);

  return isMobile ?
    <ExamListMobile initialData={initialExams} /> :
    <ExamListDesktop initialData={initialExams} />;
}
