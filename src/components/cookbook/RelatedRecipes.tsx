import { useRef } from "react";
import { ChevronLeft, ChevronRight, Heart, Clock, Users } from "lucide-react";
import { RELATED_RECIPES } from "@/data/cookbookMockData";

const RelatedRecipes = () => {
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => {
    scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">You might also like</h3>
        <div className="flex items-center gap-2">
          <button className="text-xs text-primary hover:underline mr-2">View all</button>
          <button onClick={() => scroll(-1)} className="h-7 w-7 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => scroll(1)} className="h-7 w-7 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="mt-4 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
      >
        {RELATED_RECIPES.map((r) => (
          <div
            key={r.id}
            className="snap-start shrink-0 w-[260px] rounded-2xl border border-border/60 bg-background/50 overflow-hidden group hover:border-primary/40 transition-colors"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img src={r.image} alt={r.title} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <button
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"
                aria-label="Favorite"
              >
                <Heart className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-3">
              <div className="text-sm font-medium text-foreground line-clamp-1">{r.title}</div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.mins} mins</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.servings} servings</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedRecipes;