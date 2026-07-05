import React, { useState } from "react";
import { store } from "../../lib/store.js";
import { C, Card, SectionLabel } from "../../lib/ui.jsx";

/* ------------------------------------------------------------------
   Read module — ten pages a night. That's it, that's the module.
------------------------------------------------------------------- */

const STORAGE_KEY = "read.v1";
const DEFAULT_DATA = { book: "", goal: 10, log: {} };

const todayKey = () => new Date().toLocaleDateString("en-CA");

function load() {
  const saved = store.get(STORAGE_KEY);
  return saved ? { ...DEFAULT_DATA, ...saved } : { ...DEFAULT_DATA };
}

export default function ReadApp() {
  const [data, setData] = useState(load);
  const tk = todayKey();
  const goal = data.goal || 10;
  const log = data.log || {};
  const today = log[tk] || 0;
  const done = today >= goal;

  const update = (fn) =>
    setData((prev) => {
      const next = fn(prev);
      store.set(STORAGE_KEY, next);
      return next;
    });

  const addPages = (n) =>
    update((d) => {
      const lg = d.log || {};
      const cur = lg[tk] || 0;
      return { ...d, log: { ...lg, [tk]: Math.max(0, cur + n) } };
    });

  const setBook = (book) => update((d) => ({ ...d, book }));

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toLocaleDateString("en-CA");
    week.push({
      key: k,
      label: d.toLocaleDateString("en-GB", { weekday: "narrow" }),
      hit: (log[k] || 0) >= goal,
      some: (log[k] || 0) > 0,
      isToday: k === tk,
    });
  }

  const total = Object.values(log).reduce((s, n) => s + (Number(n) || 0), 0);
  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
            Read
          </div>
          <div className="body" style={{ fontSize: 13, color: C.faint }}>{dateStr}</div>
        </div>
        <div
          className="body tnum"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: done ? C.green : C.pine,
            background: done ? C.greenSoft : C.pineSoft,
            padding: "5px 10px",
            borderRadius: 999,
          }}
        >
          {today} / {goal}
        </div>
      </div>

      <SectionLabel>Tonight</SectionLabel>
      <Card style={{ textAlign: "center" }}>
        <input
          className="body"
          type="text"
          value={data.book}
          onChange={(e) => setBook(e.target.value)}
          placeholder="What are you reading?"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: `1.5px solid ${C.border}`,
            background: C.bg,
            color: C.ink,
            fontSize: 14.5,
            fontWeight: 600,
            textAlign: "center",
            outline: "none",
          }}
        />
        <div className="disp tnum" style={{ fontSize: 48, fontWeight: 700, color: done ? C.green : C.ink, lineHeight: 1, marginTop: 16 }}>
          {today}
          <span style={{ fontSize: 20, color: C.faint, fontWeight: 400 }}> / {goal}</span>
        </div>
        <div className="body" style={{ fontSize: 12.5, color: done ? C.green : C.faint, marginTop: 6, lineHeight: 1.5 }}>
          {done ? "Done for tonight — more is a bonus, not a new baseline." : "pages tonight"}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={() => addPages(-1)}
            className="disp"
            aria-label="Remove a page"
            style={{
              width: 56,
              padding: "14px 0",
              borderRadius: 12,
              border: `1.5px solid ${C.border}`,
              background: C.card,
              color: C.sub,
              fontSize: 20,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            −
          </button>
          <button
            onClick={() => addPages(1)}
            className="disp"
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: C.pine,
              color: "#fff",
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            +1 page
          </button>
          <button
            onClick={() => addPages(5)}
            className="disp"
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: C.pineSoft,
              color: C.pine,
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            +5 pages
          </button>
        </div>
      </Card>

      <SectionLabel>This week</SectionLabel>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {week.map((d) => (
            <div key={d.key} style={{ textAlign: "center", flex: 1 }}>
              <div className="body" style={{ fontSize: 11, fontWeight: 600, color: d.isToday ? C.pine : C.faint, marginBottom: 6 }}>
                {d.label}
              </div>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  margin: "0 auto",
                  background: d.hit ? C.pine : d.some ? C.amber : C.border,
                }}
              />
            </div>
          ))}
        </div>
        <div className="body" style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14, fontSize: 12, color: C.faint }}>
          <span className="tnum" style={{ fontWeight: 700, color: C.ink }}>{total}</span>
          <span>pages all time</span>
        </div>
      </Card>

      <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", margin: "18px 12px 4px", lineHeight: 1.5 }}>
        Ten pages at the same time every night beats a chapter whenever.
      </div>
    </div>
  );
}
