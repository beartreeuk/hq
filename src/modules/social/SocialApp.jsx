import React, { useState } from "react";
import { store } from "../../lib/store.js";
import { C, Card, SectionLabel } from "../../lib/ui.jsx";

/* ------------------------------------------------------------------
   Social module — graded exposure ladder for social anxiety.
   Repeat the current rung until it's boring, then move up.
   Reps at low stakes beat courage at high stakes.
------------------------------------------------------------------- */

const STORAGE_KEY = "social.v1";
const DEFAULT_DATA = { rung: 0, attempts: [] };
const WEEKLY_TARGET = 2;

const LADDER = [
  "Eye contact and a 'cheers' with a cashier or barista",
  "Ask a stranger something small — time, directions, 'is this seat free?'",
  "One exchange past the transaction (weather counts)",
  "At the climbing gym: ask someone for beta on a problem",
  "Give someone a genuine compliment",
  "Message an old friend and actually suggest meeting up",
  "A proper chat with someone new (gym, meetup, anywhere)",
  "Go to a meetup, class or club night alone",
  "Suggest a coffee / swapping numbers with someone you clicked with",
  "Ask someone out — or go on the date",
];

const clampRung = (r) =>
  Math.min(LADDER.length - 1, Math.max(0, Number.isFinite(r) ? Math.round(r) : 0));

function load() {
  const saved = store.get(STORAGE_KEY);
  const data = saved ? { ...DEFAULT_DATA, ...saved } : { ...DEFAULT_DATA };
  data.rung = clampRung(data.rung);
  data.attempts = Array.isArray(data.attempts) ? data.attempts : [];
  return data;
}

function relativeDay(ts) {
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(new Date(ts))) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function Slider({ label, value, onChange }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="body" style={{ fontSize: 13, fontWeight: 600, color: C.sub }}>{label}</div>
        <div className="disp tnum" style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>{value}</div>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", marginTop: 6, accentColor: C.pine, height: 28, cursor: "pointer" }}
      />
      <div className="body" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.faint }}>
        <span>calm</span>
        <span>panicked</span>
      </div>
    </div>
  );
}

