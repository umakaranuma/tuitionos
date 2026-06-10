import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { NotificationsProvider } from "@/lib/notifications";
import "./globals.css";

// Manrope — clean, geometric, modern. Single family for display + body to give
// the UI a tight, contemporary SaaS feel.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-raw",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TuitionOS Admin",
  description: "TuitionOS platform administration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${mono.variable}`}>
        <NotificationsProvider>
          <ToastProvider>{children}</ToastProvider>
        </NotificationsProvider>
      </body>
    </html>
  );
}
