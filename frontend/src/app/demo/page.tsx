import type { Metadata } from "next";
import { DemoContent } from "./demo-content";

export const metadata: Metadata = {
  title: "Demo Sites",
  description: "Real sites we have built, running live — not screenshots.",
  alternates: { canonical: "/demo" },
};

export default function Page() {
  return <DemoContent />;
}
