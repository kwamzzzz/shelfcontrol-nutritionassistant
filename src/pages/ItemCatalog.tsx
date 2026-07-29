import { BookOpen, PackagePlus, Sparkles } from "lucide-react";
import ItemCatalogSection from "@/components/pantry/ItemCatalogSection";

const ItemCatalog = () => (
  <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--secondary)/0.45))] px-5 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="relative flex max-w-3xl items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <BookOpen className="h-6 w-6" />
        </span>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Your reusable food library
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Item Catalog
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Maintain product names, images, categories and nutrition here. Pantry stock stays focused on what is physically in your kitchen.
          </p>
        </div>
      </div>
      <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/75 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
        <PackagePlus className="h-3.5 w-3.5 text-primary" />
        Catalog entries can be reused across purchases, pantry stock and recipes.
      </div>
    </section>

    <ItemCatalogSection defaultOpen />
  </div>
);

export default ItemCatalog;
