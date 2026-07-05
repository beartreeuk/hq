import React, { useState, useEffect, useRef } from "react";
import { store } from "../../lib/store.js";
import { C, Card, SectionLabel } from "../../lib/ui.jsx";

/* ------------------------------------------------------------------
   Home module — keeping the space liveable.
   One ten-minute task a day, picked for you. Room Rescue for bad days.
   Rented room + share of communal areas. No rotas, no shame.
------------------------------------------------------------------- */

const STORAGE_KEY = "home.v1";
const DEFAULT_DATA = { history: {}, rescues: [] };

const TASKS = [
  "Clear the desk surface completely",
  "Everything fabric off the floor — basket or wardrobe",
  "Cup-and-plate amnesty: everything to the kitchen, wash yours",
  "Bin run: room bin + any rubbish in reach",
  "Make or strip the bed properly",
  "Pick ONE doom pile and sort or bin it",
  "Wash up your stuff + wipe one kitchen counter",
  "Your bathroom shelf + sink wipe",
  "One laundry load on OR put the clean mountain away",
  "Ten-minute entropy sweep: return ten things to their homes",
];

/* Deterministic daily pick — stable hash of the date key, no stored pointer. */
export function todaysHomeTask(dateKey) {
  let sum = 0;
  for (let i = 0; i < dateKey.length; i++) sum += dateKey.charCodeAt(i);
  return TASKS[sum % TASKS.length];
}

const ROUND_SECONDS = 600; // ten minutes

const RESCUE_ROUNDS = [
  { n: 1, title: "Rubbish only", hint: "Bin bag in hand. Nothing else exists yet." },
  { n: 2, title: "Dishes and clothes only", hint: "Dishes to the kitchen, clothes to basket or wardrobe." },
  { n: 3, title: "Surfaces and reset", hint: "Wipe what shows, put things roughly back." },
];

const todayKey = () => new Date().toLocaleDateString("en-CA");

function load() {
  const saved = store.get(STORAGE_KEY) || {};
  return {
    ...DEFAULT_DATA,
    ...saved,
    history: saved.history && typeof saved.history === "object" ? saved.history : {},
    rescues: Array.isArray(saved.rescues) ? saved.rescues : [],
  };
}

