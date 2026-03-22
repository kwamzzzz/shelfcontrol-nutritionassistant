const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RSSArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  imageUrl: string;
  category: string;
  publishedAt: string;
  url: string;
}

const RSS_SOURCES = [
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/DiningandWine.xml",
    source: "NYT Food",
    category: "nutrition",
  },
  {
    url: "https://www.medicalnewstoday.com/feeds/articles",
    source: "Medical News Today",
    category: "health",
  },
  {
    url: "https://feeds.bbci.co.uk/news/health/rss.xml",
    source: "BBC Health",
    category: "health",
  },
  {
    url: "https://www.sciencedaily.com/rss/health_medicine/nutrition.xml",
    source: "ScienceDaily",
    category: "science",
  },
  {
    url: "https://www.foodnavigator.com/rss/news",
    source: "FoodNavigator",
    category: "trends",
  },
];

const FOOD_KEYWORDS = [
  "food", "nutrition", "diet", "eating", "meal", "cook", "recipe",
  "grocery", "protein", "vitamin", "calorie", "organic", "vegetable",
  "fruit", "health", "weight", "sugar", "fat", "fiber", "grain",
  "dairy", "meat", "plant-based", "vegan", "supplement", "pantry",
  "kitchen", "ingredient", "snack", "beverage", "drink", "hydration",
  "ferment", "gut", "probiotic", "allergy", "gluten", "sodium",
  "cholesterol", "antioxidant", "superfood", "processed", "fresh",
  "frozen", "canned", "expir", "waste", "preserv", "store", "fridge",
];

function extractImageFromContent(content: string): string | null {
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  const mediaMatch = content.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (mediaMatch) return mediaMatch[1];
  const enclosureMatch = content.match(
    /<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i
  );
  if (enclosureMatch) return enclosureMatch[1];
  return null;
}

function parseXMLItems(xml: string, source: string, category: string): RSSArticle[] {
  const items: RSSArticle[] = [];
  // Match both <item> and <entry> (Atom)
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
      : "";
    if (!title) continue;

    const linkMatch =
      block.match(/<link[^>]*>(?:<!\[CDATA\[)?(https?:\/\/[^\s<\]]+)/) ||
      block.match(/<link[^>]+href=["'](https?:\/\/[^"']+)["']/i) ||
      block.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/i);
    const url = linkMatch ? linkMatch[1].trim() : "";
    if (!url) continue;

    const descMatch =
      block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
      block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i) ||
      block.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);
    const rawDesc = descMatch ? descMatch[1] : "";
    const summary = rawDesc.replace(/<[^>]*>/g, "").trim().slice(0, 280);

    const dateMatch =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
      block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i) ||
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
    const publishedAt = dateMatch ? new Date(dateMatch[1].trim()).toISOString() : new Date().toISOString();

    // Image extraction
    const mediaThumb = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
    const mediaContent = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i);
    const contentImage = extractImageFromContent(rawDesc + block);
    const imageUrl = mediaThumb?.[1] || mediaContent?.[1] || enclosure?.[1] || contentImage || "";

    items.push({
      id: `fn-${btoa(url).slice(0, 16)}`,
      title,
      summary: summary || title,
      source,
      imageUrl,
      category,
      publishedAt,
      url,
    });
  }

  return items;
}

function isFoodRelated(article: RSSArticle): boolean {
  const text = (article.title + " " + article.summary).toLowerCase();
  return FOOD_KEYWORDS.some((kw) => text.includes(kw));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const allArticles: RSSArticle[] = [];

    const fetches = RSS_SOURCES.map(async ({ url, source, category }) => {
      try {
        const resp = await fetch(url, {
          headers: { "User-Agent": "ShelfControl/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) return [];
        const xml = await resp.text();
        return parseXMLItems(xml, source, category);
      } catch (e) {
        console.warn(`Failed to fetch ${source}:`, e);
        return [];
      }
    });

    const results = await Promise.all(fetches);
    for (const batch of results) {
      allArticles.push(...batch);
    }

    // Filter for food-relevance (sources like NYT Food and FoodNavigator are already food-focused,
    // but BBC Health / MNT may include non-food articles)
    const foodArticles = allArticles.filter((a) => {
      // Food-focused sources pass through
      if (["NYT Food", "FoodNavigator", "ScienceDaily"].includes(a.source)) return true;
      return isFoodRelated(a);
    });

    // Sort by date
    foodArticles.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    // Limit to 40 articles
    const limited = foodArticles.slice(0, 40);

    return new Response(JSON.stringify({ success: true, articles: limited }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Food news error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error), articles: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
