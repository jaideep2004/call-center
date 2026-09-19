import type { Metadata } from "next";
import ContactClient from "./contact-client";

export const metadata: Metadata = {
  title: "Contact — Coverage Calls",
  description:
    "Talk to senior insurance telephony specialists — inbound calls, WebRTC API, or carrier traffic ingestion. First response in under 14 minutes.",
};

export default function ContactPage() {
  return <ContactClient />;
}
