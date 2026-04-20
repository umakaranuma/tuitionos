import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function InvoicesPage() {
  return (
    <PageShell>
      <Topbar title="Invoices" subtitle="Billing across all institutes" />
      <div className="pb">
        <div className="tw">
          <table className="table">
            <thead><tr><th>Invoice #</th><th>Institute</th><th>Amount</th><th>Plan</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td className="mono">#INV-0081</td><td>St. Patrick&apos;s</td><td className="mono">LKR 6,000</td><td>Premium</td><td className="mono">Apr 10</td><td>Paid</td></tr>
              <tr><td className="mono">#INV-0079</td><td>Bright Minds</td><td className="mono">LKR 3,000</td><td>Basic</td><td className="mono">Apr 10</td><td>Due</td></tr>
              <tr><td className="mono">#INV-0078</td><td>Edu Leaders</td><td className="mono">LKR 3,000</td><td>Basic</td><td className="mono">Mar 10</td><td>Overdue</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
