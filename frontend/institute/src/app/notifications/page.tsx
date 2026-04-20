import { PageShell } from "@/components/layout/PageShell";
import { Topbar } from "@/components/layout/Topbar";

export default function NotificationsPage() {
  return (
    <PageShell>
      <Topbar title="Notifications" subtitle="Premium · WhatsApp delivery settings" />
      <div className="pb">
        <div className="g2">
          <div className="card"><div className="kpi-lbl">Notification toggles</div><p>Fee reminders, timetable changes, absent digest.</p></div>
          <div className="card"><div className="kpi-lbl">History</div><p>Fee reminders: 312 sent · Apr 1</p><p>Annual PDF blast · Jan 8</p></div>
        </div>
      </div>
    </PageShell>
  );
}
