import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/hooks/usePantry";
import { useMemo } from "react";

export type FoodNewsCategory = "nutrition" | "health" | "trends" | "science";

export interface FoodNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  imageUrl: string;
  category: FoodNewsCategory;
  publishedAt: Date;
  url: string;
  relevanceScore: number;
}

const CATEGORY_GRADIENTS: Record<FoodNewsCategory, string> = {
  nutrition: "from-emerald-500 to-teal-400",
  health: "from-rose-500 to-pink-400",
  trends: "from-blue-500 to-emerald-400",
  science: "from-emerald-500 to-green-400",
};

export const FOOD_NEWS_CATEGORY_CONFIG: Record<FoodNewsCategory, { label: string; gradient: string }> = {
  nutrition: { label: "Nutrition", gradient: CATEGORY_GRADIENTS.nutrition },
  health: { label: "Health", gradient: CATEGORY_GRADIENTS.health },
  trends: { label: "Trends", gradient: CATEGORY_GRADIENTS.trends },
  science: { label: "Science", gradient: CATEGORY_GRADIENTS.science },
};

const VALID_CATEGORIES = new Set<string>(["nutrition", "health", "trends", "science"]);

function normalizeCategory(cat: string): FoodNewsCategory {
  if (VALID_CATEGORIES.has(cat)) return cat as FoodNewsCategory;
  return "nutrition";
}

async function fetchLiveArticles(): Promise<Omit<FoodNewsItem, "relevanceScore">[]> {
  const { data, error } = await supabase.functions.invoke("food-news");

  if (error || !data?.success) {
    console.warn("Food news fetch failed, using empty set:", error || data?.error);
    return [];
  }

  return (data.articles ?? []).map((a: any) => ({
    id: a.id,
    title: a.title || "",
    summary: a.summary || "",
    source: a.source || "Unknown",
    imageUrl: a.imageUrl || "",
    category: normalizeCategory(a.category),
    publishedAt: new Date(a.publishedAt),
    url: a.url || "",
  }));
}

export function useFoodNews() {
  const { data: pantryItems } = useInventory();

  const { data: rawArticles, isLoading } = useQuery({
    queryKey: ["food-news"],
    queryFn: fetchLiveArticles,
    staleTime: 15 * 60 * 1000, // 15 min
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const articles = useMemo(() => {
    if (!rawArticles?.length) return [];

    const pantryNames = new Set(
      (pantryItems ?? []).map((i: any) => i.items?.name?.toLowerCase()).filter(Boolean)
    );

    return rawArticles
      .map((article) => {
        let relevanceScore = 50;

        // Boost recency
        const hoursAgo = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
        relevanceScore += Math.max(0, 30 - hoursAgo);

        // Boost if title/summary mentions a pantry item
        const text = (article.title + " " + article.summary).toLowerCase();
        for (const name of pantryNames) {
          if (text.includes(name as string)) {
            relevanceScore += 20;
            break;
          }
        }

        return { ...article, relevanceScore: Math.round(relevanceScore) } as FoodNewsItem;
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [rawArticles, pantryItems]);

  return { articles, isLoading };
}
