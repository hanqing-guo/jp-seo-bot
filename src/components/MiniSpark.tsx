interface Props {
  data: number[]
  width?: number
  height?: number
  stroke?: string
}

export default function MiniSpark({
  data,
  width = 100,
  height = 28,
  stroke = '#3563ff',
}: Props) {
  if (!data || data.length === 0) {
    return <svg width={width} height={height} />
  }
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1 || 1)
  const points = data
    .map((d, i) => {
      const x = i * step
      const y = height - ((d - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={width} height={height} className="block">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} />
    </svg>
  )
}
