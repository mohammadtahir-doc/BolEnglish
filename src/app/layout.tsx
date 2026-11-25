import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://bolenglish.app";

const siteTitle = "BolEnglish | Learn & Speak English Confidently";
const siteDescription =
  "BolEnglish helps Hindi speakers learn English step by step with 80 grammar, tense, vocabulary, and phrase modules plus live AI voice speaking practice.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "BolEnglish",
    title: siteTitle,
    description: siteDescription,
    url: "/",
    images: [
      {
        url: "/images/welcome-bg.png",
        width: 1408,
        height: 768,
        alt: "BolEnglish English Learning Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/images/welcome-bg.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
