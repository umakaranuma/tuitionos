"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";

const districts = ["Jaffna", "Colombo", "Kandy", "Gampaha", "Vavuniya", "Kurunegala", "Matara", "Anuradhapura"];

export default function AddInstitutePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", district: "Jaffna", mobile: "", email: "", plan: "basic", subdomain: "",
  });

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <PageShell>
      <Topbar
        title="Add institute"
        subtitle="Manual onboarding"
        right={
          <button className="btn btn-g btn-sm" onClick={() => router.back()}>← Back</button>
        }
      />
      <div className="pb fi">
        <div className="card" style={{ maxWidth: 600 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, marginBottom: 4 }}>New institute setup</div>
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>
              The institute admin will receive a welcome email with their portal URL and temporary password.
            </div>
          </div>
          <hr className="dv" />
          <div className="fgrid">
            <div className="fg fg-full">
              <label>Institute name *</label>
              <input
                placeholder="e.g. St. Patrick's Academy, Jaffna"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div className="fg">
              <label>District</label>
              <select value={form.district} onChange={(e) => handleChange("district", e.target.value)}>
                {districts.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Mobile (WhatsApp)</label>
              <input placeholder="+94 77 123 4567" value={form.mobile} onChange={(e) => handleChange("mobile", e.target.value)} />
            </div>
            <div className="fg">
              <label>Contact email</label>
              <input type="email" placeholder="admin@institute.lk" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
            <div className="fg">
              <label>Plan</label>
              <select value={form.plan} onChange={(e) => handleChange("plan", e.target.value)}>
                <option value="basic">Basic — LKR 3,000/mo</option>
                <option value="premium">Premium — LKR 6,000/mo</option>
                <option value="trial">14-day free trial</option>
              </select>
            </div>
            <div className="fg fg-full">
              <label>Subdomain</label>
              <div style={{ display: "flex", gap: 0 }}>
                <input
                  placeholder="stpatricks"
                  style={{ borderRadius: "var(--r) 0 0 var(--r)", borderRight: "none" }}
                  value={form.subdomain}
                  onChange={(e) => handleChange("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                />
                <span style={{
                  padding: "8px 11px", background: "var(--cr-d)", border: "1.5px solid var(--ln)",
                  borderLeft: "none", borderRadius: "0 var(--r) var(--r) 0", fontSize: 12, color: "var(--ink3)",
                  whiteSpace: "nowrap"
                }}>
                  .tuitionos.lk
                </span>
              </div>
              <div className="hint">Institute's login URL · Only lowercase letters, numbers, hyphens</div>
            </div>
          </div>
          <hr className="dv" />

          {/* Preview */}
          {form.subdomain && (
            <div style={{
              background: "var(--jd-l)", border: "1px solid #b8ddd0", borderRadius: "var(--r)",
              padding: "10px 14px", marginBottom: 14, fontSize: 11.5, color: "var(--tc-d)"
            }}>
              Portal URL: <strong>https://{form.subdomain}.tuitionos.lk</strong>
              {form.email && <> · Welcome email will be sent to <strong>{form.email}</strong></>}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-s" onClick={() => router.back()}>Cancel</button>
            <button className="btn btn-p" onClick={() => router.push("/institutes")}>
              Create institute
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
