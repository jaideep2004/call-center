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
    <header className="fixed top-0 left-0 right-0 z-50 max-w-[1300px] w-full mx-auto px-6 pt-5 pointer-events-none">
      <nav className="glass-pill rounded-full px-6 pt-[0.55rem] pb-[0.55rem] flex items-center justify-between border border-white/10 shadow-2xl pointer-events-auto backdrop-blur-xl bg-[rgba(20,10,38,0.55)]">
        <Link href="/" aria-label="Coverage Calls home" className="flex items-center gap-2.5">
          <img src="/images/coveragecallsfinal.png" alt="Coverage Calls" className="h-[1.7rem] w-auto object-contain" />
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-[0.9rem] text-gray-300 font-medium" aria-label="Primary">
          {navLinks.map((l) => (
            <Link key={l.label} className="hover:text-white transition" href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link className="hidden sm:block text-xs font-medium text-gray-300 hover:text-white transition" href="/login">
            Log in
          </Link>
          <Link className="relative group px-4 py-2 rounded-full border-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] text-xs font-semibold shadow-lg hover:bg-[position:right_center] transition-all duration-500 no-underline text-white inline-flex items-center" href="/register">
            <span className="flex items-center gap-1.5">
              Start free trial <span aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
