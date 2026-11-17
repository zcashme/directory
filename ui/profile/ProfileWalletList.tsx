"use client";

const WALLETS = [
  { name: "Zingo", href: "https://zingolabs.org/zingo/" },
  { name: "Edge", href: "https://edge.app/" },
  { name: "Cake", href: "https://cakewallet.com/" },
  { name: "Unstoppable", href: "https://unstoppable.money/" },
  { name: "Noir", href: "https://www.zknoir.com/" },
  { name: "Zucchini", href: "https://zucchinifi.xyz/" },
] as const;

export default function ProfileWalletList({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={compact ? "grid grid-cols-2 gap-1.5 list-none p-0" : "list-none space-y-1 pl-0 text-sm text-gray-800"}>
      {(compact ? WALLETS.slice(0, 4) : WALLETS).map(({ name, href }) => (
        <li key={name}>
          <a href={href} target="_blank" rel="noopener noreferrer" title={compact ? name : undefined} aria-label={compact ? name : undefined} className={compact ? "flex h-7 w-7 items-center justify-center transition-transform hover:-translate-y-0.5" : "inline-flex items-center gap-2 hover:text-[var(--color-brand-blue)] hover:underline"}>
            <img
              src={`${new URL(href).origin}/favicon.ico`}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(event) => {
                const icon = event.currentTarget;
                if (icon.dataset.fallback) return;
                icon.dataset.fallback = "true";
                icon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(href).hostname)}&sz=32`;
              }}
            />
            {!compact && name}
          </a>
        </li>
      ))}
      {!compact && <li className="pl-6">and more...</li>}
    </ul>
  );
}
