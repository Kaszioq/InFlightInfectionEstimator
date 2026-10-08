import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";

const serif = Source_Serif_4({ subsets: ["latin", "latin-ext"], variable: "--font-source-serif", display: "swap" });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Ryzyko zakażenia w kabinie Boeinga 737",
  description:
    "Interaktywna symulacja ryzyka zakażenia w kabinie Boeinga 737: wentylacja, odległość od chorego, choroba i maseczki.",
  openGraph: {
    title: "Ryzyko zakażenia w kabinie Boeinga 737",
    description: "Zmień wentylację, chorobę, maseczki i miejsce chorego, zobacz, jak ryzyko rośnie w czasie lotu.",
    type: "website",
    locale: "pl_PL",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a19" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={serif.variable}>
      <body>{children}</body>
    </html>
  );
}
