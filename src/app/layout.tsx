import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://algorift.vercel.app"),
  title: "AlgoRift | Learn algorithms by playing",
  description:
    "A beginner-friendly platform adventure where every level teaches an algorithm and turns understanding into gameplay.",
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
    description: "Learn algorithms. Play the decisions. Defeat the boss.",
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
