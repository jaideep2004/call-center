import Link from "next/link";
import { Logo } from "@/components/logo";

const navLinks = [
  { label: "Product", href: "/#features" },
  { label: "Solutions", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/faq" },
  { label: "Company", href: "/about" },
];

export function SiteHeader() {
  return (
    <header className="site-nav public-nav">
      <div className="site-nav-inner">
        <Logo />
        <nav className="site-nav-links" aria-label="Primary">
          {navLinks.map((l) => (
            <Link key={l.label} className="site-nav-link" href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="site-nav-auth">
          <Link className="site-nav-login" href="/login">
            Log in
          </Link>
          <Link className="site-nav-cta" href="/register">
            Start free trial <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
