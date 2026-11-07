import type { Metadata } from "next";
import { LookupPanel } from "@/components/guest/lookup-panel";
import { PageHeader } from "@/components/site/page-header";
import { PublicPage } from "@/components/site/public-page";

export const metadata: Metadata = {
  title: "Check booking status",
  description:
    "Check a D-Hidden Pickleball court booking or open-play place with your reference and mobile number, or by uploading your booking QR code.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ reference?: string | string[] }>;
};

export default async function LookupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const reference =
    typeof params.reference === "string" ? params.reference.slice(0, 40) : "";

  return (
    <PublicPage>
      <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
        <PageHeader
          eyebrow="Court booking or open play"
          title="Check your booking status."
          intro="Upload your booking QR code, or enter the reference and mobile number from your confirmation. No sign-in is needed."
        />
        <div className="mt-8">
          <LookupPanel initialReference={reference} />
        </div>
      </div>
    </PublicPage>
  );
}
