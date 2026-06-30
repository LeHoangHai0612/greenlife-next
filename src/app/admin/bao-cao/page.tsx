import { getReport } from "@/app/admin/bao-cao/actions";
import { ReportView } from "@/components/admin/report-view";

export default async function AdminReportPage() {
  const initial = await getReport(null, null);
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold">Báo cáo & phân tích</h2>
      <ReportView initial={initial} />
    </div>
  );
}
