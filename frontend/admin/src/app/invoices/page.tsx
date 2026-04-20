import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const invoices = [
  { id: "#INV-0081", inst: "St. Patrick's, Jaffna", amount: "LKR 6,000", plan: "premium", issued: "Apr 1", due: "Apr 10", status: "paid" },
  { id: "#INV-0080", inst: "Alpha Lanka, Colombo", amount: "LKR 3,000", plan: "basic", issued: "Apr 1", due: "Apr 10", status: "trial" },
  { id: "#INV-0079", inst: "Bright Minds, Kandy", amount: "LKR 3,000", plan: "basic", issued: "Apr 1", due: "Apr 10", status: "due" },
  { id: "#INV-0078", inst: "Edu Leaders, Vavuniya", amount: "LKR 3,000", plan: "basic", issued: "Mar 1", due: "Mar 10", status: "overdue" },
  { id: "#INV-0077", inst: "Nova Science, Gampaha", amount: "LKR 6,000", plan: "premium", issued: "Apr 1", due: "Apr 10", status: "paid" },
  { id: "#INV-0076", inst: "Sunrise Tutors, Kandy", amount: "LKR 3,000", plan: "basic", issued: "Apr 1", due: "Apr 10", status: "paid" },
  { id: "#INV-0075", inst: "Vision Academy, Colombo", amount: "LKR 6,000", plan: "premium", issued: "Apr 1", due: "Apr 10", status: "paid" },
  { id: "#INV-0074", inst: "Glow Institute, Kandy", amount: "LKR 3,000", plan: "basic", issued: "Mar 1", due: "Mar 10", status: "overdue" },
];

const planBadge = (p: string) =>
  p === "premium" ? <span className="bdg b-prem">Premium</span> : <span className="bdg b-basic">Basic</span>;

const statusBadge = (s: string) => {
  const map: Record<string, JSX.Element> = {
    paid: <span className="bdg b-paid">Paid</span>,
    due: <span className="bdg b-due">Due</span>,
    overdue: <span className="bdg b-over">Overdue</span>,
    trial: <span className="bdg b-trial">Trial</span>,
  };
  return map[s] || <span>{s}</span>;
};

const Actions = ({ status }: { status: string }) => {
  if (status === "overdue") return (
    <div style={{ display: "flex", gap: 4 }}>
      <button className="btn btn-xs btn-d">Suspend</button>
      <button className="btn btn-xs btn-ok">Mark paid</button>
    </div>
  );
  if (status === "due") return (
    <div style={{ display: "flex", gap: 4 }}>
      <button className="btn btn-xs btn-ok">Remind</button>
      <button className="btn btn-xs btn-s">PDF</button>
    </div>
  );
  return <button className="btn btn-xs btn-s">PDF</button>;
};

export default function InvoicesPage() {
  return (
    <PageShell>
      <Topbar
        title="Invoices"
        subtitle="Billing across all institutes"
        right={<button className="btn btn-p btn-sm">+ Manual invoice</button>}
      />
      <div className="pb fi">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Institute</th>
                <th>Amount</th>
                <th>Plan</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="mono">{inv.id}</td>
                  <td>{inv.inst}</td>
                  <td className="mono">{inv.amount}</td>
                  <td>{planBadge(inv.plan)}</td>
                  <td className="mono">{inv.issued}</td>
                  <td className="mono">{inv.due}</td>
                  <td>{statusBadge(inv.status)}</td>
                  <td><Actions status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
