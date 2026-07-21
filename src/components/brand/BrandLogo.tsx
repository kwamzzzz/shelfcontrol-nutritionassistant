import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
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
 * - "auto": follows the active app theme class.
 */
export const BrandLogo = ({ className, variant = "auto", alt = "ShelfControl" }: BrandLogoProps) => {
  const { resolvedTheme } = useTheme();

  if (variant === "light-bg") {
    return <img src={logoColor.url} alt={alt} className={cn(className)} />;
  }
  if (variant === "dark-bg") {
    return <img src={logoWhite.url} alt={alt} className={cn(className)} />;
  }

  const logo = resolvedTheme === "dark" ? logoWhite : logoColor;

  return <img src={logo.url} alt={alt} className={cn(className)} />;
};

export default BrandLogo;