import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AlgoRift",
    short_name: "AlgoRift",
    description:
      "A beginner-friendly algorithm adventure where learning powers the game.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf3",
    theme_color: "#7968f2",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