const fmt = (s) => {
  const clamped = Math.max(0, Math.ceil(s));
  const m = Math.floor(clamped / 60);
  const sec = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

/* Ten-minute countdown. Interval against a Date.now() start ref, so a
   throttled background tab can't lose time. Remount (via key) to reset. */
function Countdown({ onFinish }) {
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(ROUND_SECONDS);
  const startRef = useRef(null);
  const bankedRef = useRef(ROUND_SECONDS); // seconds left when last paused
  const doneRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = bankedRef.current - (Date.now() - startRef.current) / 1000;
      if (left <= 0) {
        clearInterval(id);
        setRemaining(0);
        setRunning(false);
        if (!doneRef.current) {
          doneRef.current = true;
          if (onFinish) onFinish();
        }
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, onFinish]);

  const toggle = () => {
    if (running) {
      bankedRef.current = remaining;
      setRunning(false);
    } else {
      if (remaining <= 0) {
        bankedRef.current = ROUND_SECONDS;
        setRemaining(ROUND_SECONDS);
        doneRef.current = false;
      } else {
        bankedRef.current = remaining;
      }
      startRef.current = Date.now();
      setRunning(true);
    }
  };

  const finished = remaining <= 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
      <div
        className="disp tnum"
        style={{
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1,
          color: finished ? C.green : running ? C.pine : C.ink,
          minWidth: 118,
        }}
      >
        {fmt(remaining)}
      </div>
      <button
        onClick={toggle}
        className="disp"
        style={{
          flex: 1,
          padding: "14px 0",
          borderRadius: 12,
          border: running ? `1.5px solid ${C.border}` : "none",
          background: running ? C.card : C.pine,
          color: running ? C.sub : "#fff",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {finished ? "Go again" : running ? "Pause" : "Start 10:00"}
      </button>
    </div>
  );
}

export default function HomeApp() {
  const [data, setData] = useState(load);

  /* Room Rescue local state */
  const [rescueRound, setRescueRound] = useState(0); // 0 = not running, 1–3 = active round
  const [rescueDone, setRescueDone] = useState(0); // rounds completed this rescue
  const [rescueSummary, setRescueSummary] = useState(null); // rounds logged, or 0 if quit early

  const tk = todayKey();
  const task = todaysHomeTask(tk);
  const doneToday = !!(data.history[tk] && data.history[tk].done);

  const update = (fn) =>
    setData((prev) => {
      const next = fn(prev);
      store.set(STORAGE_KEY, next);
      return next;
    });

  const markDone = () =>
    update((d) => ({ ...d, history: { ...d.history, [tk]: { task, done: true } } }));

  const startRescue = () => {
    setRescueRound(1);
    setRescueDone(0);
    setRescueSummary(null);
  };

  const finishRound = () => {
    const done = rescueDone + 1;
    if (done >= 3) {
      update((d) => ({ ...d, rescues: [...d.rescues, { date: tk, rounds: 3 }] }));
      setRescueRound(0);
      setRescueDone(0);
      setRescueSummary(3);
    } else {
      setRescueDone(done);
      setRescueRound(done + 1);
    }
  };

  const stopRescue = () => {
    if (rescueDone >= 1) {
      update((d) => ({ ...d, rescues: [...d.rescues, { date: tk, rounds: rescueDone }] }));
    }
    setRescueSummary(rescueDone);
    setRescueRound(0);
    setRescueDone(0);
  };

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toLocaleDateString("en-CA");
    week.push({
      key: k,
      label: d.toLocaleDateString("en-GB", { weekday: "narrow" }),
      done: !!(data.history[k] && data.history[k].done),
      isToday: k === tk,
    });
  }

  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const round = rescueRound > 0 ? RESCUE_ROUNDS[rescueRound - 1] : null;

  const summaryLine =
    rescueSummary === 3
      ? "Three rounds done. That was a full rescue — the room is meaningfully better, and you did it on a bad day."
      : rescueSummary === 2
        ? "Two rounds logged. Rubbish gone, dishes and clothes handled. That counts."
        : rescueSummary === 1
          ? "One round logged. The rubbish is out — that alone changes the room. Good stop."
          : "No rounds this time — that's fine. The option stays open.";

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
            Home
          </div>
          <div className="body" style={{ fontSize: 13, color: C.faint }}>{dateStr}</div>
        </div>
        <div
          className="body"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: doneToday ? C.green : C.pine,
            background: doneToday ? C.greenSoft : C.pineSoft,
            padding: "5px 10px",
            borderRadius: 999,
          }}
        >
          {doneToday ? "✓ Done today" : "10 minutes"}
        </div>
      </div>

      <SectionLabel>Today's ten</SectionLabel>
      <Card>
        <div className="disp" style={{ fontSize: 20, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>
          {task}
        </div>
        {doneToday ? (
          <div
            className="body"
            style={{
              marginTop: 14,
              padding: "14px 0",
              borderRadius: 12,
              background: C.greenSoft,
              color: C.green,
              fontSize: 15,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            ✓ Done. That's the house handled for today.
          </div>
        ) : (
          <>
            <Countdown key={tk} />
            <button
              onClick={markDone}
              className="disp"
              style={{
                width: "100%",
                marginTop: 10,
                padding: "16px 0",
                borderRadius: 12,
                border: "none",
                background: C.green,
                color: "#fff",
                fontSize: 17,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✓ Done
            </button>
          </>
        )}
      </Card>
      <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", margin: "10px 12px 0", lineHeight: 1.5 }}>
        Ten minutes. When the timer ends you're allowed to stop — that's the deal.
      </div>

      <SectionLabel>Last 7 days</SectionLabel>
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
                  background: d.done ? C.pine : C.border,
                }}
              />
            </div>
          ))}
        </div>
        <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 12 }}>
          An empty dot is just an empty dot.
        </div>
      </Card>

      <SectionLabel>Room rescue</SectionLabel>
      <Card>
        {rescueRound === 0 ? (
          <>
            <div className="body" style={{ fontSize: 14, color: C.sub, lineHeight: 1.5 }}>
              For the days it's got away from you. You're not cleaning the room. You're doing three rounds of ten.
            </div>
            {rescueSummary != null && (
              <div
                className="body"
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: C.greenSoft,
                  color: C.green,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                }}
              >
                {summaryLine}
              </div>
            )}
            <button
              onClick={startRescue}
              className="disp"
              style={{
                width: "100%",
                marginTop: 14,
                padding: "15px 0",
                borderRadius: 12,
                border: "none",
                background: C.amber,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Start a rescue
            </button>
            <div className="body tnum" style={{ fontSize: 12, color: C.faint, textAlign: "center", marginTop: 10 }}>
              {data.rescues.length === 0
                ? "No rescues yet — hopefully never needed."
                : `${data.rescues.length} past rescue${data.rescues.length === 1 ? "" : "s"} on record.`}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {RESCUE_ROUNDS.map((r) => (
                <div
                  key={r.n}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    background: r.n <= rescueDone ? C.green : r.n === rescueRound ? C.amber : C.border,
                  }}
                />
              ))}
            </div>
            <div className="body" style={{ fontSize: 12, fontWeight: 600, color: C.amber, letterSpacing: "0.04em" }}>
              ROUND {round.n} OF 3
            </div>
            <div className="disp" style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginTop: 4 }}>
              {round.title}
            </div>
            <div className="body" style={{ fontSize: 13.5, color: C.sub, marginTop: 4, lineHeight: 1.5 }}>
              {round.hint}
            </div>
            <Countdown key={`rescue-${rescueRound}`} />
            <button
              onClick={finishRound}
              className="disp"
              style={{
                width: "100%",
                marginTop: 10,
                padding: "15px 0",
                borderRadius: 12,
                border: "none",
                background: C.green,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {rescueRound === 3 ? "✓ Finish rescue" : `✓ Round ${rescueRound} done`}
            </button>
            <button
              onClick={stopRescue}
              className="body"
              style={{
                width: "100%",
                marginTop: 8,
                padding: "12px 0",
                borderRadius: 12,
                border: `1.5px solid ${C.border}`,
                background: C.card,
                color: C.sub,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Stop here
            </button>
          </>
        )}
      </Card>
      <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", margin: "10px 12px 0", lineHeight: 1.5 }}>
        Stopping after one round still counts. It went in the book.
      </div>
    </div>
  );
}
