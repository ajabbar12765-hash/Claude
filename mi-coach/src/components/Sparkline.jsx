export default function Sparkline({ values, width = 280, height = 64, color = '#ff8a3d', fill = true }) {
  const points = values.map((v, i) => ({ i, v })).filter((p) => typeof p.v === 'number')
  if (points.length < 2) {
    return (
      <div className="sparkline-empty" style={{ width, height }}>
        Not enough data yet
      </div>
    )
  }

  const xs = points.map((p) => p.i)
  const ys = points.map((p) => p.v)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys, 0)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  const toXY = (p) => {
    const x = ((p.i - minX) / spanX) * (width - 8) + 4
    const y = height - 6 - ((p.v - minY) / spanY) * (height - 12)
    return [x, y]
  }

  const coords = points.map(toXY)
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${height - 2} L${coords[0][0].toFixed(1)},${height - 2} Z`
  const [lastX, lastY] = coords[coords.length - 1]

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="sparkline">
      {fill && <path d={area} fill={color} opacity="0.12" stroke="none" />}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
    </svg>
  )
}
