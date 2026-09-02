import { IntegrationsClient } from "./integrations-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Integrations" };

export default function AdminIntegrationsPage() {
  return <IntegrationsClient />;
}
