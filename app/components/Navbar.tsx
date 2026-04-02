"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Séries", icon: "◈" },
  { href: "/seasons", label: "Temporadas", icon: "◫" },
  { href: "/episodes", label: "Episódios", icon: "▷" },
  { href: "/watchlists", label: "Watchlists", icon: "♡" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          GoLedger <span>Kino</span>
        </Link>

        <ul className="navbar-links">
          {LINKS.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link href={href} className={isActive ? "active" : ""}>
                  <span className="nav-icon">{icon}</span>
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="navbar-status">
          <span className="status-dot" />
          HYPERLEDGER · AWS
        </div>
      </div>
    </nav>
  );
}
