const SITE_URL = "https://www.coworking013.com.br";

const privateRoutePrefixes = [
  "/admin",
  "/auth",
  "/auth-admin",
  "/painel",
];

type SitemapRequest = { method?: string };
type SitemapResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => SitemapResponse;
  send: (body: string) => SitemapResponse;
};

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      "\"": "&quot;",
    };
    return entities[character];
  });
}

function normalizeRoute(route: string): string | null {
  const trimmedRoute = route.trim();
  if (!trimmedRoute || trimmedRoute === "global-header" || trimmedRoute === "global-footer") {
    return null;
  }

  const path = trimmedRoute.startsWith("/") ? trimmedRoute : `/${trimmedRoute}`;
  if (privateRoutePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return null;
  }

  return path === "/" ? "/" : path.replace(/\/+$/, "");
}

function toLastModified(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createUrlEntry(path: string, lastModified?: string | null): string {
  const lastmod = lastModified ? `\n    <lastmod>${escapeXml(lastModified)}</lastmod>` : "";
  return `  <url>\n    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>${lastmod}\n  </url>`;
}

async function fetchSupabase(resource: string): Promise<Array<Record<string, unknown>>> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${resource}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with status ${response.status}`);
  }

  return response.json();
}

export default async function sitemap(request: SitemapRequest, response: SitemapResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).send("Method Not Allowed");
  }

  try {
    const [pages, articles] = await Promise.all([
      fetchSupabase("site_pages?select=route,created_at,is_global&order=created_at.asc"),
      fetchSupabase(
        "site_articles?select=slug,published_at,created_at&status=eq.Publicado&order=published_at.desc",
      ),
    ]);

    const entries = new Map<string, string | null>();
    entries.set("/", null);
    entries.set("/blog", null);

    for (const page of pages) {
      if (page.is_global) continue;
      const route = normalizeRoute(page.route);
      if (route) entries.set(route, toLastModified(page.created_at));
    }

    for (const article of articles) {
      if (!article.slug) continue;
      entries.set(`/blog/${encodeURIComponent(article.slug)}`, toLastModified(article.published_at || article.created_at));
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from(entries, ([path, lastModified]) => createUrlEntry(path, lastModified)).join("\n")}\n</urlset>\n`;

    response.setHeader("Content-Type", "application/xml; charset=utf-8");
    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response.status(200).send(body);
  } catch (error) {
    console.error("Failed to generate sitemap", error);
    response.setHeader("Content-Type", "application/xml; charset=utf-8");
    return response.status(503).send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>");
  }
}
