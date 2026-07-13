import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DOMAIN = "https://automarket.dz";

// Only routes the router actually serves — /track-order was listed here but no
// such route exists, so the sitemap was advertising a 404 to Google.
const STATIC_ROUTES = ["/", "/shop"];

function buildXml(urls) {
  const entries = urls
    .map((url) => `  <url><loc>${DOMAIN}${url}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  const urls = [...STATIC_ROUTES];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase
        .from("products")
        .select("slug")
        .eq("status", "active");
      if (error) throw error;
      for (const product of data ?? []) {
        urls.push(`/product/${product.slug}`);
      }
    } catch (err) {
      console.warn("generate-sitemap: could not fetch products, writing static routes only.", err.message);
    }
  } else {
    console.warn("generate-sitemap: Supabase env vars not set, writing static routes only.");
  }

  writeFileSync("public/sitemap.xml", buildXml(urls));
  console.log(`generate-sitemap: wrote ${urls.length} urls to public/sitemap.xml`);
}

main();
