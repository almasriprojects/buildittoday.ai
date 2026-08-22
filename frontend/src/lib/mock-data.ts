// Realistic mock data for the admin console — swap for Supabase queries later.
import type { Customer, Campaign, Invoice, AnalyticsSummary, CustomerAnalytics } from "./types";

export const mockCustomers: Customer[] = [
  { id: "c1", business_name: "Sunshine Plumbing", industry: "Plumbing", phone: "(555) 123-4567", email: "hello@sunshineplumbing.com", address_street: "123 Main St", address_city: "Orlando", address_state: "FL", address_zip: "32801", demo_url: "/demo/sunshine", live_url: "https://sunshineplumbing.buildittoday.ai", created_at: "2026-07-01T10:00:00Z", subscription_status: "active", hosting_status: "active", monthly_payment: 50, setup_fee_paid: true },
  { id: "c2", business_name: "Coastal Dental", industry: "Dental", phone: "(555) 234-5678", email: "hello@coastaldental.com", address_street: "456 Ocean Ave", address_city: "Miami", address_state: "FL", address_zip: "33101", demo_url: "/demo/coastal", live_url: "https://coastaldental.buildittoday.ai", created_at: "2026-07-05T10:00:00Z", subscription_status: "active", hosting_status: "active", monthly_payment: 50, setup_fee_paid: true },
  { id: "c3", business_name: "GreenLeaf Landscaping", industry: "Landscaping", phone: "(555) 345-6789", email: "hello@greenleaf.com", address_street: "789 Palm Dr", address_city: "Tampa", address_state: "FL", address_zip: "33601", demo_url: "/demo/greenleaf", created_at: "2026-07-10T10:00:00Z", subscription_status: "pending", hosting_status: "pending", monthly_payment: 50, setup_fee_paid: false },
  { id: "c4", business_name: "BrightPath Accounting", industry: "Accounting", phone: "(555) 456-7890", email: "hello@brightpath.com", address_street: "321 Oak St", address_city: "Jacksonville", address_state: "FL", address_zip: "32201", demo_url: "/demo/brightpath", created_at: "2026-07-15T10:00:00Z", subscription_status: "active", hosting_status: "active", monthly_payment: 50, setup_fee_paid: true },
  { id: "c5", business_name: "Harbor Realty", industry: "Real Estate", phone: "(555) 567-8901", email: "hello@harborrealty.com", address_street: "654 Bay St", address_city: "Fort Lauderdale", address_state: "FL", address_zip: "33301", demo_url: "/demo/harbor", created_at: "2026-07-20T10:00:00Z", subscription_status: "paused", hosting_status: "paused", monthly_payment: 50, setup_fee_paid: true },
];

export const mockCampaigns: Campaign[] = [
  { id: "camp1", name: "July 2026 — Orlando Plumbers", date_sent: "2026-07-01", postcards_sent: 500, qr_scans: 32, conversions: 6, revenue: 9000, cost: 250, status: "sent" },
  { id: "camp2", name: "July 2026 — Miami Dentists", date_sent: "2026-07-05", postcards_sent: 300, qr_scans: 18, conversions: 4, revenue: 6000, cost: 150, status: "sent" },
  { id: "camp3", name: "August 2026 — Tampa Landscapers", date_sent: "2026-08-01", postcards_sent: 400, qr_scans: 0, conversions: 0, revenue: 0, cost: 200, status: "processing" },
];

export const mockInvoices: Invoice[] = [
  { id: "inv1", customer_id: "c1", customer_name: "Sunshine Plumbing", amount: 50, status: "paid", due_date: "2026-08-01", paid_date: "2026-08-01" },
  { id: "inv2", customer_id: "c2", customer_name: "Coastal Dental", amount: 50, status: "paid", due_date: "2026-08-05", paid_date: "2026-08-05" },
  { id: "inv3", customer_id: "c4", customer_name: "BrightPath Accounting", amount: 50, status: "pending", due_date: "2026-08-15" },
  { id: "inv4", customer_id: "c5", customer_name: "Harbor Realty", amount: 50, status: "overdue", due_date: "2026-07-20" },
];

export const mockAnalytics: AnalyticsSummary = {
  total_revenue: 21000,
  monthly_recurring: 200,
  projected_arr: 2400,
  churn_rate: 0.2,
  new_customers: 3,
  active_customers: 3,
  churned_customers: 0,
  ltv: 1500,
  total_postcards_sent: 1200,
  avg_response_rate: 0.06,
  avg_conversion_rate: 0.2,
  cac: 41.67,
  roi_per_postcard: 36,
  avg_load_time: 1.8,
  avg_monthly_visitors: 850,
  avg_form_submissions: 12,
};

export const mockCustomerAnalytics: CustomerAnalytics[] = [
  { customer_id: "c1", customer_name: "Sunshine Plumbing", total_visits: 1240, unique_visitors: 980, page_views: 3100, avg_time_on_page: 2.4, bounce_rate: 0.42, top_pages: [{ page: "Home", traffic: 45 }, { page: "Services", traffic: 30 }, { page: "Contact", traffic: 25 }], form_submissions: 18, phone_clicks: 22, visitor_trend: [{ date: "2026-07-01", visits: 30 }, { date: "2026-07-08", visits: 42 }, { date: "2026-07-15", visits: 38 }, { date: "2026-07-22", visits: 51 }] },
  { customer_id: "c2", customer_name: "Coastal Dental", total_visits: 980, unique_visitors: 760, page_views: 2400, avg_time_on_page: 2.1, bounce_rate: 0.38, top_pages: [{ page: "Home", traffic: 40 }, { page: "Services", traffic: 35 }, { page: "Contact", traffic: 25 }], form_submissions: 14, phone_clicks: 18, visitor_trend: [{ date: "2026-07-01", visits: 25 }, { date: "2026-07-08", visits: 35 }, { date: "2026-07-15", visits: 30 }, { date: "2026-07-22", visits: 40 }] },
];