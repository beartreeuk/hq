import React, { useState } from "react";
import { store } from "../../lib/store.js";
import { C, Card, SectionLabel } from "../../lib/ui.jsx";

/* ------------------------------------------------------------------
   Projects module — big scary life admin, defanged.
   A project is just its next action. One action per project, ever.
------------------------------------------------------------------- */

const STORAGE_KEY = "projects.v1";

export const DEFAULT_DATA = {
  projects: [
    {
      id: "drive",
      title: "Learn to drive",
      why: "Freedom. 28 is a fine age to do it.",
      next: "Apply for provisional licence on GOV.UK (15 min)",
      parked: false,
      done: [],
    },
    {
      id: "bike",
      title: "Buy a bike",
      why: "Cycling is allowed in physio Phase 1 — this is exercise, transport and mood in one purchase.",
      next: "Set a budget and shortlist 3 upright hybrids on Marketplace",
      parked: false,
      done: [],
    },
  ],
};

function normaliseProject(p) {
  return {
    id: p.id || String(Date.now() + Math.random()),
    title: p.title || "Untitled project",
    why: p.why || "",
    next: typeof p.next === "string" ? p.next : "",
    parked: !!p.parked,
    done: Array.isArray(p.done) ? p.done : [],
  };
}

function load() {
  const saved = store.get(STORAGE_KEY);
  if (!saved) store.set(STORAGE_KEY, DEFAULT_DATA);
  const data = saved ? { ...DEFAULT_DATA, ...saved } : { ...DEFAULT_DATA };
  data.projects = Array.isArray(data.projects)
    ? data.projects.map(normaliseProject)
    : DEFAULT_DATA.projects;
  return data;
}

const fmtWhen = (ts) => {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 12px",
  borderRadius: 12,
  border: `1.5px solid ${C.border}`,
  background: C.card,
  color: C.ink,
  fontSize: 15,
  outline: "none",
};

