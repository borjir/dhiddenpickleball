import { requireStaff } from "@/lib/staff/auth";
import { getStaffReport } from "@/lib/staff/reports";
import { isValidDateId, manilaTodayId, shiftDateId } from "@/lib/staff/time";
import { buildOperationsWorkbook } from "@/lib/staff/xlsx";

export async function GET(request: Request) {
  const { supabase, staff } = await requireStaff();
  const url = new URL(request.url);
  const today = manilaTodayId();
  const requestedFrom = url.searchParams.get("from");
  const requestedTo = url.searchParams.get("to");
  const from = isValidDateId(requestedFrom)
    ? requestedFrom!
    : shiftDateId(today, -29);
  const to = isValidDateId(requestedTo) ? requestedTo! : today;
  const report = await getStaffReport(supabase, from, to);
  const workbook = buildOperationsWorkbook(report, staff.fullName);

  return new Response(workbook, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="D-Hidden-Operations-${report.from}-to-${report.to}.xlsx"`,
      "Cache-Control": "no-store, private",
      "Content-Length": String(workbook.byteLength),
    },
  });
}
