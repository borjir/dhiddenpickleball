import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { BookingSummary } from "@/components/ui/booking-summary";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PaymentInstructions } from "@/components/ui/payment-instructions";
import { PolicyNotice } from "@/components/ui/policy-notice";
import { StatusPair } from "@/components/ui/status-pair";
import { Stepper } from "@/components/ui/stepper";
import { Logo } from "@/components/brand/logo";
import { MediaPlaceholder } from "@/components/brand/media-placeholder";
import { ModalPreview } from "@/components/ui/modal-preview";
import { SlotPickerDemo } from "@/components/ui/slot-picker-demo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "Design system",
  description:
    "Phase 3 design tokens and booking-interface component reference for Hidden Pickleball Court & Bistro.",
};

const colors = [
  { name: "Brand navy", token: "--color-brand-navy", hex: "#123B78", className: "bg-brand-navy", use: "Headings, navigation, footer" },
  { name: "Navy deep", token: "--color-brand-navy-deep", hex: "#0B2A58", className: "bg-brand-navy-deep", use: "Pressed navy, dark bands" },
  { name: "Court blue", token: "--color-brand-blue", hex: "#1674D5", className: "bg-brand-blue", use: "Primary actions, links" },
  { name: "Blue strong", token: "--color-brand-blue-strong", hex: "#0F5CB0", className: "bg-brand-blue-strong", use: "Primary hover" },
  { name: "Blue soft", token: "--color-brand-blue-soft", hex: "#E7F1FC", className: "bg-brand-blue-soft", use: "Selected and info surfaces" },
  { name: "Lime", token: "--color-brand-lime", hex: "#78B51B", className: "bg-brand-lime", use: "Availability accents only" },
  { name: "Lime ink", token: "--color-brand-lime-ink", hex: "#3F6B0A", className: "bg-brand-lime-ink", use: "Text on lime tints" },
  { name: "Lime soft", token: "--color-brand-lime-soft", hex: "#EDF6DC", className: "bg-brand-lime-soft", use: "Available-state fills" },
  { name: "Pickleball yellow", token: "--color-brand-yellow", hex: "#F0E51C", className: "bg-brand-yellow", use: "Small highlights, selection" },
  { name: "Yellow soft", token: "--color-brand-yellow-soft", hex: "#FBF6CC", className: "bg-brand-yellow-soft", use: "Sparse badge fills" },
  { name: "Page", token: "--color-page", hex: "#F8FAF1", className: "bg-page border border-line", use: "Page background" },
  { name: "Surface", token: "--color-surface", hex: "#FFFFFF", className: "bg-surface border border-line", use: "Cards, forms, dialogs" },
  { name: "Ink", token: "--color-ink", hex: "#171A1F", className: "bg-ink", use: "Primary body text" },
  { name: "Muted", token: "--color-muted", hex: "#667085", className: "bg-muted", use: "Secondary text, hints" },
  { name: "Line", token: "--color-line", hex: "#E4E8ED", className: "bg-line", use: "Borders, dividers" },
  { name: "Line strong", token: "--color-line-strong", hex: "#C9D2DC", className: "bg-line-strong", use: "Placeholder outlines" },
];

const statusColors = [
  { name: "Success", token: "--color-success", hex: "#18794E", className: "bg-success", use: "Paid, confirmed, available" },
  { name: "Success soft", token: "--color-success-soft", hex: "#E8F5EE", className: "bg-success-soft border border-line", use: "Success surfaces" },
  { name: "Warning", token: "--color-warning", hex: "#9A5B00", className: "bg-warning", use: "Pending, awaiting review" },
  { name: "Warning soft", token: "--color-warning-soft", hex: "#FFF4DE", className: "bg-warning-soft border border-line", use: "Warning surfaces" },
  { name: "Danger", token: "--color-danger", hex: "#B42318", className: "bg-danger", use: "Errors, rejected, no-show" },
  { name: "Danger soft", token: "--color-danger-soft", hex: "#FDECEA", className: "bg-danger-soft border border-line", use: "Error surfaces" },
  { name: "Info", token: "--color-info", hex: "#175CD3", className: "bg-info", use: "Neutral guidance" },
  { name: "Info soft", token: "--color-info-soft", hex: "#E8F0FD", className: "bg-info-soft border border-line", use: "Informational surfaces" },
];

