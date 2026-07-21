import { cn } from "@/lib/utils";
import logoWhite from "@/assets/brand/ShelfControl_Logo_Primary_White_Transparent_2400.png.asset.json";
import logoColor from "@/assets/brand/ShelfControl_Logo_Primary_FullColor_Transparent_2400.png.asset.json";

type Variant = "auto" | "light-bg" | "dark-bg";

interface BrandLogoProps {
  className?: string;
  variant?: Variant;
  alt?: string;
}

/**
 * Renders the ShelfControl wordmark.
 * - "light-bg": always full-color (green) logo — for white/light surfaces.
 * - "dark-bg": always white logo — for dark surfaces.
 * - "auto": follows the user's system color scheme via <picture>.
 */
export const BrandLogo = ({ className, variant = "auto", alt = "ShelfControl" }: BrandLogoProps) => {
  if (variant === "light-bg") {
    return <img src={logoColor.url} alt={alt} className={cn(className)} />;
  }
  if (variant === "dark-bg") {
    return <img src={logoWhite.url} alt={alt} className={cn(className)} />;
  }
  return (
    <picture>
      <source srcSet={logoWhite.url} media="(prefers-color-scheme: dark)" />
      <img src={logoColor.url} alt={alt} className={cn(className)} />
    </picture>
  );
};

export default BrandLogo;