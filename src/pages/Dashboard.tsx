import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useInventory } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { useConsumptionLogs } from "@/hooks/useConsumption";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useRecipes } from "@/hooks/useRecipes";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useWaterLogs } from "@/hooks/useWaterTracking";
import { useNutritionData } from "@/hooks/useNutrition";
import { formatCurrency } from "@/lib/currency";
import { getExpiryStatus, getExpiryLabel } from "@/lib/pantry-utils";
import IntelligenceWidget from "@/components/dashboard/IntelligenceWidget";
import {
  Package, ShoppingCart, ChefHat, GlassWater, Heart,
  ArrowRight, ShoppingBag, Flame, Apple, Receipt, Plus,
} from "lucide-react";
import { isThisWeek, parseISO, format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

/* ── helpers ──────────────────────────────────────── */
function getCategoryEmoji(category?: string | null): string {
  if (!category) return "🍽";
  const c = category.toLowerCase();
  if (c.includes("dairy") || c.includes("milk")) return "🥛";
  if (c.includes("meat") || c.includes("chicken") || c.includes("beef")) return "🥩";
  if (c.includes("fish") || c.includes("seafood")) return "🐟";
  if (c.includes("vegetable") || c.includes("veg")) return "🥬";
  if (c.includes("fruit")) return "🍎";
  if (c.includes("grain") || c.includes("bread")) return "🍞";
  if (c.includes("snack")) return "🍿";
  if (c.includes("beverage") || c.includes("drink")) return "🧃";
  return "🍽";
}

/* ── Dashboard ──────────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const { data: inventory } = useInventory();
  const { data: purchases } = usePurchases();
  const { data: logs } = useConsumptionLogs();
  const { data: recipes } = useRecipes();
  const { data: shoppingList } = useShoppingList();
  const { data: goals } = useNutritionGoals();
  const { data: waterLogs } = useWaterLogs();
  const { totals } = useNutritionData();

  const calGoal = goals?.calorie_goal ?? 2000;
  const waterGoal = goals?.water_goal_ml ?? 2000;

  const calPct = Math.min((totals.calories / calGoal) * 100, 100);

  /* pantry */
  const pantryCount = inventory?.length ?? 0;
  const expiringSoon = useMemo(
    () => inventory?.filter(r => { const s = getExpiryStatus(r.expiry_date); return s === "expiring" || s === "expired"; }) ?? [],
    [inventory]
  );

  /* spending */
  const weekSpend = useMemo(() => {
    if (!purchases) return 0;
    return purchases.filter(p => isThisWeek(parseISO(p.purchased_at), { weekStartsOn: 1 })).reduce((sum, p) => sum + Number(p.total_cost ?? 0), 0);
  }, [purchases]);

  /* shopping */
  const openItems = useMemo(() => shoppingList?.filter(i => !i.is_purchased).length ?? 0, [shoppingList]);

  /* water */
  const waterTotal = useMemo(() => waterLogs?.reduce((s, l) => s + l.amount_ml, 0) ?? 0, [waterLogs]);
  const waterPct = Math.min((waterTotal / waterGoal) * 100, 100);

  /* recent */
  const recentLogs = logs?.slice(0, 4) ?? [];
  const recentPurchases = purchases?.slice(0, 3) ?? [];

  /* pantry composition */
  const composition = useMemo(() => {
    if (!inventory || inventory.length === 0) return [];
    const cats: Record<string, number> = {};
    inventory.forEach(item => {
      const cat = item.items?.category ?? "Other";
      cats[cat] = (cats[cat] || 0) + 1;
    });
    const total = inventory.length;
    return Object.entries(cats)
      .map(([name, count]) => ({ name, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
  }, [inventory]);

  const compositionColors = ["#FFE53B", "#FF5A25", "#10B981", "#059669"];

  /* SVG ring calc */
  const ringRadius = 90;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (calPct / 100) * ringCircumference;

  return (
    <div className="max-w-[1400px] mx-auto px-0">
      {/* 12-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 lg:gap-6">

        {/* ═══ BUDGET RING ═══ */}
        <div className="col-span-1 md:col-span-4 glass-card glass-card-hover p-4 sm:p-6 flex flex-col items-center text-center relative">
          <h3 className="label-small absolute top-4 left-4 sm:top-6 sm:left-6">Monthly Budget</h3>
          <div className="relative w-[140px] h-[140px] sm:w-[200px] sm:h-[200px] mt-4 mb-3 sm:mb-4">
            {/* SVG gradient definition */}
            <svg width="0" height="0" className="absolute">
              <defs>
                <linearGradient id="ring-warm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFE53B" />
                  <stop offset="50%" stopColor="#FF5A25" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
            </svg>
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle cx="100" cy="100" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
              <circle
                cx="100" cy="100" r={ringRadius} fill="none"
                stroke="url(#ring-warm-grad)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="metric-large text-foreground">{formatCurrency(weekSpend)}</span>
              <span className="label-small">This Week</span>
            </div>
          </div>
          <div className="w-full flex justify-between pt-3 sm:pt-4 separator-dotted" style={{ borderTopStyle: 'dotted', borderTopWidth: 1, borderTopColor: 'hsla(155, 12%, 45%, 0.3)' }}>
            <div>
              <div className="label-small">Pantry</div>
              <div className="text-lg font-medium text-foreground">{pantryCount}</div>
            </div>
            <div className="text-right">
              <div className="label-small">Expiring</div>
              <div className="text-lg font-medium text-[#10B981]">{expiringSoon.length}</div>
            </div>
          </div>
        </div>

        {/* ═══ AI INSIGHT ═══ */}
        <div className="col-span-1 md:col-span-4 rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden gradient-cool border border-white/[0.06]">
          <div className="absolute -top-[50%] -right-[20%] w-[200px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_70%)]" />
          <div className="relative z-10">
            <div className="h-8 w-8 rounded-full bg-white text-primary flex items-center justify-center mb-4 font-bold text-base">✦</div>
            <h2 className="text-xl font-medium text-white mb-2">Smart Restock</h2>
            <p className="text-white/80 text-sm leading-relaxed mb-6">
              {expiringSoon.length > 0
                ? `${expiringSoon.length} items need attention soon. ${openItems > 0 ? `${openItems} on your shopping list.` : "Check your pantry."}`
                : "Your pantry looks good! All items are fresh and stocked."}
            </p>
            <button
              onClick={() => navigate("/shopping")}
              className="bg-white/20 border border-white/30 text-white px-5 py-2.5 rounded-full text-sm font-medium backdrop-blur-sm hover:bg-white/30 transition-all"
            >
              Review List →
            </button>
          </div>
        </div>

        {/* ═══ QUICK STATS ═══ */}
        <div className="col-span-1 md:col-span-4 glass-card glass-card-hover p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="label-small">Quick Stats</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <QuickStat icon={Package} label="Pantry" value={pantryCount} onClick={() => navigate("/pantry")} />
            <QuickStat icon={ShoppingCart} label="To Buy" value={openItems} onClick={() => navigate("/shopping")} />
            <QuickStat icon={ChefHat} label="My Cook Book" value={recipes?.length ?? 0} onClick={() => navigate("/recipes")} />
            <QuickStat icon={GlassWater} label="Water" value={`${(waterTotal / 1000).toFixed(1)}L`} sub={`${waterPct.toFixed(0)}%`} onClick={() => navigate("/nutrition")} />
          </div>
        </div>

        {/* ═══ ATTENTION REQUIRED ═══ */}
        <div className="col-span-1 lg:col-span-8 glass-card glass-card-hover p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-foreground">Attention Required</h2>
            <button onClick={() => navigate("/pantry?filter=expiring")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View All
            </button>
          </div>
          {expiringSoon.length === 0 ? (
            <div className="py-10 text-center">
              <span className="text-3xl">✅</span>
              <p className="text-sm text-muted-foreground mt-2">Nothing needs attention right now!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {expiringSoon.slice(0, 4).map((item, idx) => {
                const status = getExpiryStatus(item.expiry_date);
                return (
                  <div key={item.id} className={cn("flex items-center justify-between py-4", idx < Math.min(expiringSoon.length, 4) - 1 && "separator-dotted")}>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-white/[0.05] flex items-center justify-center text-lg">
                        {getCategoryEmoji(item.items?.category)}
                      </div>
                      <div>
                        <span className="text-[15px] font-medium text-foreground">{item.items?.name ?? "Unknown"}</span>
                        <span className="block text-[13px] text-muted-foreground">
                          {item.storage_location ?? "Pantry"} · {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col gap-1">
                      <span className={cn(
                        "inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase",
                        status === "expired" ? "bg-[hsla(142,70%,45%,0.15)] text-[#10B981]" : "bg-[hsla(22,100%,55%,0.15)] text-[#FF5A25]"
                      )}>
                        {getExpiryLabel(item.expiry_date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ PANTRY COMPOSITION ═══ */}
        <div className="col-span-1 lg:col-span-4 glass-card glass-card-hover p-4 sm:p-6">
          <h3 className="label-small mb-4">Pantry Composition</h3>
          {composition.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No data yet</p>
          ) : (
            <div className="mt-4 space-y-4">
              {composition.map((cat, i) => (
                <div key={cat.name}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">{cat.name}</span>
                    <span className="text-sm font-medium text-foreground">{cat.pct}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/[0.1] rounded-sm">
                    <div className="h-full rounded-sm transition-all" style={{ width: `${cat.pct}%`, backgroundColor: compositionColors[i % compositionColors.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ INTELLIGENCE ═══ */}
        <div className="col-span-1 lg:col-span-8">
          <IntelligenceWidget />
        </div>

        {/* ═══ SPEND TREND ═══ */}
        <div className="col-span-1 lg:col-span-4 glass-card glass-card-hover p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="label-small">Spend Trend</h3>
            <button onClick={() => navigate("/purchases")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Details
            </button>
          </div>
          <SpendBars purchases={purchases} />
        </div>

        {/* ═══ TODAY'S LOG ═══ */}
        <div className="col-span-1 lg:col-span-6 glass-card glass-card-hover p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="label-small">🍽 Today's Food Log</h3>
            <button onClick={() => navigate("/nutrition")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Open diary <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {recentLogs.length === 0 ? (
            <div className="py-8 text-center">
              <Apple className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No food logged today</p>
              <button onClick={() => navigate("/consumption")} className="mt-3 text-xs font-medium text-primary hover:underline flex items-center gap-1 mx-auto">
                <Plus className="h-3 w-3" /> Log food
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {recentLogs.map((log, idx) => {
                const item = log.items;
                const cal = Number(item?.calories_per_unit ?? 0) * Number(log.quantity);
                return (
                  <div key={log.id} className={cn("flex items-center justify-between py-3", idx < recentLogs.length - 1 && "separator-dotted")}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-white/[0.05] flex items-center justify-center text-lg">
                        {getCategoryEmoji(item?.category)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item?.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.quantity} {item?.serving_size ?? item?.default_unit ?? "serving"} · {format(parseISO(log.consumed_at), "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Flame className="h-3 w-3 text-[#FF5A25]" /> {cal.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ RECENT PURCHASES ═══ */}
        <div className="col-span-1 lg:col-span-6 glass-card glass-card-hover p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="label-small">🧾 Recent Purchases</h3>
            <button onClick={() => navigate("/purchases")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {recentPurchases.length === 0 ? (
            <div className="py-8 text-center">
              <Receipt className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No purchases yet</p>
              <button onClick={() => navigate("/purchases")} className="mt-3 text-xs font-medium text-primary hover:underline flex items-center gap-1 mx-auto">
                <Plus className="h-3 w-3" /> Add purchase
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {recentPurchases.map((p, idx) => (
                <div key={p.id} className={cn("flex items-center justify-between py-3 cursor-pointer", idx < recentPurchases.length - 1 && "separator-dotted")} onClick={() => navigate("/purchases")}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-white/[0.05] flex items-center justify-center">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.store_name || "Purchase"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(p.purchased_at), "MMM d, yyyy")} · {formatDistanceToNow(parseISO(p.purchased_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {p.total_cost != null && Number(p.total_cost) > 0 && (
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(Number(p.total_cost))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ FLOATING ACTION PANEL ═══ */}
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center gap-1 bg-background rounded-full p-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/[0.06]">
        <FabButton onClick={() => navigate("/consumption")}>
          <Heart className="h-4 w-4" /> Consume
        </FabButton>
        <FabButton onClick={() => navigate("/pantry")}>
          <Package className="h-4 w-4" /> Edit Item
        </FabButton>
        <div className="w-px h-6 bg-white/[0.06] mx-1" />
        <FabButton primary onClick={() => navigate("/purchases")}>
          <Plus className="h-4 w-4" /> Log Purchase
        </FabButton>
      </div>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────── */

const QuickStat = ({
  icon: Icon, label, value, sub, onClick,
}: {
  icon: any; label: string; value: string | number; sub?: string; onClick?: () => void;
}) => (
  <div
    className="rounded-2xl bg-white/[0.05] p-3.5 cursor-pointer hover:bg-white/[0.08] transition-all"
    onClick={onClick}
  >
    <Icon className="h-4 w-4 text-muted-foreground mb-2" />
    <p className="text-lg font-medium text-foreground tabular-nums">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    {sub && <p className="text-[10px] text-[#34D399]">{sub}</p>}
  </div>
);

const FabButton = ({ children, primary, onClick }: { children: React.ReactNode; primary?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all",
      primary
        ? "bg-white text-[#05040D] hover:scale-[1.02] hover:bg-gray-100"
        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
    )}
  >
    {children}
  </button>
);

const SpendBars = ({ purchases }: { purchases: any[] | undefined }) => {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  const dailySpend = useMemo(() => {
    const spend = Array(7).fill(0);
    if (!purchases) return spend;
    purchases.forEach(p => {
      const d = parseISO(p.purchased_at);
      if (isThisWeek(d, { weekStartsOn: 1 })) {
        const day = d.getDay();
        const idx = day === 0 ? 6 : day - 1;
        spend[idx] += Number(p.total_cost ?? 0);
      }
    });
    return spend;
  }, [purchases]);

  const maxSpend = Math.max(...dailySpend, 1);

  return (
    <div>
      <div className="flex items-end gap-2 h-[100px] mt-4">
        {dailySpend.map((s, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-t transition-all duration-500",
              i === todayIdx ? "gradient-warm" : "bg-white/[0.1] hover:bg-white/[0.2]"
            )}
            style={{ height: `${Math.max((s / maxSpend) * 100, 4)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {days.map((d, i) => (
          <span key={i} className="text-[10px] text-muted-foreground flex-1 text-center">{d}</span>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
