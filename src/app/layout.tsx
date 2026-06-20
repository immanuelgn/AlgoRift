import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://algorift.vercel.app"),
  title: "AlgoRift | Learn algorithms by playing",
  description:
    "A minimalist interactive lab where visual mini-games teach algorithms through direct manipulation and immediate feedback.",
  keywords: [
    "algorithms",
    "data structures",
    "binary search",
    "Dijkstra",
    "interactive learning",
    "computer science",
  ],
  openGraph: {
    title: "AlgoRift",
    description: "Understand algorithms by moving them.",
    url: "https://algorift.vercel.app",
    type: "website",
  },
  authors: [{ name: "Immanuel Gnanaseelan" }],
  creator: "Immanuel Gnanaseelan",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
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
