import type { Metadata } from "next";
import AboutClient from "./about-client";

export const metadata: Metadata = {
  title: "About — Coverage Calls",
  description:
    "CoverageCalls replaces brittle SIP softphones with pure WebRTC infrastructure — built by insurance operators for high-intent inbound calls.",
};

export default function AboutPage() {
  return <AboutClient />;
}
