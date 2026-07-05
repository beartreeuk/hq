import React, { useState } from "react";
import { store } from "../../lib/store.js";
import { C, Card, SectionLabel } from "../../lib/ui.jsx";

/* ------------------------------------------------------------------
   Inbox module — zero-friction thought capture.
   Open app → type → done. Triage later, not now.
------------------------------------------------------------------- */

const STORAGE_KEY = "inbox.v1";
const DEFAULT_DATA = { items: [] };
const DAY_MS = 86400000;

function load() {
  const saved = store.get(STORAGE_KEY);
  return saved ? { ...DEFAULT_DATA, ...saved } : { ...DEFAULT_DATA };
}

const age = (ts) => {
  const m = (Date.now() - ts) / 60000;
  if (m < 1) return "now";
  if (m < 60) return `${Math.floor(m)}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
};

export default function InboxApp() {
  const [data, setData] = useState(load);
  const [text, setText] = useState("");
  const [showHandled, setShowHandled] = useState(false);

  const update = (fn) =>
    setData((prev) => {
      const next = fn(prev);
      store.set(STORAGE_KEY, next);
      return next;
    });

  const add = () => {
    const t = text.trim();
    if (!t) return;
    update((d) => ({
      ...d,
      items: [
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: t, ts: Date.now(), done: false },
        ...d.items,
      ],
    }));
    setText("");
  };

  const toggle = (id) =>
    update((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
    }));

  const clearHandled = () =>
    update((d) => ({ ...d, items: d.items.filter((i) => !i.done) }));

  const open = data.items.filter((i) => !i.done);
  const handled = data.items.filter((i) => i.done);
  const stale = open.filter((i) => Date.now() - i.ts > DAY_MS).length;

  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
            Inbox
          </div>
          <div className="body" style={{ fontSize: 13, color: C.faint }}>{dateStr}</div>
        </div>
        <div
          className="body"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: open.length ? C.pine : C.faint,
            background: open.length ? C.pineSoft : C.card,
            border: open.length ? "none" : `1px solid ${C.border}`,
            padding: "5px 10px",
            borderRadius: 999,
          }}
        >
          {open.length} open
        </div>
      </div>

      <SectionLabel>Capture</SectionLabel>
      <Card>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Get it out of your head…"
          rows={2}
          className="body"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            fontSize: 15,
            resize: "none",
            color: C.ink,
            background: C.bg,
          }}
        />
        <button
          onClick={add}
          disabled={!text.trim()}
          className="body"
          style={{
            width: "100%",
            marginTop: 8,
            padding: "12px 0",
            borderRadius: 12,
            border: "none",
            background: text.trim() ? C.pine : C.border,
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: text.trim() ? "pointer" : "default",
          }}
        >
          Capture
        </button>
      </Card>

      {stale > 0 && (
        <div
          className="body"
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 12,
            background: C.amberSoft,
            color: C.amber,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.45,
          }}
        >
          {stale} thought{stale === 1 ? " has" : "s have"} been sitting for over a day — take two minutes: act on it, move it somewhere real, or bin it.
        </div>
      )}

      <SectionLabel>Open · {open.length}</SectionLabel>
      <Card style={{ padding: open.length ? 6 : 16 }}>
        {open.length === 0 ? (
          <div className="body" style={{ fontSize: 13.5, color: C.faint, textAlign: "center", padding: "8px 0" }}>
            Empty inbox. Nice.
          </div>
        ) : (
          open.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 10px",
                borderTop: idx === 0 ? "none" : `1px solid ${C.border}`,
              }}
            >
              <button
                onClick={() => toggle(item.id)}
                aria-label="Mark handled"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 9,
                  flexShrink: 0,
                  padding: 0,
                  border: `2px solid ${C.border}`,
                  background: "transparent",
                  cursor: "pointer",
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="body" style={{ fontSize: 15, color: C.ink, lineHeight: 1.45, overflowWrap: "break-word" }}>
                  {item.text}
                </div>
                <div className="body" style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>
                  {age(item.ts)}
                </div>
              </div>
            </div>
          ))
        )}
      </Card>

      {handled.length > 0 && (
        <>
          <SectionLabel>
            <button
              onClick={() => setShowHandled(!showHandled)}
              className="body"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.faint,
                cursor: "pointer",
              }}
            >
              Handled · {handled.length} {showHandled ? "▾" : "▸"}
            </button>
          </SectionLabel>
          {showHandled && (
            <Card style={{ padding: 6 }}>
              {handled.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 10px",
                    borderTop: idx === 0 ? "none" : `1px solid ${C.border}`,
                  }}
                >
                  <button
                    onClick={() => toggle(item.id)}
                    aria-label="Reopen"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 9,
                      flexShrink: 0,
                      padding: 0,
                      border: `2px solid ${C.pine}`,
                      background: C.pine,
                      color: "#fff",
                      fontSize: 15,
                      cursor: "pointer",
                    }}
                  >
                    ✓
                  </button>
                  <div
                    className="body"
                    style={{ fontSize: 15, color: C.faint, lineHeight: 1.45, textDecoration: "line-through", overflowWrap: "break-word", minWidth: 0, flex: 1, paddingTop: 2 }}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
              <button
                onClick={clearHandled}
                className="body"
                style={{
                  width: "100%",
                  margin: "6px 0 4px",
                  padding: "10px 0",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  background: C.card,
                  color: C.sub,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear handled
              </button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
