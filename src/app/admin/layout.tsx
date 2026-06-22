import Link from "next/link"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card sticky top-0 z-10 flex items-center justify-between border-b px-6 py-3">
        <span className="text-primary font-bold tracking-tight">foodraccoon admin</span>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Back to app
        </Link>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  )
}
