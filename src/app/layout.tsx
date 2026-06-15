import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://algorift.vercel.app"),
  title: "AlgoRift | Learn algorithms through play",
  description:
    "A game-like algorithm academy where data structures become worlds and hard concepts become boss battles.",
  keywords: [
    "algorithms",
    "data structures",
    "Dijkstra",
    "interactive learning",
    "computer science",
  ],
  openGraph: {
    title: "AlgoRift",
    description: "Learn the logic. Defeat the impossible.",
    url: "https://algorift.vercel.app",
    type: "website",
  },
  authors: [{ name: "Immanuel Gnanaseelan" }],
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
