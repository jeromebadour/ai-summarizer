import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { terms } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Use · Distill", description: terms.intro };

export default function TermsPage() {
  return <LegalPage page="terms" doc={terms} />;
}
