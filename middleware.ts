import { next } from "@vercel/edge";

/**
 * Link previews for shared product URLs.
 *
 * This is a client-rendered SPA: the OG tags in index.html are static, and the
 * per-product ones are written by useSeo *in the browser*. Google runs JS and
 * sees them; Facebook, WhatsApp, Instagram and Twitter do not — they read the
 * raw HTML, so every shared product link would preview as the generic homepage
 * card. This runs at the edge, only for those crawlers, and hands them a small
 * HTML document carrying the product's real title, description and image.
 *
 * Real shoppers fall straight through to the SPA.
 */
export const config = {
  matcher: "/product/:slug*",
};

const CRAWLER =
  /facebookexternalhit|facebookcatalog|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|Instagram|SkypeUriPreview|vkShare|W3C_Validator|Googlebot|bingbot/i;

const SITE_URL = "https://www.auto-market.shop";
const FALLBACK_IMAGE = `${SITE_URL}/og-image.png`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ProductRow {
  name_fr: string;
  name_ar: string;
  description_fr: string | null;
  price: number;
  stock: number;
  product_images: { url: string }[];
}

export default async function middleware(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!CRAWLER.test(userAgent)) return next();

  const url = new URL(request.url);
  const slug = url.pathname.split("/").filter(Boolean)[1];

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!slug || !supabaseUrl || !supabaseKey) return next();

  let product: ProductRow | undefined;
  try {
    const endpoint =
      `${supabaseUrl}/rest/v1/products` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&status=eq.active` +
      `&select=name_fr,name_ar,description_fr,price,stock,product_images(url)` +
      `&limit=1`;

    const res = await fetch(endpoint, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    if (!res.ok) return next();
    const rows = (await res.json()) as ProductRow[];
    product = rows[0];
  } catch {
    // A crawler is never worth a 500: fall back to the static tags.
    return next();
  }

  if (!product) return next();

  const title = `${product.name_fr} — Auto Market`;
  const description =
    product.description_fr?.slice(0, 200) ??
    `${product.name_fr} — livraison partout en Algérie, paiement à la livraison.`;
  const image = product.product_images?.[0]?.url ?? FALLBACK_IMAGE;
  const canonical = `${SITE_URL}/product/${slug}`;

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />

    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="Auto Market" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${escapeHtml(product.name_fr)}" />
    <meta property="og:locale" content="fr_DZ" />
    <meta property="product:price:amount" content="${Number(product.price)}" />
    <meta property="product:price:currency" content="DZD" />
    <meta property="product:availability" content="${product.stock > 0 ? "in stock" : "out of stock"}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  </head>
  <body>
    <h1>${escapeHtml(product.name_fr)}</h1>
    <p>${escapeHtml(description)}</p>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name_fr)}" width="800" height="800" />
    <a href="${escapeHtml(canonical)}">Voir le produit</a>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Crawlers re-scrape often; let the edge serve them from cache.
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
