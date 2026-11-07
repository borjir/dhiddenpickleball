import type { Metadata, Viewport } from "next";
import { Archivo, Source_Sans_3 } from "next/font/google";
import { BookingModalProvider } from "@/components/booking/booking-modal-provider";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "D-Hidden Pickleball Court & Bistro",
    template: "%s | D-Hidden Pickleball Court & Bistro",
  },
  description:
    "Book court time at D-Hidden Pickleball Court & Bistro in Pondol, Balamban, Cebu. Two courts, open daily 7:00 AM to 12:00 AM, with clear hourly rates and GCash payment review.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9f0" },
    { media: "(prefers-color-scheme: dark)", color: "#070d18" },
  ],
};

/** Applies the saved or system theme before first paint to avoid a flash. */
const themeScript = `(function(){try{var stored=localStorage.getItem("dhidden-theme");var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=dark?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-page font-sans text-ink">
        <NotificationsProvider>
          <BookingModalProvider>{children}</BookingModalProvider>
        </NotificationsProvider>
      </body>
    </html>
  );
}
