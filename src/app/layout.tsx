import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const cairo = localFont({
  src: [
    { path: "../assets/fonts/Cairo-Regular.ttf", weight: "400", style: "normal" },
    { path: "../assets/fonts/Cairo-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-ar",
  display: "swap",
});

export const metadata: Metadata = {
  title: "تحدي رمضان اليومي",
  description: "تحدي يومي تنافسي داخل مجموعة خاصة لمدة 30 يوما.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "تحدي رمضان" },
  icons: {
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} antialiased`}>{children}</body>
    </html>
  );
}
