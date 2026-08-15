import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Broadsheet uses one serif typeface for both heading and body, weights
// 400/600 plus a true italic at 400 (design-system/theme.json, broadsheet-guide.md
// §Type) — loaded via next/font to avoid the render-blocking @import the
// vendored styles.css uses by default (ARCHITECTURE.md §1).
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Route & Stamps",
  description: "Collaborative trip planning for two.",
  appleWebApp: {
    title: "Route & Stamps",
    // iOS reads apple-touch-icon directly, not the web manifest.
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

// theme_color lives here, not in `metadata`, since Next 14 (ARCHITECTURE.md
// tokens: --color-accent for theme_color, --color-bg for background_color —
// matches manifest.ts).
export const viewport: Viewport = {
  themeColor: "#0088b0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