const typeScale = [
  { name: "Display", sample: "Court time, well spent.", className: "text-display font-display font-extrabold text-heading" },
  { name: "Title", sample: "Reserve a court", className: "text-title font-display font-bold text-heading" },
  { name: "Heading", sample: "What to expect at the club", className: "text-heading font-display font-semibold text-heading" },
  { name: "Body large", sample: "Book a court, join open play, and keep track of what you owe — all in one place.", className: "text-body-lg text-ink" },
  { name: "Body", sample: "Every booking shows its payment status in plain language, including when proof is still waiting for staff review.", className: "text-body text-ink" },
  { name: "Caption", sample: "Prices, schedules, and policies are confirmed by the club before launch.", className: "text-caption text-muted" },
  { name: "Eyebrow", sample: "Court reservations", className: "text-eyebrow font-bold uppercase text-accent-ink" },
];

const spacing = [
  { name: "1", className: "w-1" },
  { name: "2", className: "w-2" },
  { name: "3", className: "w-3" },
  { name: "4", className: "w-4" },
  { name: "6", className: "w-6" },
  { name: "8", className: "w-8" },
  { name: "12", className: "w-12" },
  { name: "16", className: "w-16" },
  { name: "24", className: "w-24" },
  { name: "32", className: "w-32" },
];

const radii = [
  { name: "sm", className: "rounded-sm", value: "6px" },
  { name: "md", className: "rounded-md", value: "10px" },
  { name: "lg", className: "rounded-lg", value: "14px" },
  { name: "xl", className: "rounded-xl", value: "20px" },
];

const bookingStatuses: Array<{ label: string; variant: BadgeVariant }> = [
  { label: "Confirmed", variant: "success" },
  { label: "Pending", variant: "warning" },
  { label: "Cancelled", variant: "neutral" },
  { label: "Completed", variant: "info" },
  { label: "No-show", variant: "danger" },
];

const paymentStatuses: Array<{ label: string; variant: BadgeVariant }> = [
  { label: "Unpaid", variant: "neutral" },
  { label: "Awaiting proof", variant: "blue" },
  { label: "Awaiting verification", variant: "warning" },
  { label: "Paid", variant: "success" },
  { label: "Rejected", variant: "danger" },
  { label: "Refund pending", variant: "info" },
  { label: "Refunded", variant: "neutral" },
];

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-eyebrow font-bold uppercase text-accent-ink">
        {eyebrow}
      </p>
      <h2 id={id} className="mt-2 text-title font-bold text-heading">
        {title}
      </h2>
      <p className="mt-2 text-body text-muted">{description}</p>
    </div>
  );
}

