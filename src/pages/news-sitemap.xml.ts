import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import config from "@/config";

export const GET: APIRoute = async ({ site }) => {
  const allPosts = await getCollection("posts");
  
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  
  const recentPosts = allPosts.filter((post) => {
    const pubDate = new Date(post.data.pubDatetime || post.data.date);
    return pubDate >= twoDaysAgo;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${recentPosts
    .map(
      (post) => `
  <url>
    <loc>${new URL(`posts/${post.slug}`, site).href}</loc>
    <news:news>
      <news:publication>
        <news:name>${config.site.title}</news:name>
        <news:language>ar</news:language>
      </news:publication>
      <news:publication_date>${new Date(post.data.pubDatetime || post.data.date).toISOString()}</news:publication_date>
      <news:title>${post.data.title}</news:title>
    </news:news>
  </url>`
    )
    .join("")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
};
