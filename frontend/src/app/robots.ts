import type { MetadataRoute } from "next";

const SITE = "https://www.buildittoday.ai";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",        // the console
          "/api",          // nothing here is a page
          "/auth",         // sign-in
          "/claim",        // reached from a personal link, not from search
          "/demo-sites",   // raw generated HTML
          "/leads",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
