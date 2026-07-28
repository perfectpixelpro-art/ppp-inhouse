import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { STATUS_LABEL, STATUS_COLOR } from "./pmUtils";

// Dashboard tab: stat tiles + a status pie + a per-status bar. props: stats {total, done, overdue, byStatus}
export default function ProjectDashboard({ stats }) {
  if (!stats) return <div className="loading">Loading…</div>;
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const data = ["todo", "in_progress", "done"].map((s) => ({ key: s, name: STATUS_LABEL[s], value: stats.byStatus?.[s] || 0, color: STATUS_COLOR[s] }));
  const hasData = stats.total > 0;

  return (
    <div className="dash">
      <div className="dash-tiles">
        <div className="dash-tile"><div className="dash-num">{stats.total}</div><div className="dash-lbl">Total tasks</div></div>
        <div className="dash-tile"><div className="dash-num" style={{ color: "#16a34a" }}>{stats.done}</div><div className="dash-lbl">Completed</div></div>
        <div className="dash-tile"><div className="dash-num" style={{ color: "#b45309" }}>{stats.byStatus?.in_progress || 0}</div><div className="dash-lbl">In progress</div></div>
        <div className="dash-tile"><div className="dash-num" style={{ color: "#dc2626" }}>{stats.overdue}</div><div className="dash-lbl">Overdue</div></div>
        <div className="dash-tile"><div className="dash-num">{pct}%</div><div className="dash-lbl">Complete</div></div>
      </div>

      {!hasData ? (
        <div className="pm-empty">No tasks yet — add some to see charts.</div>
      ) : (
        <div className="dash-charts">
          <div className="dash-chart">
            <div className="dash-chart-title">Tasks by status</div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label isAnimationActive={false}>
                  {data.map((d) => <Cell key={d.key} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="dash-chart">
            <div className="dash-chart-title">Count per status</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {data.map((d) => <Cell key={d.key} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
