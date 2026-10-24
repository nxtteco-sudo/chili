import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kebun Cili — Farm Log",
    short_name: "Kebun Cili",
    description: "Spray, baja, watering and problem log for the chili farm",
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8f9f5",
    theme_color: "#f8f9f5",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
