import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "@/app/homepage.css";
import "@/styles/public.css";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-shell">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
