import { netBalanceMs, overtimeMs } from "./payroll";

const fmtHm = (ms) => {
  const m = Math.round(Math.abs(ms) / 60000);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? (mm ? `${h}h ${mm}m` : `${h}h`) : `${mm}m`;
};

// Overall overtime / shortfall across finished days. Rain days count normally.
// Used on both the employee In/Out page and the admin/HR In/Out tab.
export default function BalanceCard({ records = [], label = "Overall balance" }) {
  const done = records.filter((r) => r.state === "ended");
  let over = 0;
  let short = 0;
  for (const r of done) {
    const d = overtimeMs(r);
    if (d > 0) over += d;
    else short += -d;
  }
  const net = netBalanceMs(records);
  const positive = net >= 0;

  return (
    <div className="balance-card">
      <div className="balance-net">
        <span className="balance-label">{label}</span>
        <span className={`balance-value ${positive ? "up" : "down"}`}>
          {net === 0 ? "0m" : `${positive ? "+" : "−"}${fmtHm(net)}`}
        </span>
        <span className="balance-sub">{positive ? "overtime in hand" : "hours short"}</span>
      </div>
      <div className="balance-split">
        <div>
          <span className="balance-label">Total overtime</span>
          <span className="balance-chip up">+{fmtHm(over)}</span>
        </div>
        <div>
          <span className="balance-label">Total short</span>
          <span className="balance-chip down">−{fmtHm(short)}</span>
        </div>
        <div>
          <span className="balance-label">Days counted</span>
          <span className="balance-chip">{done.length}</span>
        </div>
      </div>
    </div>
  );
}
