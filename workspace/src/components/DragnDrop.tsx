import {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";

interface DragPieceProps {
  children: ReactNode;
  /** 拖拽数据标识 */
  payload: string;
  disabled?: boolean;
  locked?: boolean;
  onDragEnd?: (overSlot: string | null) => void;
  className?: string;
}

/**
 * 基于原生 pointer events 的拖拽块。
 * 放置时用 elementFromPoint 命中 [data-drop-slot]；
 * 未命中或不匹配时由父组件决定回弹（播放 bounce-back 动画）。
 */
export function DragPiece({
  children,
  payload,
  disabled,
  locked,
  onDragEnd,
  className = "",
}: DragPieceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [bounce, setBounce] = useState(false);
  const start = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const moved = useRef(false);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (disabled || locked) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const r = ref.current!.getBoundingClientRect();
    start.current = { x: e.clientX, y: e.clientY, elX: r.left, elY: r.top };
    moved.current = false;
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (disabled || locked) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (!dragging) {
      if (Math.hypot(dx, dy) < 6) return;
      setDragging(true);
    }
    moved.current = true;
    setPos({ x: start.current.elX + dx, y: start.current.elY + dy });
  };

  const finish = useCallback(
    (e: ReactPointerEvent) => {
      if (!dragging) return;
      // 先隐藏拖拽块再命中检测，避免挡到下方槽位
      ref.current!.style.visibility = "hidden";
      const under = document.elementFromPoint(e.clientX, e.clientY);
      ref.current!.style.visibility = "";
      const slot = under
        ?.closest("[data-drop-slot]")
        ?.getAttribute("data-drop-slot") ?? null;
      setDragging(false);
      setPos(null);
      if (!slot) {
        setBounce(true);
        window.setTimeout(() => setBounce(false), 320);
      }
      onDragEnd?.(slot);
    },
    [dragging, onDragEnd]
  );

  const style: React.CSSProperties = dragging
    ? {
        position: "fixed",
        left: pos!.x,
        top: pos!.y,
        width: ref.current?.offsetWidth ?? 100,
        height: ref.current?.offsetHeight ?? 100,
        margin: 0,
      }
    : {};

  return (
    <div
      ref={ref}
      data-drag-payload={payload}
      className={`drag-piece ${dragging ? "dragging" : ""} ${
        locked ? "locked" : ""
      } ${bounce ? "bounce-back" : ""} ${className}`}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      {children}
    </div>
  );
}

interface DropSlotProps {
  id: string;
  children?: ReactNode;
  filled?: boolean;
  hot?: boolean;
  className?: string;
}

export function DropSlot({ id, children, filled, hot, className = "" }: DropSlotProps) {
  return (
    <div
      data-drop-slot={id}
      className={`slot ${filled ? "filled" : ""} ${hot ? "target-hot" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