const toc = [
  ["colors", "Color"],
  ["status-colors", "Status color"],
  ["typography", "Typography"],
  ["spacing", "Spacing"],
  ["shape", "Shape & elevation"],
  ["buttons", "Buttons"],
  ["forms", "Form controls"],
  ["badges", "Status badges"],
  ["alerts", "Alerts"],
  ["booking-components", "Booking components"],
  ["surfaces", "Cards & states"],
  ["calendar", "Calendar & time slots"],
  ["table", "Tables"],
  ["modal", "Dialog"],
  ["motion", "Motion & accessibility"],
] as const;

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8">
      <header className="border-b border-line pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo size={56} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/design-preview/booking"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink underline decoration-brand-blue/30 underline-offset-4 hover:decoration-brand-blue"
            >
              Booking flow preview
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink underline decoration-brand-blue/30 underline-offset-4 hover:decoration-brand-blue"
            >
              Homepage
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <p className="mt-8 text-eyebrow font-bold uppercase text-accent-ink">
          Phase 3 · Design reference
        </p>
        <h1 className="mt-3 max-w-3xl text-title font-bold text-heading">
          Design system and booking interface
        </h1>
        <p className="mt-3 max-w-2xl text-body text-muted">
          Tokens, controls, and booking-flow components for the club experience.
          Colors are sampled from the supplied logo file and still need the
          client&rsquo;s written sign-off. Component behaviors shown here are
          previews, not completed booking features.
        </p>
      </header>

      <Alert
        variant="warning"
        eyebrow="Review note"
        title="Placeholder brand assets and unconfirmed business content"
        className="mt-8"
      >
        The official logo, photography, prices, schedules, and policies are
        still required. Everything on this page is a design reference; no real
        booking, account, payment, or map functionality exists yet.
      </Alert>

      <nav aria-label="Design system sections" className="mt-8">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {toc.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex min-h-11 items-center font-semibold text-muted underline decoration-line underline-offset-4 hover:text-accent-ink hover:decoration-brand-blue"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-14 space-y-16">
        <section aria-labelledby="colors">
          <SectionHeading
            id="colors"
            eyebrow="Foundations"
            title="Core color tokens"
            description="Navy and off-white form the base, court blue carries primary actions, and lime or yellow stay as controlled accents. Status colors keep their own meaning."
          />
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {colors.map((color) => (
              <li
                key={color.token}
                className="overflow-hidden rounded-md border border-line bg-surface"
              >
                <div className={`h-16 w-full ${color.className}`} />
                <div className="p-3">
                  <p className="text-sm font-semibold text-ink">{color.name}</p>
                  <p className="mt-0.5 font-mono text-[0.6875rem] text-muted">
                    {color.hex}
                  </p>
                  <p className="mt-1 text-caption text-muted">{color.use}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="status-colors">
          <SectionHeading
            id="status-colors"
            eyebrow="Foundations"
            title="Semantic status colors"
            description="Booking and payment status must remain distinguishable from brand accents. Pair every status with readable text; never rely on color alone."
          />
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statusColors.map((color) => (
              <li
                key={color.token}
                className="overflow-hidden rounded-md border border-line bg-surface"
              >
                <div className={`h-12 w-full ${color.className}`} />
                <div className="p-3">
                  <p className="text-sm font-semibold text-ink">{color.name}</p>
                  <p className="mt-0.5 font-mono text-[0.6875rem] text-muted">
                    {color.hex}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="typography">
          <SectionHeading
            id="typography"
            eyebrow="Foundations"
            title="Typography"
            description="Archivo for confident display and navigation moments; Source Sans 3 for readable body copy and form labels. Both are open-licensed Google Fonts loaded through next/font."
          />
          <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
            <dl className="divide-y divide-line">
              {typeScale.map((type) => (
                <div
                  key={type.name}
                  className="grid gap-2 px-5 py-5 sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-6"
                >
                  <dt className="text-caption font-semibold uppercase tracking-[0.1em] text-muted">
                    {type.name}
                  </dt>
                  <dd className={`${type.className} break-words`}>
                    {type.sample}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-3 text-caption text-muted">
            Hero display sizes clamp by viewport; body copy stays at 16px or
            larger on mobile. Do not set long passages in uppercase or lime.
          </p>
        </section>

        <section aria-labelledby="spacing">
          <SectionHeading
            id="spacing"
            eyebrow="Foundations"
            title="Spacing scale"
            description="A 4px base rhythm keeps sections calm and scannable. Section padding should breathe on desktop and tighten, not collapse, on mobile."
          />
          <div className="mt-6 rounded-lg border border-line bg-surface p-5">
            <ul className="space-y-2.5">
              {spacing.map((step) => (
                <li key={step.name} className="flex items-center gap-4">
                  <span className="w-8 shrink-0 text-caption font-semibold text-muted">
                    {step.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-2.5 rounded-sm bg-brand-blue/70 ${step.className}`}
                  />
                  <span className="text-caption text-muted">
                    {(Number(step.name) * 4).toString()}px
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="shape">
          <SectionHeading
            id="shape"
            eyebrow="Foundations"
            title="Radius and elevation"
            description="Modest radii and light, blue-tinted shadows keep the interface crisp. Avoid oversized pill containers and heavy floating cards."
          />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted">
                Radius
              </h3>
              <div className="mt-4 flex flex-wrap gap-4">
                {radii.map((radius) => (
                  <div key={radius.name} className="text-center">
                    <div
                      className={`size-20 border border-line bg-brand-blue-soft ${radius.className}`}
                    />
                    <p className="mt-2 text-caption font-semibold text-ink">
                      {radius.name} · {radius.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted">
                Elevation
              </h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div className="rounded-md border border-line bg-surface p-4 shadow-card">
                  <p className="text-sm font-semibold text-ink">shadow-card</p>
                  <p className="mt-1 text-caption text-muted">
                    Default surface lift
                  </p>
                </div>
                <div className="rounded-md border border-line bg-surface p-4 shadow-raised">
                  <p className="text-sm font-semibold text-ink">
                    shadow-raised
                  </p>
                  <p className="mt-1 text-caption text-muted">
                    Dialog and overlay only
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="buttons">
          <SectionHeading
            id="buttons"
            eyebrow="Controls"
            title="Buttons"
            description="One primary action per section. Primary buttons use court blue; navy is for confirmation moments. Every state includes hover, focus, pressed, disabled, and loading feedback."
          />
          <div className="mt-6 space-y-6 rounded-lg border border-line bg-surface p-5 sm:p-6">
            <div>
              <h3 className="text-caption font-semibold uppercase tracking-[0.1em] text-muted">
                Variants
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button>Book a court</Button>
                <Button variant="secondary">View details</Button>
                <Button variant="navy">Confirm</Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="danger">Reject proof</Button>
              </div>
            </div>
            <div className="border-t border-line pt-5">
              <h3 className="text-caption font-semibold uppercase tracking-[0.1em] text-muted">
                Sizes, disabled, loading, inverse
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button disabled>Unavailable</Button>
                <Button loading>Save</Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-brand-navy p-4">
                <Button variant="inverse">On navy surface</Button>
                <span className="text-sm text-white/75">
                  Inverse reserved for dark bands
                </span>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="forms">
          <SectionHeading
            id="forms"
            eyebrow="Controls"
            title="Form controls"
            description="Labels stay visible, hints explain format, and errors explain how to fix the problem. Focus rings must remain obvious on white and tinted surfaces."
          />
          <div className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="sample-name"
                label="Full name"
                hint="Use the name shown on your booking."
                required
              >
                <Input
                  id="sample-name"
                  name="sample-name"
                  autoComplete="name"
                  placeholder="Juan Dela Cruz"
                  aria-describedby="sample-name-hint"
                  required
                />
              </Field>
              <Field
                id="sample-email"
                label="Email address"
                error="Enter an email address in the format name@example.com."
                required
              >
                <Input
                  id="sample-email"
                  name="sample-email"
                  type="email"
                  defaultValue="not-an-email"
                  invalid
                  aria-describedby="sample-email-error"
                />
              </Field>
              <Field id="sample-method" label="Payment method" hint="Options shown are examples pending client confirmation.">
                <Select id="sample-method" name="sample-method" defaultValue="gcash" aria-describedby="sample-method-hint">
                  <option value="gcash">GCash QR</option>
                  <option value="maya">Maya QR</option>
                  <option value="bank">Bank transfer (if supported)</option>
                </Select>
              </Field>
              <Field id="sample-notes" label="Booking notes" optionalLabel>
                <Textarea
                  id="sample-notes"
                  name="sample-notes"
                  rows={3}
                  placeholder="Anything the club should know?"
                />
              </Field>
            </div>

            <fieldset className="mt-6 border-t border-line pt-5">
              <legend className="text-sm font-semibold text-ink">
                Player type
              </legend>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="sample-player-type"
                    defaultChecked
                    className="size-4 accent-brand-blue"
                  />
                  Club member
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="sample-player-type"
                    className="size-4 accent-brand-blue"
                  />
                  Guest
                </label>
              </div>
            </fieldset>

            <label className="mt-5 flex items-start gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-brand-blue"
              />
              <span>
                I understand the booking is unpaid until staff verifies the
                actual payment.
              </span>
            </label>
          </div>
        </section>

        <section aria-labelledby="badges">
          <SectionHeading
            id="badges"
            eyebrow="Feedback"
            title="Status badges"
            description="Booking status and payment status are separate fields. Labels stay explicit so a confirmed booking can still show an unpaid or awaiting-verification payment."
          />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-caption font-semibold uppercase tracking-[0.1em] text-muted">
                Booking status
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {bookingStatuses.map((status) => (
                  <Badge key={status.label} variant={status.variant} dot>
                    {status.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-caption font-semibold uppercase tracking-[0.1em] text-muted">
                Payment status
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {paymentStatuses.map((status) => (
                  <Badge key={status.label} variant={status.variant} dot>
                    {status.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="alerts">
          <SectionHeading
            id="alerts"
            eyebrow="Feedback"
            title="Alerts and inline notices"
            description="Use alerts for concise, actionable messages. Errors explain the next step and never imply that an uploaded receipt has been verified automatically."
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Alert variant="info" title="Availability is checked again on submit">
              The slot you see now is revalidated by the server before the
              booking is created.
            </Alert>
            <Alert variant="success" title="Payment verified">
              Staff confirmed the incoming transfer and marked this booking
              as paid.
            </Alert>
            <Alert variant="warning" title="Proof awaiting verification">
              Uploading a screenshot does not mark a payment as paid. Staff
              review happens separately.
            </Alert>
            <Alert variant="error" title="That time slot is no longer available">
              Choose another time, or join open play if a session has space.
            </Alert>
          </div>
        </section>

        <section aria-labelledby="booking-components">
          <SectionHeading
            id="booking-components"
            eyebrow="Phase 3"
            title="Booking-flow components"
            description="These components carry the reservation flow from time selection through the unpaid-request state. Prices, courts, and hours reflect the client's 30 October answers; dates, availability, the hold timer, and the payment QR are still labeled samples."
          />
          <div className="mt-6 space-y-5">
            <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
              <h3 className="text-caption font-semibold uppercase tracking-[0.1em] text-muted">
                Progress
              </h3>
              <Stepper
                steps={[
                  { label: "Choose a time" },
                  { label: "Review details" },
                  { label: "Payment" },
                ]}
                current={1}
                className="mt-4"
              />
              <p className="mt-4 text-caption text-muted">
                Mobile compresses this into a step count, active label, and
                progress bar. Desktop keeps every step visible.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <BookingSummary
                court="Court 1"
                date="Thu 05 Nov"
                time="9:00 AM"
                duration="2 hours"
                priceLabel="₱250"
                priceNote="₱250/hour before 5:00 PM, ₱300 after. Sample date."
                sample
              >
                <p className="rounded-md border border-line bg-page/60 p-3 text-caption leading-relaxed text-muted">
                  The same summary appears beside each step so the selected
                  court, time, duration, and amount never disappear on mobile.
                </p>
              </BookingSummary>

              <div className="space-y-4">
                <StatusPair
                  booking={{ label: "Pending approval", variant: "warning" }}
                  payment={{ label: "Unpaid", variant: "neutral" }}
                />
                <StatusPair
                  booking={{ label: "Confirmed", variant: "success" }}
                  payment={{ label: "Awaiting verification", variant: "warning" }}
                />
                <p className="text-caption leading-relaxed text-muted">
                  Booking and payment always travel as a pair, but never as a
                  single ambiguous &ldquo;status.&rdquo; A confirmed booking can
                  still be unpaid.
                </p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <PolicyNotice
                items={[
                  "Cancellation cutoff: 24 hours before court time.",
                  "Payment deadline: not yet confirmed.",
                  "Staff verification is separate from proof upload.",
                ]}
                note="Policy copy is supplied by the club; two lines are still open."
              />
              <PaymentInstructions
                amountLabel="₱250"
                reference="PREVIEW-1042"
                methodLabel="GCash QR"
                qrSrc="/qr/gcash-sample.jpg"
                qrAlt="Sample GCash QR code used as a stand-in"
                qrSample
                note="The code is a personal stand-in. The club has not supplied its receiving account."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/design-preview/booking"
              className="inline-flex min-h-11 items-center font-semibold text-accent-ink underline decoration-brand-blue/30 underline-offset-4 hover:decoration-brand-blue"
            >
              Open booking-flow preview →
            </Link>
            <p className="text-caption text-muted">
              Interactive preview uses local browser state only.
            </p>
          </div>
        </section>

        <section aria-labelledby="surfaces">
          <SectionHeading
            id="surfaces"
            eyebrow="Composition"
            title="Cards, empty, and loading states"
            description="Cards group one decision at a time. Avoid repeating the same card grid everywhere; some sections should be editorial rows, tables, or plain text."
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <article className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
              <MediaPlaceholder
                label="Club court"
                src="/courts/pickleball2.jpg"
                alt="Doubles play on an outdoor court with hills and sea behind"
                ratio="4/3"
                className="rounded-none border-0 border-b border-line"
              />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-heading font-semibold text-heading">
                    Court reservation
                  </h3>
                  <Badge variant="lime" dot>
                    Available
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Example card structure. Pricing and court names remain
                  pending client confirmation.
                </p>
                <Button variant="secondary" size="sm" className="mt-4" disabled>
                  Select date (preview)
                </Button>
              </div>
            </article>

            <div className="rounded-lg border border-dashed border-line-strong bg-surface p-6 text-center">
              <p className="text-eyebrow font-bold uppercase text-muted">
                Empty state
              </p>
              <h3 className="mt-2 text-heading font-semibold text-heading">
                No bookings yet
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                When a player has no upcoming bookings, explain the next step
                instead of leaving a blank panel.
              </p>
              <Button size="sm" className="mt-4" disabled>
                Browse courts (preview)
              </Button>
            </div>

            <div className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-caption font-semibold uppercase tracking-[0.1em] text-muted">
                Skeleton loading
              </h3>
              <div className="mt-4 space-y-3" aria-hidden="true">
                <div className="skeleton h-4 w-3/4 rounded-sm" />
                <div className="skeleton h-4 w-full rounded-sm" />
                <div className="skeleton h-4 w-5/6 rounded-sm" />
                <div className="skeleton mt-5 h-11 w-full rounded-md" />
              </div>
              <p className="mt-4 text-caption text-muted">
                Skeleton blocks match the final layout to prevent shifts.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="calendar">
          <SectionHeading
            id="calendar"
            eyebrow="Booking"
            title="Calendar and time slots"
            description="Date and time controls must be tappable, legible, and explicit about full or unavailable slots. Sample data below is for interaction review only."
          />
          <div className="mt-6">
            <SlotPickerDemo />
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-caption text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-sm border border-line bg-surface" />
                Available
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-sm bg-brand-blue" />
                Selected
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-sm bg-line" />
                Full or unavailable
              </span>
            </div>
          </div>
        </section>

        <section aria-labelledby="table">
          <SectionHeading
            id="table"
            eyebrow="Operations"
            title="Tables"
            description="Staff tables stay readable with explicit status text. On narrow screens the table scrolls horizontally rather than hiding columns."
          />
          <figure className="mt-6">
            <div className="overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <caption className="sr-only">
                  Sample bookings table with separate booking and payment
                  status
                </caption>
                <thead className="bg-page text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3">Reference</th>
                    <th scope="col" className="px-4 py-3">Player</th>
                    <th scope="col" className="px-4 py-3">Service</th>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Booking</th>
                    <th scope="col" className="px-4 py-3">Payment</th>
                    <th scope="col" className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    { ref: "HP-1042", player: "Sample player A", service: "Court 2", date: "Thu, 15 Oct · 7:30 AM", booking: bookingStatuses[0], payment: paymentStatuses[3], amount: "—" },
                    { ref: "HP-1043", player: "Sample player B", service: "Open play", date: "Thu, 15 Oct · 6:00 PM", booking: bookingStatuses[1], payment: paymentStatuses[4], amount: "—" },
                    { ref: "HP-1044", player: "Sample player C", service: "Court 1", date: "Fri, 16 Oct · 9:00 AM", booking: bookingStatuses[2], payment: paymentStatuses[0], amount: "—" },
                  ].map((row) => (
                    <tr key={row.ref} className="align-middle">
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-heading">
                        {row.ref}
                      </td>
                      <td className="px-4 py-3.5 text-ink">{row.player}</td>
                      <td className="px-4 py-3.5 text-muted">{row.service}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                        {row.date}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={row.booking.variant} dot>
                          {row.booking.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={row.payment.variant} dot>
                          {row.payment.label}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-ink">
                        {row.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figcaption className="mt-2 text-caption text-muted">
              Sample data. Amounts are intentionally blank until the club
              confirms pricing.
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="modal">
          <SectionHeading
            id="modal"
            eyebrow="Overlays"
            title="Dialog"
            description="Native dialog with a visible backdrop, contained focus, Escape support, and no animation that delays the action. Reduced-motion settings remove the entrance transition."
          />
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-5">
            <ModalPreview />
            <p className="text-sm text-muted">
              Preview only — no booking or payment data is written.
            </p>
          </div>
        </section>

        <section aria-labelledby="motion">
          <SectionHeading
            id="motion"
            eyebrow="Guidelines"
            title="Motion and accessibility"
            description="Interaction feedback is brief and functional. Content never waits for an animation, and every state remains understandable without motion or color."
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-heading font-semibold text-heading">
                Motion
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                <li>· 120–200ms for hover, focus, and selection feedback.</li>
                <li>· 200ms for dialogs and panels; never blocking input.</li>
                <li>· Transform and opacity only for larger movements.</li>
                <li>· Respect prefers-reduced-motion globally.</li>
                <li>· No scroll hijacking, parallax, or decorative loops.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-heading font-semibold text-heading">
                Accessibility
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                <li>· Visible 2px focus ring on every interactive element.</li>
                <li>· Text meets AA contrast on its actual surface.</li>
                <li>· Status always includes text, not color alone.</li>
                <li>· Icon-only controls require accessible names.</li>
                <li>· Booking terms, prices, and payment states stay visible on mobile.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-muted">
        <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-heading hover:text-accent-ink">
          ← Phase 3 review index
        </Link>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Link
            href="/design-preview/booking"
            className="inline-flex min-h-11 items-center font-semibold text-accent-ink underline decoration-brand-blue/30 underline-offset-4 hover:decoration-brand-blue"
          >
            Booking flow preview →
          </Link>
          <Link
            href="/design-preview/homepage"
            className="inline-flex min-h-11 items-center font-semibold text-accent-ink underline decoration-brand-blue/30 underline-offset-4 hover:decoration-brand-blue"
          >
            Homepage mockup →
          </Link>
        </div>
      </footer>
    </main>
  );
}