export default function ProjectsApp() {
  const [data, setData] = useState(load);
  const [drafts, setDrafts] = useState({}); // id -> draft next-action text
  const [historyOpen, setHistoryOpen] = useState({}); // id -> bool
  const [newTitle, setNewTitle] = useState("");
  const [newWhy, setNewWhy] = useState("");
  const [newNext, setNewNext] = useState("");

  const update = (fn) =>
    setData((prev) => {
      const next = fn(prev);
      store.set(STORAGE_KEY, next);
      return next;
    });

  const patchProject = (id, fn) =>
    update((d) => ({
      ...d,
      projects: d.projects.map((p) => (p.id === id ? fn(p) : p)),
    }));

  const tickDone = (p) => {
    if (!p.next) return;
    patchProject(p.id, (prev) => ({
      ...prev,
      done: [...prev.done, { text: prev.next, ts: Date.now() }],
      next: "",
    }));
    setDrafts((s) => ({ ...s, [p.id]: "" }));
  };

  const saveNext = (id) => {
    const text = (drafts[id] || "").trim();
    if (!text) return;
    patchProject(id, (prev) => ({ ...prev, next: text }));
    setDrafts((s) => ({ ...s, [id]: "" }));
  };

  const togglePark = (id) =>
    patchProject(id, (prev) => ({ ...prev, parked: !prev.parked }));

  const addProject = () => {
    const title = newTitle.trim();
    const next = newNext.trim();
    if (!title || !next) return;
    const proj = {
      id: "p" + Date.now(),
      title,
      why: newWhy.trim(),
      next,
      parked: false,
      done: [],
    };
    update((d) => ({ ...d, projects: [...d.projects, proj] }));
    setNewTitle("");
    setNewWhy("");
    setNewNext("");
  };

  const live = data.projects.filter((p) => !p.parked);
  const parked = data.projects.filter((p) => p.parked);
  const readyCount = live.filter((p) => p.next).length;

  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
            Projects
          </div>
          <div className="body" style={{ fontSize: 13, color: C.faint }}>{dateStr}</div>
        </div>
        <div
          className="body tnum"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.pine,
            background: C.pineSoft,
            padding: "5px 10px",
            borderRadius: 999,
          }}
        >
          {readyCount} ready
        </div>
      </div>

      <div className="body" style={{ fontSize: 12.5, color: C.sub, margin: "10px 4px 0", lineHeight: 1.5 }}>
        A project is just its next action.
      </div>

      <SectionLabel>Live</SectionLabel>
      {live.length === 0 && (
        <Card>
          <div className="body" style={{ fontSize: 13.5, color: C.faint }}>
            Nothing live right now. That's fine — add one below when you're ready.
          </div>
        </Card>
      )}
      {live.map((p) => {
        const needsNext = !p.next;
        const histOpen = !!historyOpen[p.id];
        return (
          <Card
            key={p.id}
            style={{
              marginBottom: 10,
              border: `1px solid ${needsNext ? C.amber : C.border}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div className="disp" style={{ fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>
                  {p.title}
                </div>
                {p.why && (
                  <div className="body" style={{ fontSize: 12, color: C.faint, marginTop: 2, lineHeight: 1.45 }}>
                    {p.why}
                  </div>
                )}
              </div>
              <button
                onClick={() => togglePark(p.id)}
                className="body"
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${C.border}`,
                  background: C.card,
                  color: C.sub,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Park
              </button>
            </div>

            {needsNext ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: C.amberSoft,
                }}
              >
                <div className="body" style={{ fontSize: 12, fontWeight: 600, color: C.amber, marginBottom: 8 }}>
                  Needs a next action — no rush.
                </div>
                <input
                  className="body"
                  value={drafts[p.id] || ""}
                  onChange={(e) => setDrafts((s) => ({ ...s, [p.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveNext(p.id);
                  }}
                  placeholder="What's the new next action?"
                  style={{ ...inputStyle, border: `1.5px solid ${C.amber}`, background: C.card }}
                />
                <button
                  onClick={() => saveNext(p.id)}
                  className="disp"
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: "12px 0",
                    borderRadius: 12,
                    border: "none",
                    background: (drafts[p.id] || "").trim() ? C.pine : C.border,
                    color: "#fff",
                    fontSize: 14.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Save next action
                </button>
              </div>
            ) : (
              <button
                onClick={() => tickDone(p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  textAlign: "left",
                  marginTop: 12,
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: `1.5px solid ${C.border}`,
                  background: C.bg,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 9,
                    flexShrink: 0,
                    border: `2px solid ${C.pine}`,
                    background: "transparent",
                    color: C.pine,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                  }}
                >
                  ✓
                </div>
                <div className="body" style={{ fontSize: 15, fontWeight: 600, color: C.ink, lineHeight: 1.4 }}>
                  {p.next}
                </div>
              </button>
            )}

            {p.done.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => setHistoryOpen((s) => ({ ...s, [p.id]: !s[p.id] }))}
                  className="body"
                  style={{
                    padding: "8px 4px",
                    border: "none",
                    background: "transparent",
                    color: C.faint,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  history · {p.done.length} {histOpen ? "▴" : "▾"}
                </button>
                {histOpen && (
                  <div style={{ borderTop: `1px solid ${C.border}` }}>
                    {[...p.done].reverse().map((d, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "8px 4px",
                          borderBottom: i === p.done.length - 1 ? "none" : `1px solid ${C.border}`,
                        }}
                      >
                        <div className="body" style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.4 }}>
                          {d.text}
                        </div>
                        <div className="body tnum" style={{ fontSize: 11.5, color: C.faint, flexShrink: 0 }}>
                          {d.ts ? fmtWhen(d.ts) : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {parked.length > 0 && (
        <>
          <SectionLabel>Parked</SectionLabel>
          {parked.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                marginBottom: 8,
                borderRadius: 12,
                border: `1px dashed ${C.border}`,
                background: "transparent",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="body" style={{ fontSize: 13.5, fontWeight: 600, color: C.faint }}>
                  {p.title}
                </span>
                <span className="body" style={{ fontSize: 12, color: C.faint }}>
                  {" "}— Parked — that's allowed
                </span>
              </div>
              <button
                onClick={() => togglePark(p.id)}
                className="body"
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: C.pineSoft,
                  color: C.pine,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Unpark
              </button>
            </div>
          ))}
        </>
      )}

      <SectionLabel>Add a project</SectionLabel>
      <Card>
        <input
          className="body"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Title — e.g. Sort out the flat"
          style={inputStyle}
        />
        <input
          className="body"
          value={newWhy}
          onChange={(e) => setNewWhy(e.target.value)}
          placeholder="Why it matters (optional)"
          style={{ ...inputStyle, marginTop: 8 }}
        />
        <input
          className="body"
          value={newNext}
          onChange={(e) => setNewNext(e.target.value)}
          placeholder="First next action — small is good"
          style={{ ...inputStyle, marginTop: 8 }}
        />
        <button
          onClick={addProject}
          className="disp"
          style={{
            width: "100%",
            marginTop: 10,
            padding: "13px 0",
            borderRadius: 12,
            border: "none",
            background: newTitle.trim() && newNext.trim() ? C.pine : C.border,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Add project
        </button>
      </Card>

      <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", margin: "18px 12px 4px", lineHeight: 1.5 }}>
        One live project at a time is plenty. Park the rest without guilt.
      </div>
    </div>
  );
}
