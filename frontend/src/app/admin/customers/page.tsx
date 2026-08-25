import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Customers" };

export default function AdminCustomersPage() {
  return <CustomersClient />;
}
