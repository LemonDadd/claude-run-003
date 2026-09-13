import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { GAMES, WIP_GAMES } from "../lib/gameConfig";
import type { DailyReportRow, Profile } from "../types";

/** 家长面板中的「今日报告」卡片：按孩子汇总今天数据，可导出 Markdown */
export default function DailyReport({ profiles }: { profiles: Profile[] }) {
  const [selectedId, setSelectedId] = useState<number>(profiles[0]?.id ?? 0);
  const [rows, setRows] = useState<DailyReportRow[]>([]);
  const [usedSeconds, setUsedSeconds] = useState(0);
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profiles.some((p) => p.id === selectedId)) {
      setSelectedId(profiles[0]?.id ?? 0);
    }
  }, [profiles, selectedId]);

  const load = useCallback(async () => {
    if (!selectedId) {
      setRows([]);
      return;
    }
    const [report, used] = await Promise.all([
      api.getDailyReport(selectedId),
      api.getTodayUsage(selectedId),
    ]);
    setRows(report);
    setUsedSeconds(used);
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const meta = new Map(
    [...GAMES, ...WIP_GAMES].map((g) => [g.type, { name: g.name, emoji: g.emoji }])
  );

  const totalRounds = rows.reduce((s, r) => s + r.rounds, 0);
  const totalCorrect = rows.reduce((s, r) => s + r.correct, 0);
  const totalQuestions = rows.reduce((s, r) => s + r.total, 0);
  const totalStars = rows.reduce((s, r) => s + r.stars, 0);
  const acc = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);

  const doExport = async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    setExportMsg(null);
    try {
      const path = await api.exportDailyReport(selectedId);
      setExportMsg({ ok: true, text: `已导出：${path}` });
    } catch (e) {
      setExportMsg({ ok: false, text: `导出失败：${String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ gridColumn: "1 / -1" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <h3 className="section-title" style={{ margin: 0 }}>
          📋 今日报告（{today}）
        </h3>
        <div className="spacer" />
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          style={{
            minHeight: 48,
            fontSize: 20,
            borderRadius: 14,
            border: "3px solid #cbd5e1",
            padding: "4px 12px",
            fontFamily: "inherit",
          }}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname}
            </option>
          ))}
        </select>
        <button className="btn blue" disabled={!selectedId || busy} onClick={() => void doExport()}>
          {busy ? "导出中…" : "📤 导出 Markdown"}
        </button>
      </div>

      {totalRounds === 0 ? (
        <p className="hint">今天还没有游戏记录。</p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <SummaryPill label="回合" value={String(totalRounds)} bg="#e0f2fe" />
            <SummaryPill label="正确率" value={`${acc}%`} bg="#dcfce7" />
            <SummaryPill label="答对题数" value={`${totalCorrect}/${totalQuestions}`} bg="#fef3c7" />
            <SummaryPill label="获得星星" value={`⭐ ${totalStars}`} bg="#fce7f3" />
            <SummaryPill
              label="今日时长"
              value={`${Math.floor(usedSeconds / 60)}分${usedSeconds % 60}秒`}
              bg="#f1f5f9"
            />
          </div>
          <table className="stat-table">
            <thead>
              <tr>
                <th>游戏</th>
                <th>回合数</th>
                <th>答对题数</th>
                <th>正确率</th>
                <th>获得星星</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const g = meta.get(r.game_type);
                const a = r.total ? Math.round((r.correct / r.total) * 100) : 0;
                return (
                  <tr key={r.game_type}>
                    <td>
                      {g?.emoji ?? "🎮"} {g?.name ?? r.game_type}
                    </td>
                    <td>{r.rounds}</td>
                    <td>
                      {r.correct} / {r.total}
                    </td>
                    <td>{a}%</td>
                    <td>⭐ {r.stars}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {exportMsg && (
        <div
          className="hint"
          style={{
            marginTop: 10,
            color: exportMsg.ok ? "#15803d" : "#b91c1c",
            wordBreak: "break-all",
          }}
        >
          {exportMsg.text}
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, value, bg }: { label: string; value: string; bg: string }) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 18,
        padding: "8px 18px",
        textAlign: "center",
        minWidth: 110,
      }}
    >
      <div className="hint" style={{ margin: 0 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900 }}>{value}</div>
    </div>
  );
}
