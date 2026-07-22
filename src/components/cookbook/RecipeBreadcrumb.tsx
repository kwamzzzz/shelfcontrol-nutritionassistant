import { ChevronRight, Edit3, Plus, MoreHorizontal, Share2, Printer, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  title: string;
  onEdit?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  onNew?: () => void;
  onDuplicate?: () => void;
}

const RecipeBreadcrumb = ({ title, onEdit, onShare, onPrint, onNew, onDuplicate }: Props) => (
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
      <Button size="sm" onClick={onNew} className="gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="h-3.5 w-3.5" /> New Recipe
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-full h-9 w-9 p-0" aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onShare} className="gap-2">
            <Share2 className="h-4 w-4" /> Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate} className="gap-2">
            <Copy className="h-4 w-4" /> Duplicate Recipe
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
);

export default RecipeBreadcrumb;