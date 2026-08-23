import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TuitionOS - Smart Management for Modern Institutes",
  description: "The complete operating system for tuition centers. Manage students, attendance, fees, and communication in one beautiful platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
