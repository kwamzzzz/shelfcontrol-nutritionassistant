import { ChevronRight, Edit3, Share2, Printer, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  onEdit?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  onNew?: () => void;
}

const RecipeBreadcrumb = ({ title, onEdit, onShare, onPrint, onNew }: Props) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link to="/recipes" className="hover:text-foreground transition-colors">
        My Cook Book
      </Link>
      <ChevronRight className="h-4 w-4 opacity-60" />
      <span className="text-foreground font-medium">{title}</span>
    </nav>
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 rounded-full">
        <Edit3 className="h-3.5 w-3.5" /> Edit
      </Button>
      <Button variant="outline" size="sm" onClick={onShare} className="gap-2 rounded-full">
        <Share2 className="h-3.5 w-3.5" /> Share
      </Button>
      <Button variant="outline" size="sm" onClick={onPrint} className="gap-2 rounded-full">
        <Printer className="h-3.5 w-3.5" /> Print
      </Button>
      <Button size="sm" onClick={onNew} className="gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="h-3.5 w-3.5" /> New Recipe
      </Button>
    </div>
  </div>
);

export default RecipeBreadcrumb;