import Link from "next/link";

const TABS = [
  { href: "route", label: "Route" },
  { href: "map", label: "Map" },
  { href: "add", label: "Add" },
  { href: "tips", label: "Tips" },
  { href: "budget", label: "Budget" },
  { href: "packing", label: "Packing" },
] as const;

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="flex-1">{children}</main>
      {/* TODO: restyle per Broadsheet's .nav pattern once vendored (ROADMAP.md M0) */}
      <nav className="flex justify-around border-t p-2">
        {TABS.map((tab) => (
          <Link key={tab.href} href={`/trips/${tripId}/${tab.href}`}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
