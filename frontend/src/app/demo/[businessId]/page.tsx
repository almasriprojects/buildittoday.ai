import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createAnonClient, createServiceRoleClient } from "@/lib/supabase";
import { notFound, redirect } from "next/navigation";
import { DemoGate } from "@/components/demo/demo-gate";

// If the new AI-generated bespoke HTML pipeline (generate-design-html) has
// produced a ready site for this slug, redirect to it. Leads that haven't
// gone through that pipeline yet fall through to the legacy template below.
async function checkForDesignHtmlSite(demoSlug: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("demo_sites")
    .select("id")
    .eq("demo_slug", demoSlug)
    .eq("status", "ready")
    .maybeSingle();
  return Boolean(data);
}

interface GeneratedContent {
  tagline: string;
  hero: { headline: string; subheadline: string; cta_text: string };
  about: { heading: string; body: string };
  services: { title: string; description: string }[];
  why_choose_us: string[];
  contact_cta: { heading: string; body: string; button_text: string };
}

async function getGeneratedLead(demoSlug: string) {
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("public_demo_sites")
    .select("business_name, city, state, generated_content")
    .eq("demo_slug", demoSlug)
    .maybeSingle();
  return data;
}

export default async function DemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { businessId } = await params;
  const { src } = await searchParams;

  if (await checkForDesignHtmlSite(businessId)) {
    redirect(`/demo-sites/${businessId}${src ? `?src=${src}` : ""}`);
  }

  const lead = await getGeneratedLead(businessId);

  if (!lead || !lead.generated_content) {
    notFound();
  }

  const content = lead.generated_content as GeneratedContent;

  return (
    <DemoGate businessName={lead.business_name} demoSlug={businessId} src={src}>
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container-max flex items-center justify-between h-16 px-4">
          <h1 className="text-lg font-bold">{lead.business_name}</h1>
          <a href="#claim" className="text-sm font-medium text-primary hover:underline">
            Claim This Website
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-r from-primary/90 to-primary text-white py-20 md:py-32">
        <div className="container-max text-center px-4">
          <p className="text-sm uppercase tracking-wide text-white/80 mb-3">{content.tagline}</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">{content.hero.headline}</h2>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">{content.hero.subheadline}</p>
          <a href="#claim">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90">
              {content.hero.cta_text}
            </Button>
          </a>
        </div>
      </section>

      {/* About */}
      <section className="section-padding">
        <div className="container-max max-w-3xl mx-auto text-center px-4">
          <h3 className="text-2xl font-bold mb-4">{content.about.heading}</h3>
          <p className="text-muted-foreground text-lg">{content.about.body}</p>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding bg-secondary/30">
        <div className="container-max px-4">
          <h3 className="text-2xl font-bold text-center mb-12">Our Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {content.services.map((service, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <h4 className="text-lg font-semibold mb-2">{service.title}</h4>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding">
        <div className="container-max max-w-3xl mx-auto px-4">
          <h3 className="text-2xl font-bold text-center mb-8">Why Choose Us</h3>
          <ul className="space-y-3">
            {content.why_choose_us.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-primary font-bold mt-0.5">&#10003;</span>
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Claim / Contact */}
      <section id="claim" className="section-padding bg-secondary/50">
        <div className="container-max max-w-lg mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4">{content.contact_cta.heading}</h3>
          <p className="text-muted-foreground mb-8">{content.contact_cta.body}</p>
          <p className="text-sm text-muted-foreground mb-6">
            This is a free preview website we built for <strong>{lead.business_name}</strong>. Want this live on your own domain?
          </p>

          <form className="space-y-4 text-left">
            <Input placeholder="Your Name" required />
            <Input placeholder="Phone Number" type="tel" required />
            <Input placeholder="Email" type="email" required />
            <Button type="submit" size="lg" className="w-full">
              {content.contact_cta.button_text}
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-white">
        <div className="container-max text-center px-4">
          <p className="text-sm text-muted-foreground">
            {lead.business_name} {lead.city && lead.state ? `| ${lead.city}, ${lead.state}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This preview was auto-generated by BuildItToday.ai and is not yet {lead.business_name}&apos;s official website.
          </p>
        </div>
      </footer>
    </div>
    </DemoGate>
  );
}
