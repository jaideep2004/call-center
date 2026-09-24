"use client";
import Script from "next/script";

/**
 * Single booking system: the client-provided GoHighLevel calendar. Agents
 * book from Dashboard → Onboarding; bookings live in GoHighLevel (which can
 * redirect back with ?booked=1), not our tables. Swap the ID if the client
 * rotates calendars.
 *
 * Scroll contract: the iframe is tall enough for the full multi-step widget
 * (no inner scroll container of our own — the page scrolls naturally). The
 * widget itself never scrolls internally (scrolling="no").
 */
export const GHL_BOOKING_ID = "pmvq1BWzISoVJkfnrZWJ";
export const GHL_BOOKING_SRC = `https://api.leadconnectorhq.com/widget/booking/${GHL_BOOKING_ID}`;

/** Tall enough for the full GHL booking flow without an inner scrollbar. */
export const GHL_BOOKING_HEIGHT = 960;

export default function GhlBooking({ heading, sub }: { heading: string; sub: string }) {
  return (
    <div className="card" style={{ padding: "var(--space-5)", overflow: "visible" }}>
      <h2 className="card-title" style={{ marginBottom: 4 }}>
        {heading}
      </h2>
      <p className="text-muted" style={{ fontSize: 11, margin: "0 0 var(--space-4)" }}>
        {sub}
      </p>
      <Script src="https://link.msgsndr.com/js/form_embed.js" strategy="lazyOnload" />
      <iframe
        src={GHL_BOOKING_SRC}
        title={heading}
        style={{
          width: "100%",
          height: GHL_BOOKING_HEIGHT,
          minHeight: GHL_BOOKING_HEIGHT,
          border: "none",
          display: "block",
          overflow: "hidden",
          borderRadius: 12,
          background: "#fff",
        }}
        scrolling="no"
        loading="lazy"
        allow="payment"
      />
    </div>
  );
}
