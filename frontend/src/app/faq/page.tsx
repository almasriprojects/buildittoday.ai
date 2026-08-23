import type { Metadata } from "next";
import { FaqContent } from "./faq-content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Straight answers on price, timelines, ownership, hosting, and what happens if you cancel.",
  alternates: { canonical: "/faq" },
};

export default function Page() {
  return <FaqContent />;
}
