import Link from "next/link";
import { cn } from "@/lib/utils";

type BreadcrumbItem =
  | { label: string; href: string }
  | { label: string; href?: undefined };

export function Breadcrumb({
  items,
  className,
  variant = "light",
}: {
  items: BreadcrumbItem[];
  className?: string;
  variant?: "light" | "dark";
}) {
  const sepColor   = variant === "dark" ? "text-[#8C7E72]"  : "text-white/60";
  const activeColor = variant === "dark" ? "text-[#2C2420] font-semibold" : "font-semibold text-white";
  const linkColor  = variant === "dark" ? "text-[#8C7E72] hover:text-[#2C2420]" : "text-white/80 hover:text-white";

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm", className)}>
      <ol className="flex min-w-0 items-center gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && (
                <span aria-hidden className={cn("shrink-0", sepColor)}>›</span>
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn("max-w-[28ch] truncate", activeColor)}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn("max-w-[20ch] truncate transition-colors", linkColor)}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
