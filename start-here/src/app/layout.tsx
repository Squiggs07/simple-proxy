import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Start Here — fitness & nutrition, minus the overwhelm",
  description:
    "A friendly starting point for eating better and getting in shape. No jargon, no blank dashboards.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-dvh flex flex-col bg-stone-50 text-stone-800">
        {children}
      </body>
    </html>
  );
}
