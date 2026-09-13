export type ShapeKind = "circle" | "square" | "triangle" | "star" | "heart" | "diamond";

export const SHAPE_KINDS: ShapeKind[] = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
  "diamond",
];

export const SHAPE_NAMES: Record<ShapeKind, string> = {
  circle: "圆形",
  square: "正方形",
  triangle: "三角形",
  star: "星形",
  heart: "心形",
  diamond: "菱形",
};

export const SHAPE_COLORS: { id: string; value: string; name: string }[] = [
  { id: "red", value: "#ef4444", name: "红色" },
  { id: "blue", value: "#3b82f6", name: "蓝色" },
  { id: "yellow", value: "#facc15", name: "黄色" },
  { id: "green", value: "#22c55e", name: "绿色" },
  { id: "purple", value: "#a855f7", name: "紫色" },
];

function pathFor(kind: ShapeKind): string {
  switch (kind) {
    case "circle":
      return "";
    case "square":
      return "";
    case "triangle":
      return "M50 12 L88 82 L12 82 Z";
    case "star":
      return "M50 8 L61 38 L93 38 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 L39 38 Z";
    case "heart":
      return "M50 86 C20 64 10 46 10 32 C10 18 21 10 33 10 C41 10 47 15 50 22 C53 15 59 10 67 10 C79 10 90 18 90 32 C90 46 80 64 50 86 Z";
    case "diamond":
      return "M50 8 L90 50 L50 92 L10 50 Z";
  }
}

export function ShapeSvg({
  kind,
  color,
  faded = false,
  size = 74,
}: {
  kind: ShapeKind;
  color: string;
  faded?: boolean;
  size?: number;
}) {
  const fill = faded ? "#e2e8f0" : color;
  const stroke = faded ? "#cbd5e1" : "rgba(0,0,0,0.18)";
  const common = {
    fill,
    stroke,
    strokeWidth: 3,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      className="shape-svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden
    >
      {kind === "circle" && <circle cx={50} cy={50} r={40} {...common} />}
      {kind === "square" && (
        <rect x={12} y={12} width={76} height={76} rx={14} {...common} />
      )}
      {kind !== "circle" && kind !== "square" && (
        <path d={pathFor(kind)} {...common} />
      )}
    </svg>
  );
}
