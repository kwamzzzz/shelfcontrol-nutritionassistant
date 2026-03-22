import { useMemo } from "react";
import { useInventory } from "@/hooks/usePantry";

export type FoodNewsCategory = "nutrition" | "health" | "trends" | "science";

export interface FoodNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  imageUrl: string;
  category: FoodNewsCategory;
  publishedAt: Date;
  relevanceScore: number;
}

const CATEGORY_IMAGES: Record<FoodNewsCategory, string> = {
  nutrition: "from-emerald-500 to-teal-400",
  health: "from-rose-500 to-pink-400",
  trends: "from-blue-500 to-indigo-400",
  science: "from-purple-500 to-violet-400",
};

const MOCK_ARTICLES: Omit<FoodNewsItem, "relevanceScore">[] = [
  {
    id: "fn-1",
    title: "Why Fermented Foods Are Making a Comeback",
    summary: "New research shows that fermented foods like kimchi and kefir may improve gut health more than previously thought. Experts recommend adding at least one serving daily.",
    source: "NutritionWeekly",
    imageUrl: "",
    category: "nutrition",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "fn-2",
    title: "Ultra-Processed Foods Linked to Higher Inflammation",
    summary: "A large-scale study confirms that ultra-processed foods contribute to chronic inflammation. Reducing packaged snack intake could lower risk markers significantly.",
    source: "HealthDigest",
    imageUrl: "",
    category: "health",
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: "fn-3",
    title: "Grocery Prices Expected to Stabilize by Q2",
    summary: "After months of inflation, analysts predict grocery costs will level off as supply chains recover. Fresh produce and dairy may see the biggest relief.",
    source: "MarketWatch",
    imageUrl: "",
    category: "trends",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
  {
    id: "fn-4",
    title: "The Science Behind Food Expiry Dates",
    summary: "Most expiry dates are conservative estimates. Understanding the difference between 'best before' and 'use by' could reduce household food waste by up to 20%.",
    source: "FoodScienceJournal",
    imageUrl: "",
    category: "science",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: "fn-5",
    title: "Plant-Based Protein: What You Need to Know",
    summary: "Plant-based proteins are gaining mainstream acceptance. Learn which sources offer complete amino acid profiles and how to combine them effectively.",
    source: "NutritionWeekly",
    imageUrl: "",
    category: "nutrition",
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fn-6",
    title: "How Meal Timing Affects Metabolism",
    summary: "Eating patterns matter as much as what you eat. Research suggests that consistent meal timing can improve metabolic health and energy levels throughout the day.",
    source: "HealthDigest",
    imageUrl: "",
    category: "health",
    publishedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fn-7",
    title: "Organic vs. Conventional: New Data on Pesticide Residues",
    summary: "A 2026 analysis reveals significant differences in pesticide levels between organic and conventional produce. The 'dirty dozen' list has been updated.",
    source: "FoodScienceJournal",
    imageUrl: "",
    category: "science",
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fn-8",
    title: "Discount Grocers Are Reshaping How We Shop",
    summary: "Budget-friendly grocery chains are expanding rapidly. Their model of limited selection but lower prices is changing consumer expectations around value.",
    source: "MarketWatch",
    imageUrl: "",
    category: "trends",
    publishedAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fn-9",
    title: "Hydration Myths Debunked by Nutritionists",
    summary: "The '8 glasses a day' rule may not apply to everyone. Experts now recommend listening to your body and factoring in food-based water intake.",
    source: "NutritionWeekly",
    imageUrl: "",
    category: "health",
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fn-10",
    title: "Smart Fridges: Hype or Helpful?",
    summary: "Connected kitchen appliances promise to reduce waste by tracking inventory. Early adopters report mixed results, but the technology is improving rapidly.",
    source: "MarketWatch",
    imageUrl: "",
    category: "trends",
    publishedAt: new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fn-11",
    title: "Vitamin D Deficiency More Common Than Expected",
    summary: "New global data shows vitamin D deficiency affects nearly 40% of adults. Fortified foods and brief sun exposure remain the most accessible solutions.",
    source: "HealthDigest",
    imageUrl: "",
    category: "nutrition",
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fn-12",
    title: "How Food Labels Will Change in 2027",
    summary: "Regulators are pushing for clearer front-of-pack labeling. Traffic-light systems and added-sugar callouts are expected to become standard across most markets.",
    source: "FoodScienceJournal",
    imageUrl: "",
    category: "science",
    publishedAt: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000),
  },
];

export const FOOD_NEWS_CATEGORY_CONFIG: Record<FoodNewsCategory, { label: string; gradient: string }> = {
  nutrition: { label: "Nutrition", gradient: CATEGORY_IMAGES.nutrition },
  health: { label: "Health", gradient: CATEGORY_IMAGES.health },
  trends: { label: "Trends", gradient: CATEGORY_IMAGES.trends },
  science: { label: "Science", gradient: CATEGORY_IMAGES.science },
};

export function useFoodNews() {
  const { data: pantryItems } = useInventory();

  const articles = useMemo(() => {
    const pantryNames = new Set(
      (pantryItems ?? []).map((i: any) => i.items?.name?.toLowerCase()).filter(Boolean)
    );

    return MOCK_ARTICLES.map((article) => {
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
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [pantryItems]);

  return { articles };
}
