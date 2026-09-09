import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../styles/tokens.css";
import "../styles/typography.css";
import "../styles/layout.css";
import "../styles/components.css";

export const metadata: Metadata = {
  title: "Coverage Calls — Call Operations",
  description: "Verified inbound calls for agents and agencies. Answer in your browser. Close more deals.",
  icons: {
    icon: [
      { url: "/images/coveragefavicon.png", sizes: "32x32", type: "image/png" },
      { url: "/images/coveragefavicon.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/images/coveragefavicon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/images/coveragefavicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#140A26",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
