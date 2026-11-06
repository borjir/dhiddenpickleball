import type { Metadata } from "next";
import Link from "next/link";
import { createWalkInAction } from "@/app/staff/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ArrowLeftIcon, CalendarIcon } from "@/components/ui/icons";
import {
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
} from "@/components/staff/staff-ui";
import { requireStaff } from "@/lib/staff/auth";
import { formatPeso } from "@/lib/bookings";
import { manilaTodayId } from "@/lib/staff/time";

export const metadata: Metadata = {
  title: "New walk-in",
};

type SearchParams = Promise<{
  notice?: string | string[];
  error?: string | string[];
}>;

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

type Court = { id: string; name: string; slug: string };

async function WalkInForm({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const { data: courts } = await supabase
    .from("courts")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");

  const courtRows = (courts ?? []) as Court[];
  const today = manilaTodayId();

  const { data: rates } = await supabase
    .from("service_rates")
    .select("amount_php, starts_at_minute, ends_at_minute")
    .eq("is_active", true)
    .is("day_of_week", null)
    .is("court_id", null)
    .order("starts_at_minute");

  return (
    <>
      <StaffPageHeader
        eyebrow="Walk-in"
        title="Create a court booking"
        description="Use the player's account email so the reservation appears in their history. The booking is confirmed immediately."
        actions={
          <Link
            href="/staff/bookings"
            className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-accent-ink"
          >
            <ArrowLeftIcon className="size-4" />
            Back to bookings
          </Link>
        }
      />

      <div className="mt-5">
        <StaffFlash notice={text(params.notice) || null} error={text(params.error) || null} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <StaffPanel title="Booking details" description="All times are Asia/Manila.">
          <form action={createWalkInAction} className="space-y-4">
            <input type="hidden" name="returnPath" value="/staff/bookings/new" />

            <Field
              id="walkin-email"
              label="Player account email"
              required
              hint="The player must already have a D-Hidden account."
            >
              <Input
                id="walkin-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="player@example.com"
                required
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="walkin-court" label="Court" required>
                <Select id="walkin-court" name="courtId" required defaultValue="">
                  <option value="" disabled>Choose a court</option>
                  {courtRows.map((court) => (
                    <option key={court.id} value={court.id}>{court.name}</option>
                  ))}
                </Select>
              </Field>
              <Field id="walkin-date" label="Date" required>
                <Input id="walkin-date" name="date" type="date" defaultValue={today} required />
              </Field>
              <Field id="walkin-time" label="Start time" required>
                <Input id="walkin-time" name="time" type="time" step={3600} required />
              </Field>
              <Field id="walkin-duration" label="Duration" required>
                <Select id="walkin-duration" name="duration" defaultValue="60" required>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((hours) => (
                    <option key={hours} value={hours * 60}>{hours} hour{hours === 1 ? "" : "s"}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              id="walkin-notes"
              label="Front-desk note"
              optionalLabel
              hint="Visible to staff only."
            >
              <Textarea
                id="walkin-notes"
                name="notes"
                rows={2}
                maxLength={500}
                placeholder="Example: paid at the desk, arriving with two guests"
              />
            </Field>

            <fieldset className="rounded-lg border border-line bg-page/45 p-4">
              <legend className="px-1 text-sm font-bold text-heading">Payment at the desk</legend>
              <label className="mt-2 flex items-start gap-2 text-sm text-ink">
                <input type="checkbox" name="collected" value="yes" className="mt-1 size-4 accent-brand-blue" />
                <span>
                  Payment collected now
                  <span className="mt-0.5 block text-caption text-muted">
                    Leave unchecked to keep the booking confirmed but unpaid.
                  </span>
                </span>
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field id="walkin-method" label="Method">
                  <Select id="walkin-method" name="method" defaultValue="cash">
                    <option value="cash">Cash</option>
                    <option value="gcash">GCash</option>
                    <option value="maya">Maya</option>
                    <option value="bank_transfer">Bank transfer</option>
                  </Select>
                </Field>
                <Field id="walkin-reference" label="Reference" optionalLabel>
                  <Input id="walkin-reference" name="reference" maxLength={120} placeholder="Optional" />
                </Field>
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="max-w-md text-caption leading-relaxed text-muted">
                The database checks operating hours, closures, and overlapping reservations.
                The amount is calculated server-side.
              </p>
              <Button type="submit">Create booking</Button>
            </div>
          </form>
        </StaffPanel>

        <div className="space-y-4">
          <StaffPanel title="At a glance">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-blue-soft text-accent-ink">
                <CalendarIcon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-heading">Open daily</p>
                <p className="mt-1 text-caption leading-relaxed text-muted">
                  7:00 AM – 12:00 AM. Rates change at 5:00 PM.
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">Current rates</p>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">7:00 AM – 5:00 PM</dt>
                  <dd className="font-semibold text-heading">
                    {formatPeso(Number(rates?.[0]?.amount_php ?? 250))}/hr
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">5:00 PM – 12:00 AM</dt>
                  <dd className="font-semibold text-heading">
                    {formatPeso(Number(rates?.[1]?.amount_php ?? 300))}/hr
                  </dd>
                </div>
              </dl>
            </div>
          </StaffPanel>

          <Alert variant="info" title="Account requirement">
            The current schema ties every booking to a player account. If a walk-in does not have
            one, ask them to sign up first, then create the booking here.
          </Alert>
        </div>
      </div>
    </>
  );
}

export default function NewWalkInPage({ searchParams }: { searchParams: SearchParams }) {
  return <WalkInForm searchParams={searchParams} />;
}
