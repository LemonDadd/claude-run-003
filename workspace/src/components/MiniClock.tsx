/** 可爱卡通时钟（整点 / 半点） */
export function MiniClock({
  hour,
  half = false,
  size = 300,
}: {
  hour: number;
  half?: boolean;
  size?: number;
}) {
  const cx = 100;
  const cy = 100;
  // 时针角度：半点时时针在两个数字中间
  const hourAngle = ((hour % 12) + (half ? 0.5 : 0)) * 30 - 90;
  const minAngle = (half ? 30 : 0) - 90;
  const hx = cx + Math.cos((hourAngle * Math.PI) / 180) * 42;
  const hy = cy + Math.sin((hourAngle * Math.PI) / 180) * 42;
  const mx = cx + Math.cos((minAngle * Math.PI) / 180) * 62;
  const my = cy + Math.sin((minAngle * Math.PI) / 180) * 62;

  return (
    <svg
      className="clock-face"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${hour}点${half ? "半" : ""}`}
    >
      <circle cx={cx} cy={cy} r={92} fill="#fffbeb" stroke="#f59e0b" strokeWidth={7} />
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const a = (n * 30 - 90) * (Math.PI / 180);
        const tx = cx + Math.cos(a) * 74;
        const ty = cy + Math.sin(a) * 74 + 7;
        return (
          <text
            key={n}
            x={tx}
            y={ty}
            textAnchor="middle"
            fontSize={16}
            fontWeight={800}
            fill="#92400e"
          >
            {n}
          </text>
        );
      })}
      <line
        x1={cx}
        y1={cy}
        x2={hx}
        y2={hy}
        stroke="#1f2937"
        strokeWidth={9}
        strokeLinecap="round"
      />
      <line
        x1={cx}
        y1={cy}
        x2={mx}
        y2={my}
        stroke="#ef4444"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={7} fill="#f59e0b" />
    </svg>
  );
}

export function formatTime(hour: number, half: boolean) {
  return `${hour}:${half ? "30" : "00"}`;
}
