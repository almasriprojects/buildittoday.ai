import { AgentsClient } from "./agents-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agents" };

export default function AdminAgentsPage() {
  return <AgentsClient />;
}
