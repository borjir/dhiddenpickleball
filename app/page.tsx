import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";

export const metadata: Metadata = {
  // The root layout's title template only applies to child segments, so the
  // homepage states the club name itself instead of showing a bare phrase.
  title: {
    absolute:
      "D-Hidden Pickleball Court & Bistro | Court booking in Balamban, Cebu",
  },
  description:
    "Book court time at D-Hidden Pickleball Court & Bistro. Two courts, open daily 7:00 AM to 12:00 AM, ₱250 per hour before 5:00 PM and ₱300 after, with GCash payment review.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <HomePage />;
}
