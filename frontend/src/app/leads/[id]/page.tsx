import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    notFound();
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{lead.business_name}</h1>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          {lead.status ?? "new"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-2">Contact</h2>
          <div className="space-y-2 text-sm">
            {lead.contact_phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {lead.contact_phone}
              </p>
            )}
            {lead.contact_email && (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> {lead.contact_email}
              </p>
            )}
            {lead.full_address && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {lead.full_address}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-2">Details</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Document #:</span>{" "}
              {lead.document_number}
            </p>
            <p>
              <span className="text-muted-foreground">Category:</span>{" "}
              {lead.business_category ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Target fit:</span>{" "}
              {lead.target_fit ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {lead.demo_slug && (
        <div className="mt-6">
          <Button asChild>
            <a href={`/demo/${lead.demo_slug}`}>View Demo Site</a>
          </Button>
        </div>
      )}
    </div>
  );
}