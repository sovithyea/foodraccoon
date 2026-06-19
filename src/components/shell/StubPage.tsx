import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function StubPage({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 pb-16 text-center md:pb-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
      <Link href="/" className={buttonVariants({ className: "mt-2" })}>
        Open the map
      </Link>
    </div>
  );
}
