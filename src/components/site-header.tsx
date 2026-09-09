import Link from "next/link";
import { Logo } from "@/components/logo";

const navLinks = [
  { label: "How it Works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Testimonials", href: "/#testimonials" },
  { label: "About", href: "/about" },
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
