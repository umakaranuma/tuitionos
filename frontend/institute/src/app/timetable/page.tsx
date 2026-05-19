"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageShell } from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Toast } from "@/components/ui/Toast";

type Slot = { id: number; batch: number; batch_name: string; subject: number; subject_name: string; teacher: number; teacher_name: string; day_of_week: string; start_time: string; end_time: string; notes: string };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_MAP: Record<string, string> = { "0": "Monday", "1": "Tuesday", "2": "Wednesday", "3": "Thursday", "4": "Friday", "5": "Saturday", "6": "Sunday" };

export default function TimetablePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [slotModal, setSlotModal] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alertModal, setAlertModal] = useState<{open: boolean, message: string, type: "success"|"error"}|null>(null);

  const loadData = () => {
    const user = getStoredUser();
    if (user?.institute?.plan !== "institute_pro") {
      setIsLocked(true);
      return;
    }
    Promise.all([
      api.get("/api/timetable/"),
      api.get("/api/academics/batches"),
      api.get("/api/academics/subjects"),
      api.get("/api/academics/teachers")
    ]).then(([resT, resB, resS, resTea]) => {
      setSlots(Array.isArray(resT.data) ? resT.data : resT.data.results || []);
      setBatches(Array.isArray(resB.data) ? resB.data : resB.data.results || []);
      setSubjects(Array.isArray(resS.data) ? resS.data : resS.data.results || []);
      setTeachers(Array.isArray(resTea.data) ? resTea.data : resTea.data.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  
  useEffect(() => {
    loadData();
  }, []);

  const searchBatches = async (q: string) => {
    try {
      const r = await api.get(`/api/academics/batches?search=${encodeURIComponent(q)}`);
      setBatches(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch (e) {}
  };

  const searchSubjects = async (q: string) => {
    try {
      const r = await api.get(`/api/academics/subjects?search=${encodeURIComponent(q)}`);
      setSubjects(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch (e) {}
  };

  const searchTeachers = async (q: string) => {
    try {
      const r = await api.get(`/api/academics/teachers?search=${encodeURIComponent(q)}`);
      setTeachers(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch (e) {}
  };

  const saveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!slotModal.batch) newErrors.batch = "Required";
    if (!slotModal.subject) newErrors.subject = "Required";
    if (!slotModal.teacher) newErrors.teacher = "Required";
    if (!slotModal.day_of_week) newErrors.day_of_week = "Required";
    if (!slotModal.start_time) newErrors.start_time = "Required";
    if (!slotModal.end_time) newErrors.end_time = "Required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      if (slotModal.id) {
        await api.put(`/api/timetable/${slotModal.id}/`, slotModal);
        setAlertModal({ open: true, message: "Session updated successfully.", type: "success" });
      } else {
        await api.post("/api/timetable/", slotModal);
        setAlertModal({ open: true, message: "Session added successfully.", type: "success" });
      }
      setSlotModal(null);
      setErrors({});
      loadData();
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to save session.", type: "error" });
    }
  };

  const deleteSlot = async (id: number) => {
    try {
      await api.delete(`/api/timetable/${id}/`);
      setAlertModal({ open: true, message: "Session deleted successfully.", type: "success" });
      loadData();
    } catch (err) {
      setAlertModal({ open: true, message: "Failed to delete session.", type: "error" });
    }
  };

  if (isLocked) {
    return (
      <PageShell>
        <Topbar title="Timetable" />
        <div className="pb fi" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
          <div style={{ background: "var(--tc)", color: "white", padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>PRO FEATURE</div>
          <h2 style={{ fontSize: 24, color: "var(--ink)", fontWeight: 700, marginBottom: 12 }}>Timetable Locked</h2>
          <p style={{ color: "var(--ink2)", textAlign: "center", maxWidth: 400, lineHeight: 1.5 }}>
            Timetable management is an Institute Pro feature. Please upgrade your package in Settings to access this capability.
          </p>
        </div>
      </PageShell>
    );
  }

  const grouped = DAYS.reduce((acc, day, idx) => {
    acc[day] = slots.filter(s => s.day_of_week === String(idx));
    return acc;
  }, {} as Record<string, Slot[]>);

  return (
    <PageShell>
      <Topbar 
        title="Timetable" 
        subtitle={`${slots.length} sessions scheduled`}
        right={
          <button className="btn btn-p" onClick={() => setSlotModal({ batch: "", subject: "", teacher: "", day_of_week: "0", start_time: "", end_time: "" })}>+ Add Session</button>
        }
      />
      <div className="pb fi">
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading...</div> : (
          <div style={{ display: "grid", gap: 12 }}>
            {DAYS.map((day, dayIdx) => {
              const daySlots = grouped[day] || [];
              if (daySlots.length === 0) return null;
              return (
                <div key={day}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>{day}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                    {daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(s => (
                      <div key={s.id} className="card" style={{ padding: "16px 20px", position: "relative" }}>
                        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
                          <button onClick={() => setSlotModal(s)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink2)", fontSize: 11, fontWeight: 600 }}>Edit</button>
                          <button onClick={() => deleteSlot(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rb)", fontSize: 11, fontWeight: 600 }}>Delete</button>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4, paddingRight: 60 }}>{s.batch_name || `Batch #${s.batch}`}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--tc)", marginBottom: 8 }}>
                          {s.subject_name || "Unknown Subject"} <span style={{ color: "var(--ink3)" }}>•</span> {s.teacher_name || "Unknown Teacher"}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--ink3)", display: "flex", gap: 12 }}>
                          <span className="mono">{s.start_time?.slice(0, 5)} — {s.end_time?.slice(0, 5)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {slots.length === 0 && <div className="card" style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>No timetable entries yet</div>}
          </div>
        )}
      </div>

      <Modal
        open={!!slotModal}
        onClose={() => { setSlotModal(null); setErrors({}); }}
        title={slotModal?.id ? "Edit Session" : "Add Session"}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-s" onClick={() => { setSlotModal(null); setErrors({}); }}>Cancel</button>
            <button className="btn btn-p" onClick={saveSlot}>Save Session</button>
          </div>
        }
      >
        <form className="form-gap" onSubmit={saveSlot}>
          <div className="fg">
            <label className="flbl freq">Batch</label>
            <div className={errors.batch ? "input-error" : ""}>
              <SearchableSelect 
                value={slotModal?.batch ? String(slotModal.batch) : ""} 
                onChange={val => { setSlotModal({ ...slotModal, batch: val }); setErrors({ ...errors, batch: "" }); }}
                placeholder="Select Batch..."
                onSearch={searchBatches}
                options={batches.map(b => ({ value: String(b.id), label: b.name }))}
              />
            </div>
            {errors.batch && <div className="f-error">{errors.batch}</div>}
          </div>
          
          <div className="field-row">
            <div className="fg">
              <label className="flbl freq">Subject</label>
              <div className={errors.subject ? "input-error" : ""}>
                <SearchableSelect 
                  value={slotModal?.subject ? String(slotModal.subject) : ""} 
                  onChange={val => { setSlotModal({ ...slotModal, subject: val }); setErrors({ ...errors, subject: "" }); }}
                  placeholder="Select Subject..."
                  onSearch={searchSubjects}
                  options={subjects.map(sub => ({ value: String(sub.id), label: sub.name }))}
                />
              </div>
              {errors.subject && <div className="f-error">{errors.subject}</div>}
            </div>
            <div className="fg">
              <label className="flbl freq">Teacher</label>
              <div className={errors.teacher ? "input-error" : ""}>
                <SearchableSelect 
                  value={slotModal?.teacher ? String(slotModal.teacher) : ""} 
                  onChange={val => { setSlotModal({ ...slotModal, teacher: val }); setErrors({ ...errors, teacher: "" }); }}
                  placeholder="Select Teacher..."
                  onSearch={searchTeachers}
                  options={teachers.map(t => ({ value: String(t.id), label: t.name }))}
                />
              </div>
              {errors.teacher && <div className="f-error">{errors.teacher}</div>}
            </div>
          </div>

          <div className="field-row">
            <div className="fg">
              <label className="flbl freq">Day of Week</label>
              <select className={errors.day_of_week ? "input-error" : ""} value={slotModal?.day_of_week || "0"} onChange={e => { setSlotModal({ ...slotModal, day_of_week: e.target.value }); setErrors({ ...errors, day_of_week: "" }); }}>
                {DAYS.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
              </select>
              {errors.day_of_week && <div className="f-error">{errors.day_of_week}</div>}
            </div>
          </div>
          <div className="field-row">
            <div className="fg">
              <label className="flbl freq">Start Time</label>
              <input type="time" className={errors.start_time ? "input-error" : ""} value={slotModal?.start_time || ""} onChange={e => { setSlotModal({ ...slotModal, start_time: e.target.value }); setErrors({ ...errors, start_time: "" }); }} />
              {errors.start_time && <div className="f-error">{errors.start_time}</div>}
            </div>
            <div className="fg">
              <label className="flbl freq">End Time</label>
              <input type="time" className={errors.end_time ? "input-error" : ""} value={slotModal?.end_time || ""} onChange={e => { setSlotModal({ ...slotModal, end_time: e.target.value }); setErrors({ ...errors, end_time: "" }); }} />
              {errors.end_time && <div className="f-error">{errors.end_time}</div>}
            </div>
          </div>
        </form>
      </Modal>

      <Toast 
        open={!!alertModal?.open} 
        message={alertModal?.message || ""} 
        type={alertModal?.type || "success"} 
        onClose={() => setAlertModal(null)} 
      />
    </PageShell>
  );
}
