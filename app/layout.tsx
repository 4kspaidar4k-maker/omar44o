import "./globals.css";
import type { Metadata } from "next";
import { CartProvider } from "../context/CartContext";

export const metadata: Metadata = {
  title: "مكتبة أبو طوق",
  description: "المتجر الإلكتروني لمكتبة أبو طوق - بطاقات ودوسيات وقرطاسية",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "مكتبة أبو طوق",
    description: "المتجر الإلكتروني لمكتبة أبو طوق - بطاقات ودوسيات وقرطاسية",
    url: "https://apu-tawq-library.vercel.app", // 👈 استبدل هذا برابط موقعك الحقيقي على Vercel
    siteName: "مكتبة أبو طوق",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "مكتبة أبو طوق",
      },
    ],
    locale: "ar_JO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "مكتبة أبو طوق",
    description: "المتجر الإلكتروني لمكتبة أبو طوق - بطاقات ودوسيات وقرطاسية",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
