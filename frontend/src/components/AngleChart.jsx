import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function AngleChart({ title, data, angleKey, color = '#8b5cf6' }) {
  const mappedData = (data || []).map((point) => ({
    time: Number(point.time ?? 0),
    value: Number(point.angles?.[angleKey] ?? 0),
  }))

  return (
    <article className="chart-card panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Time series</p>
          <h3>{title}</h3>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={mappedData} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
            <XAxis dataKey="time" tick={{ fill: '#cbd5e1', fontSize: 12 }} label={{ value: 'Time (s)', position: 'insideBottom', fill: '#94a3b8', offset: -6 }} />
            <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} domain={[0, 180]} />
            <Tooltip contentStyle={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)', color: '#e2e8f0' }} />
            <Legend />
            <Line type="monotone" dataKey="value" name={title} stroke={color} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}

export default AngleChart
