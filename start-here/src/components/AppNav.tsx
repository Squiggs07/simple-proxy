import Link from "next/link";

const items = [
  { key: "today", label: "Today", href: "/summary", icon: "⌂" },
  { key: "eat", label: "Eat", href: "/plan", icon: "◌" },
  { key: "train", label: "Train", href: "/train", icon: "↔" },
  { key: "progress", label: "Progress", href: "/progress", icon: "⌁" },
  { key: "coach", label: "Coach", href: "/coach", icon: "✦" },
] as const;

export type AppNavKey = (typeof items)[number]["key"];

export function AppNav({ active }: { active: AppNavKey }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[rgba(252,250,246,.96)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-[31rem] grid-cols-5 px-2 py-1.5">
        {items.map((item) => {
          const selected = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={selected ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.68rem] font-semibold transition ${
                selected ? "text-[var(--evergreen)]" : "text-[var(--muted)]"
              }`}
            >
              <span
                aria-hidden
                className={`grid h-7 w-9 place-items-center rounded-full text-[1rem] ${selected ? "bg-[var(--sage)] text-[var(--evergreen-dark)]" : ""}`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
