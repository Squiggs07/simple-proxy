import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Start Here — your simple fitness plan",
  description:
    "A calm, adaptive fitness and nutrition plan that turns goals into manageable meals, training, progress, and coaching.",
  appleWebApp: {
    capable: true,
    title: "Start Here",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F4EE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-dvh bg-[#F7F4EE] text-[#1D2926]">{children}</body>
    </html>
  );
}