export default function SocialApp() {
  const [data, setData] = useState(load);
  const [logging, setLogging] = useState(false);
  const [before, setBefore] = useState(5);
  const [after, setAfter] = useState(5);
  const [note, setNote] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [showHow, setShowHow] = useState(false);

  const update = (fn) =>
    setData((prev) => {
      const next = fn(prev);
      store.set(STORAGE_KEY, next);
      return next;
    });

  const rung = clampRung(data.rung);
  const attempts = data.attempts;

  const weekAgo = Date.now() - 7 * 86400000;
  const repsThisWeek = attempts.filter((a) => a && a.ts >= weekAgo).length;

  const atCurrent = attempts.filter((a) => a && a.rung === rung);
  const lastThree = atCurrent.slice(-3);
  const rungReady =
    lastThree.length === 3 && lastThree.every((a) => Number(a.after) <= 3) && rung < LADDER.length - 1;

  const setRung = (r) => update((d) => ({ ...d, rung: clampRung(r) }));

  const openLogging = () => {
    setBefore(5);
    setAfter(5);
    setNote("");
    setJustSaved(false);
    setLogging(true);
  };

  const saveRep = () => {
    update((d) => ({
      ...d,
      attempts: [
        ...(Array.isArray(d.attempts) ? d.attempts : []),
        { ts: Date.now(), rung, before, after, note: note.trim() },
      ],
    }));
    setLogging(false);
    setJustSaved(true);
  };

  const recent = attempts.slice(-5).reverse();

  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
            Social
          </div>
          <div className="body" style={{ fontSize: 13, color: C.faint }}>{dateStr}</div>
        </div>
        <div
          className="body tnum"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: repsThisWeek >= WEEKLY_TARGET ? C.green : C.pine,
            background: repsThisWeek >= WEEKLY_TARGET ? C.greenSoft : C.pineSoft,
            padding: "5px 10px",
            borderRadius: 999,
          }}
        >
          {repsThisWeek}/{WEEKLY_TARGET} this week
        </div>
      </div>

      <SectionLabel>The ladder</SectionLabel>
      <Card style={{ padding: 8 }}>
        {LADDER.map((text, i) => {
          const isCurrent = i === rung;
          const isAbove = i > rung;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: "10px 10px",
                borderRadius: 12,
                border: isCurrent ? `1.5px solid ${C.pine}` : "1.5px solid transparent",
                background: isCurrent ? C.pineSoft : "transparent",
                opacity: isAbove ? 0.45 : 1,
                marginTop: i === 0 ? 0 : 2,
              }}
            >
              <div
                className="disp tnum"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isCurrent ? C.pine : C.faint,
                  width: 18,
                  flexShrink: 0,
                  textAlign: "right",
                  paddingTop: 1,
                }}
              >
                {i + 1}
              </div>
              <div
                className="body"
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.4,
                  color: isCurrent ? C.ink : C.sub,
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {text}
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 8, margin: "10px 8px 6px" }}>
          <button
            onClick={() => setRung(rung - 1)}
            disabled={rung === 0}
            className="body"
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: `1.5px solid ${C.border}`,
              background: C.card,
              color: rung === 0 ? C.faint : C.sub,
              fontSize: 14,
              fontWeight: 600,
              cursor: rung === 0 ? "default" : "pointer",
            }}
          >
            ↓ Move down
          </button>
          <button
            onClick={() => setRung(rung + 1)}
            disabled={rung === LADDER.length - 1}
            className="body"
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: `1.5px solid ${C.pine}`,
              background: C.card,
              color: rung === LADDER.length - 1 ? C.faint : C.pine,
              fontSize: 14,
              fontWeight: 600,
              cursor: rung === LADDER.length - 1 ? "default" : "pointer",
            }}
          >
            ↑ Move up
          </button>
        </div>
        <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", margin: "2px 8px 6px", lineHeight: 1.5 }}>
          Moving down on a rough week is smart, not failure.
        </div>
      </Card>

      {rungReady && !logging && (
        <div className="body" style={{ fontSize: 12.5, color: C.pine, textAlign: "center", margin: "10px 12px 0", lineHeight: 1.5 }}>
          This rung looks ready — fancy the next one?
        </div>
      )}

      <SectionLabel>Log it</SectionLabel>
      {!logging ? (
        <>
          <button
            onClick={openLogging}
            className="disp"
            style={{
              width: "100%",
              padding: "16px 0",
              borderRadius: 14,
              border: "none",
              background: C.pine,
              color: "#fff",
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Did a rep
          </button>
          {justSaved && (
            <div className="body" style={{ fontSize: 12.5, color: C.pine, textAlign: "center", margin: "10px 12px 0", lineHeight: 1.5 }}>
              Rep banked. The after-number is the one that shrinks.
            </div>
          )}
        </>
      ) : (
        <Card>
          <div className="body" style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, lineHeight: 1.4 }}>
            {LADDER[rung]}
          </div>
          <Slider label="Anxiety before" value={before} onChange={setBefore} />
          <Slider label="Anxiety after" value={after} onChange={setAfter} />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="One line, if you fancy (optional)"
            maxLength={120}
            className="body"
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 14,
              padding: "12px 12px",
              borderRadius: 12,
              border: `1.5px solid ${C.border}`,
              background: C.card,
              color: C.ink,
              fontSize: 14,
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              onClick={() => setLogging(false)}
              className="body"
              style={{
                width: 96,
                padding: "13px 0",
                borderRadius: 12,
                border: `1.5px solid ${C.border}`,
                background: C.card,
                color: C.sub,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={saveRep}
              className="disp"
              style={{
                flex: 1,
                padding: "13px 0",
                borderRadius: 12,
                border: "none",
                background: C.pine,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Save rep
            </button>
          </div>
        </Card>
      )}

      {recent.length > 0 && (
        <>
          <SectionLabel>Recent reps</SectionLabel>
          <Card style={{ padding: 6 }}>
            {recent.map((a, idx) => (
              <div
                key={a.ts || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 10px",
                  borderTop: idx === 0 ? "none" : `1px solid ${C.border}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="body"
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: C.ink,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {LADDER[clampRung(a.rung)]}
                  </div>
                  <div className="body" style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>
                    {relativeDay(a.ts || 0)}
                    {a.note ? ` — ${a.note}` : ""}
                  </div>
                </div>
                <div className="disp tnum" style={{ fontSize: 15, fontWeight: 700, color: C.sub, flexShrink: 0 }}>
                  {Number(a.before) || 0}
                  <span style={{ color: C.faint, fontWeight: 400 }}> → </span>
                  <span style={{ color: Number(a.after) <= 3 ? C.green : C.ink }}>{Number(a.after) || 0}</span>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <SectionLabel>Guidance</SectionLabel>
      <Card style={{ padding: 0 }}>
        <button
          onClick={() => setShowHow((s) => !s)}
          className="body"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            padding: "14px 16px",
            background: "transparent",
            border: "none",
            color: C.ink,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          How this works
          <span style={{ color: C.faint, fontSize: 13 }}>{showHow ? "−" : "+"}</span>
        </button>
        {showHow && (
          <div className="body" style={{ padding: "0 16px 16px", fontSize: 13, color: C.sub, lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>
              Repeat the current rung until it's boring — anxiety consistently 3 or less — then move up.
              Boredom is the signal, not bravery.
            </p>
            <p style={{ margin: "10px 0 0" }}>
              Frequency beats intensity. Two small reps a week rewires more than one heroic push a month.
            </p>
            <p style={{ margin: "10px 0 0" }}>
              The goal is reps at low stakes, not courage at high stakes. The before-number can stay high
              for ages; watch the after-number instead.
            </p>
            <p style={{ margin: "12px 0 0", fontSize: 12, color: C.faint }}>
              Pairs well with actual CBT — NHS talking therapies takes self-referrals.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
