import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="site-footer public-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo size={28} />
          <p>
            The inbound call platform for agents and agencies who want better
            conversations and better results.
          </p>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><Link href="/how-it-works">Features</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/why-choose-us">Why Choose Us</Link></li>
              <li><Link href="/testimonials">Testimonials</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 Coverage Calls. All rights reserved.</span>
      </div>
    </footer>
  );
}
