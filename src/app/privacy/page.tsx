import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { privacy } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy · Distill", description: privacy.intro };

export default function PrivacyPage() {
  return <LegalPage page="privacy" doc={privacy} />;
}
