import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Money Mentor — Your Personal Finance Copilot",
  description:
    "AI-powered personal finance mentor. FIRE planning, tax optimization, portfolio analysis, and more — all for free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
