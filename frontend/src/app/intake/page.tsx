import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design Studio",
  description: "Shape the look of your site before we build it.",
  alternates: { canonical: "/intake" },
};

import { DesignStudio } from "@/components/intake/design-studio";

export default function IntakePage() {
  return <DesignStudio />;
}