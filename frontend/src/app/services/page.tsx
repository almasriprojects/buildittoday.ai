import type { Metadata } from "next";
import { ServicesContent } from "./services-content";

export const metadata: Metadata = {
  title: "Services",
  description: "Websites, growth, and automation for Florida small businesses.",
  alternates: { canonical: "/services" },
};

export default function Page() {
  return <ServicesContent />;
}
