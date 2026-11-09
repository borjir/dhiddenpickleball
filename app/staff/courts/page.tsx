import type { Metadata } from "next";
import {
  createCourtClosureAction,
  deleteCourtClosureAction,
} from "@/app/staff/actions";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { CalendarIcon, CourtIcon, PlusIcon } from "@/components/ui/icons";
import { ConfirmSubmitButton } from "@/components/staff/confirm-submit-button";
import {
  StaffEmpty,
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
} from "@/components/staff/staff-ui";
import { requireStaff } from "@/lib/staff/auth";
import {
  formatStaffDateTime,
  manilaTodayId,
} from "@/lib/staff/time";

export const metadata: Metadata = {
  title: "Courts",
};

type SearchParams = Promise<{
  notice?: string | string[];
  error?: string | string[];
}>;

type Court = { id: string; name: string; slug: string };
type Closure = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  court: { name: string } | null;
};

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function Courts({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const now = new Date().toISOString();
  const [courtsResult, closuresResult] = await Promise.all([
    supabase
      .from("courts")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("court_closures")
      .select("id, starts_at, ends_at, reason, court:courts(name)")
      .gte("ends_at", now)
      .order("starts_at", { ascending: true })
      .limit(40),
  ]);

  const courts = (courtsResult.data ?? []) as Court[];
  const closures = (closuresResult.data ?? []) as unknown as Closure[];

  return (
    <>
      <StaffPageHeader
        eyebrow="Availability"
        title="Court blocks"
        description="Block maintenance, private events, or a whole-club closure. Blocked time disappears from online availability immediately."
      />

      <div className="mt-5">
        <StaffFlash notice={text(params.notice) || null} error={text(params.error) || null} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <StaffPanel
          title="Upcoming blocks"
          description="Shown in Asia/Manila time."
          action={<Badge variant="neutral">{closures.length} upcoming</Badge>}
        >
          {closuresResult.error ? (
            <p className="text-sm text-danger">Court blocks could not be loaded.</p>
          ) : null}

          {!closuresResult.error && closures.length === 0 ? (
            <StaffEmpty
              icon={CalendarIcon}
              title="No court blocks"
              description="Both courts are following their normal operating hours. Add a block when a court needs to come offline."
            />
          ) : null}

          {closures.length > 0 ? (
            <div className="space-y-2">
              {closures.map((closure) => (
                <div
                  key={closure.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-page/50 px-3.5 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={closure.court ? "warning" : "danger"}>
                        {closure.court?.name ?? "All courts"}
                      </Badge>
                      <span className="text-sm font-bold text-heading">{closure.reason}</span>
                    </div>
                    <p className="mt-1 text-caption text-muted">
                      {formatStaffDateTime(closure.starts_at)} → {formatStaffDateTime(closure.ends_at)}
                    </p>
                  </div>
                  <form action={deleteCourtClosureAction}>
                    <input type="hidden" name="closureId" value={closure.id} />
                    <ConfirmSubmitButton
                      message="Remove this court block? Availability will open again."
                      variant="secondary"
                      size="sm"
                      className="text-danger hover:border-danger/40 hover:bg-danger-soft"
                    >
                      Remove
                    </ConfirmSubmitButton>
                  </form>
                </div>
              ))}
            </div>
          ) : null}
        </StaffPanel>

        <StaffPanel
          title="Add a block"
          description="Choose one court or the whole club."
          className="order-first xl:order-none"
        >
          <form action={createCourtClosureAction} className="space-y-3">
            <Field id="block-court" label="Court" required>
              <Select id="block-court" name="courtId" defaultValue="all">
                <option value="all">All courts</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>{court.name}</option>
                ))}
              </Select>
            </Field>
            <Field id="block-date" label="Date" required>
              <Input id="block-date" name="date" type="date" defaultValue={manilaTodayId()} required />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field id="block-start" label="From" required>
                <Input id="block-start" name="startTime" type="time" defaultValue="08:00" required />
              </Field>
              <Field id="block-end" label="To" required>
                <Input id="block-end" name="endTime" type="time" defaultValue="09:00" required />
              </Field>
            </div>
            <Field
              id="block-reason"
              label="Reason"
              required
              hint="Visible to staff. Keep it factual."
            >
              <Textarea
                id="block-reason"
                name="reason"
                rows={2}
                maxLength={300}
                placeholder="Example: Court 2 net repair"
                required
              />
            </Field>
            <SubmitButton className="w-full" pendingLabel="Saving block…">
              <PlusIcon className="size-4" />
              Save block
            </SubmitButton>
          </form>
        </StaffPanel>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {courts.map((court) => (
          <div
            key={court.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-card"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-brand-blue-soft text-accent-ink ring-1 ring-brand-blue/10">
              <CourtIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-heading">{court.name}</p>
              <p className="mt-0.5 text-caption text-muted">Open daily 7:00 AM – 12:00 AM</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-lime-soft px-2.5 py-1 text-[0.625rem] font-bold text-brand-lime-ink">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-lime" />
              Bookable
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function StaffCourtsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Courts searchParams={searchParams} />;
}
