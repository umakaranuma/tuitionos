"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/api";

type Tx = { id: number; month: string; transaction_type: string; category: string; label: string; amount: string; date: string };

const catLabels: Record<string, string> = {
  staff_salary: "Staff Salary", utility_bill: "Utility Bill", rent: "Rent",
  maintenance: "Maintenance", supplies: "Supplies", sponsorship: "Sponsorship",
  platform_fee: "Platform Fee", other_income: "Other Income", other: "Other",
};

// Categories the institute is not allowed to touch. Platform-fee rows are
// auto-created by the admin billing flow whenever a monthly invoice is paid —
// editing them here would desync the books from what was actually charged.
const READ_ONLY_CATEGORIES = new Set(["platform_fee"]);

const YEAR_OPTS = [{ value: "all", label: "All years" }, ...["2026", "2025", "2024"].map(y => ({ value: y, label: y }))];
const MONTH_OPTS = [
  { value: "all", label: "All months" },
  ...["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    .map((m, i) => ({ value: String(i + 1), label: m })),
];

const CAT_OPTS = [
  { value: "utility_bill", label: "Utility Bill" },
  { value: "staff_salary", label: "Staff Salary" },
  { value: "rent", label: "Rent" },
  { value: "maintenance", label: "Maintenance" },
  { value: "supplies", label: "Supplies" },
  { value: "sponsorship", label: "Sponsorship" },
  { value: "other_income", label: "Other Income" },
  { value: "other", label: "Other" },
];

const emptyForm = () => ({
  month: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
  transaction_type: "expense",
  category: "utility_bill",
  label: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
});

export default function AccountsPage() {
  const toast = useToast();
  const [txns, setTxns] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [deleting, setDeleting] = useState<Tx | null>(null);
  const [busy, setBusy] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [year, setYear] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [stats, setStats] = useState({ income: 0, expense: 0 });
  const [meta, setMeta] = useState({ total_count: 0, total_pages: 1 });
  const [form, setForm] = useState(emptyForm());

  const load = () => {
    setLoading(true);
    api.get(`/api/billing/transactions?page=${page}&limit=${limit}&year=${year}&month=${month}`).then(r => {
      const d = r.data;
      if (d.total_count !== undefined) setMeta({ total_count: d.total_count, total_pages: d.total_pages });
      setTxns(Array.isArray(d) ? d : d.results || []);
      if (d.stats) setStats({ income: d.stats.total_income, expense: d.stats.total_expense });
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, [page, limit, year, month]);

  const openAdd = () => { setForm(emptyForm()); setEditing(null); setModal("add"); };

  const openEdit = (t: Tx) => {
    if (READ_ONLY_CATEGORIES.has(t.category)) {
      toast.info?.("Platform fee entries are managed by the platform's billing — they can't be edited here.");
      return;
    }
    setEditing(t);
    setForm({
      month: t.month,
      transaction_type: t.transaction_type,
      category: t.category,
      label: t.label,
      amount: String(t.amount),
      date: t.date,
    });
    setModal("edit");
  };

  const save = async () => {
    if (!form.label.trim()) { toast.error("Add a label first."); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Enter a positive amount."); return; }
    setBusy(true);
    try {
      if (modal === "edit" && editing) {
        await api.patch(`/api/billing/transactions/${editing.id}`, form);
        toast.success("Transaction updated.");
      } else {
        await api.post("/api/billing/transactions", form);
        toast.success("Transaction added.");
      }
      setModal(null); setEditing(null); load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Couldn't save the transaction.");
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    if (READ_ONLY_CATEGORIES.has(deleting.category)) {
      toast.info?.("Platform fee entries can't be deleted from here.");
      setDeleting(null);
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/api/billing/transactions/${deleting.id}`);
      toast.success("Transaction deleted.");
      setDeleting(null); load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Couldn't delete the transaction.");
    } finally { setBusy(false); }
  };

  const income = stats.income;
  const expense = stats.expense;

  return (
    <PageShell>
      <Topbar
        title="Accounts"
        subtitle={`${meta.total_count || txns.length} transactions`}
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 120 }}>
              <SearchSelect value={year} onChange={v => { setYear(v); setPage(1); }} options={YEAR_OPTS} searchable={false} />
            </div>
            <div style={{ width: 140 }}>
              <SearchSelect
                value={month}
                onChange={v => { setMonth(v); setPage(1); }}
                options={MONTH_OPTS}
                disabled={year === "all"}
              />
            </div>
            <button className="btn btn-p btn-sm" onClick={openAdd}>+ Add transaction</button>
          </div>
        }
      />

      <div className="pb fi">
        <div className="g4" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ "--kc": "var(--tc)" } as React.CSSProperties}>
            <div className="kpi-lbl">Income</div>
            <div className="kpi-val">LKR {income.toLocaleString()}</div>
            <div className="kpi-tr up">total</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--rb)" } as React.CSSProperties}>
            <div className="kpi-lbl">Expenses</div>
            <div className="kpi-val">LKR {expense.toLocaleString()}</div>
            <div className="kpi-tr dn">total</div>
          </div>
          <div className="kpi" style={{ "--kc": "var(--jd)" } as React.CSSProperties}>
            <div className="kpi-lbl">Net</div>
            <div className="kpi-val">LKR {(income - expense).toLocaleString()}</div>
            <div className="kpi-tr nt">{income >= expense ? "Positive" : "Negative"}</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading…</div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Label</th><th>Type</th><th>Category</th>
                  <th>Amount (LKR)</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {txns.map(t => {
                  const locked = READ_ONLY_CATEGORIES.has(t.category);
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="td-nm-main" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {t.label}
                          {locked && (
                            <span
                              title="Auto-generated when you paid the platform invoice. Edit it from Settings → Billing if needed."
                              style={{
                                fontSize: 9.5, fontWeight: 700, padding: "2px 7px",
                                borderRadius: 99, background: "var(--cr-d)", color: "var(--ink3)",
                                letterSpacing: ".05em",
                              }}
                            >
                              SYSTEM
                            </span>
                          )}
                        </div>
                        <div className="td-nm-sub">{t.month}</div>
                      </td>
                      <td>
                        {t.transaction_type === "income"
                          ? <span className="bdg b-paid">Income</span>
                          : <span className="bdg b-over">Expense</span>}
                      </td>
                      <td style={{ color: "var(--ink3)" }}>{catLabels[t.category] || t.category}</td>
                      <td className="mono">{Number(t.amount).toLocaleString()}</td>
                      <td className="mono" style={{ color: "var(--ink3)" }}>{t.date}</td>
                      <td>
                        {locked ? (
                          <span style={{ fontSize: 11, color: "var(--ink3)" }}>—</span>
                        ) : (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn btn-xs btn-s" onClick={() => openEdit(t)}>Edit</button>
                            <button className="btn btn-xs btn-d" onClick={() => setDeleting(t)}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {txns.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No transactions found</td></tr>
                )}
              </tbody>
            </table>
            <Pagination
              page={page}
              limit={limit}
              totalCount={meta.total_count}
              totalPages={meta.total_pages}
              onPageChange={setPage}
              onLimitChange={l => { setLimit(l); setPage(1); }}
              itemName="transactions"
            />
          </div>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => { setModal(null); setEditing(null); }}
        title={modal === "edit" ? "Edit transaction" : "Add transaction"}
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => { setModal(null); setEditing(null); }} disabled={busy}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={save} disabled={busy}>{busy ? "Saving…" : modal === "edit" ? "Save changes" : "Add"}</button>
        </>}
      >
        <div className="form-gap">
          <div>
            <label className="flbl freq">Label</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} autoFocus placeholder="e.g. October electricity bill" />
          </div>
          <div className="field-row">
            <div className="fg">
              <label className="flbl">Type</label>
              <SearchableSelect
                value={form.transaction_type}
                onChange={val => setForm(f => ({ ...f, transaction_type: String(val) }))}
                options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]}
              />
            </div>
            <div className="fg">
              <label className="flbl">Category</label>
              <SearchableSelect
                value={form.category}
                onChange={val => setForm(f => ({ ...f, category: String(val) }))}
                options={CAT_OPTS}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="fg"><label className="flbl">Amount (LKR)</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div className="fg"><label className="flbl">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete transaction"
        footer={<>
          <button className="btn btn-s btn-sm" onClick={() => setDeleting(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-d btn-sm" onClick={confirmDelete} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
        </>}
      >
        <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.5 }}>
          {deleting && (
            <>
              Delete <strong>{deleting.label}</strong>{" "}
              (LKR {Number(deleting.amount).toLocaleString()})?
              <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 8 }}>
                This removes the entry from your ledger. The action cannot be undone.
              </div>
            </>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}
