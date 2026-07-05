import React, { useState, useEffect, useRef, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { store } from "../../lib/store.js";
import { C, Card, SectionLabel } from "../../lib/ui.jsx";

/* ------------------------------------------------------------------
   Physio module — nTOS conservative programme tracker
------------------------------------------------------------------- */

const STORAGE_KEY = "physio.v1";

const STATUS = {
  green: { label: "Green", hint: "No neuro symptoms — full dose", color: C.green, soft: C.greenSoft },
  amber: { label: "Amber", hint: "Tingles that cleared — glides parked, shorter holds", color: C.amber, soft: C.amberSoft },
  red:   { label: "Red",   hint: "Numbness lasting hours or new weakness — breathing only", color: C.red, soft: C.redSoft },
};

const ITEMS = [
  {
    id: "breath",
    name: "Crocodile breathing",
    dose: "3–5 min · 4 in / 6 out",
    tiers: ["green", "amber", "red"],
    how: [
      "Lie face down, forehead resting on stacked hands (or a cushion if the arm position tingles).",
      "Breathe in through the nose for 4s — belly and lower back rise, chest and neck stay quiet.",
      "Out slow for 6s. Small, lazy breaths — the Breathe tab paces this for you.",
    ],
    caution: "Fizzy or lightheaded means you're over-breathing — make the breaths smaller, not bigger.",
  },
  {
    id: "nods",
    name: "Chin nods",
    dose: "10 × 10s hold",
    tiers: ["green", "amber"],
    how: [
      "Lie on your back, knees bent.",
      "Gently nod as if saying a small \"yes\", lengthening the back of the neck.",
      "Hold 10s, relax, repeat ×10.",
    ],
    caution: "No lifting the head, no gripping at the front of the throat — it should feel almost effortless.",
  },
  {
    id: "scalene",
    name: "Scalene stretch",
    dose: "3 × 30s per side",
    amberDose: "3 × 20s per side",
    tiers: ["green", "amber"],
    how: [
      "Sit tall. Hook your fingers over the collarbone on the side you're stretching, to anchor it down.",
      "Tilt the opposite ear toward the opposite shoulder until a gentle stretch in the side of the neck.",
      "To bias the anterior scalene, add a slight upward gaze. Hold, breathe, swap sides.",
    ],
    caution: "Stretch feeling in the neck only — any arm tingling means back off the range.",
  },
  {
    id: "pec",
    name: "Pec minor doorway",
    dose: "3 × 30s per side",
    amberDose: "3 × 20s per side",
    tiers: ["green", "amber"],
    how: [
      "Forearm on the doorframe with the elbow slightly below shoulder height — high angles compress the outlet.",
      "Step gently through the doorway until a stretch across the front of the shoulder and chest.",
      "Hold, breathe easy, swap sides.",
    ],
    caution: "Gentle stretch, not a hang. Arm symptoms = less step-through.",
  },
  {
    id: "rib",
    name: "First rib mobilisation",
    dose: "8–10 breaths per side",
    tiers: ["green", "amber"],
    how: [
      "Sling a towel over the top of the shoulder, close to the neck — one end in front, one behind.",
      "Pull both ends down toward the opposite hip.",
      "Exhale fully while tilting your head away; keep the downward pull on during the exhale, ease off on the inhale.",
    ],
    caution: "You're coaxing the rib down, not cranking it — gentle pressure is the dose.",
  },
  {
    id: "glide",
    name: "Ulnar nerve slider",
    dose: "3–5 reps · micro, half range",
    tiers: ["green"],
    how: [
      "Left arm out to the side about 45°, elbow bent, palm toward your face.",
      "Straighten the elbow away from you while tilting your head toward the left shoulder.",
      "Return the arm as the head comes back upright — one end loads while the other unloads.",
    ],
    caution: "Flossing, not stretching: slow, gentle, low reps. Tingling that lingers more than a few minutes afterwards = too much.",
  },
  {
    id: "posture",
    name: "Posture snacks",
    dose: "hourly · rolls, nods, short walk",
    tiers: ["green", "amber"],
    how: [
      "Every hour at the desk: 10 shoulder rolls back.",
      "5 gentle chin nods.",
      "2 minutes walking. Sustained slump is sustained compression — this resets it.",
    ],
    caution: "Frequency beats duration — lots of tiny breaks, not one big one.",
  },
  {
    id: "walk",
    name: "Gentle walk",
    dose: "10–20 min",
    tiers: ["red"],
    how: [
      "Easy pace, arms relaxed and swinging naturally.",
      "Nose-breathe if you comfortably can.",
      "This is circulation and calm, not exercise — keep it genuinely gentle.",
    ],
    caution: "On red days this plus breathing is the whole programme — resist adding more.",
  },
];

const PHASES = {
  1: { name: "Offload", gate: "Constant ache becomes intermittent; no flares from the daily routine." },
  2: { name: "Motor control", gate: "Pain-free daily life; full rehab sessions with no flare." },
  3: { name: "Load", gate: "Strict bodyweight pull-ups 3×8 symptom-free; light carries tolerated." },
  4: { name: "Return", gate: "Each rung of the ladders: 2 weeks symptom-free before the next." },
};

const todayKey = () => new Date().toLocaleDateString("en-CA");

const daysBetween = (a, b) =>
  Math.round((new Date(b + "T12:00") - new Date(a + "T12:00")) / 86400000);

const fmtClock = (s) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const DEFAULT_DATA = { status: "green", phase: 1, logs: {}, roos: [] };

/* ---------------- storage ---------------- */

function loadData() {
  const saved = store.get(STORAGE_KEY);
  if (saved) return { data: { ...DEFAULT_DATA, ...saved }, persist: true };
  const ok = store.set(STORAGE_KEY, DEFAULT_DATA);
  return { data: { ...DEFAULT_DATA }, persist: ok };
}

/* ---------------- Today ---------------- */

function TodayView({ data, update }) {
  const tk = todayKey();
  const log = data.logs[tk] || { score: null, note: "", done: {} };
  const st = STATUS[data.status];
  const items = ITEMS.filter((i) => i.tiers.includes(data.status));
  const parked = data.status === "amber" ? ITEMS.filter((i) => i.tiers.length === 1 && i.tiers[0] === "green") : [];
  const [score, setScore] = useState(log.score == null ? 3 : log.score);
  const [note, setNote] = useState(log.note || "");
  const [openId, setOpenId] = useState(null);
  const doneCount = items.filter((i) => log.done[i.id]).length;

  const setLog = (patch) =>
    update((d) => ({ ...d, logs: { ...d.logs, [tk]: { ...(d.logs[tk] || { score: null, note: "", done: {} }), ...patch, ts: Date.now() } } }));

  const toggle = (id) =>
    setLog({ done: { ...log.done, [id]: !log.done[id] } });

  return (
    <div>
      <SectionLabel>Today's status</SectionLabel>
      <div style={{ display: "flex", gap: 8 }}>
        {Object.entries(STATUS).map(([key, s]) => {
          const active = data.status === key;
          return (
            <button
              key={key}
              onClick={() => update((d) => ({ ...d, status: key }))}
              className="body"
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 12,
                border: `1.5px solid ${active ? s.color : C.border}`,
                background: active ? s.soft : C.card,
                color: active ? s.color : C.sub,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="body" style={{ fontSize: 13, color: st.color, margin: "8px 4px 0", fontWeight: 500 }}>
        {st.hint}
      </div>

      {data.status === "red" && (
        <Card style={{ marginTop: 12, background: C.redSoft, borderColor: "#E8C7C4" }}>
          <div className="body" style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>
            <strong>Red day plan:</strong> breathing and gentle walking only for 3–5 days, then re-enter at amber.
            Seek care if you notice hand wasting, dropping objects, colour change or swelling, or symptoms building day over day.
          </div>
        </Card>
      )}

      <SectionLabel>
        Daily dose · {doneCount}/{items.length}
      </SectionLabel>
      <Card style={{ padding: 6 }}>
        {items.map((item, idx) => {
          const done = !!log.done[item.id];
          const open = openId === item.id;
          const dose = data.status === "amber" && item.amberDose ? item.amberDose : item.dose;
          return (
            <div key={item.id} style={{ borderTop: idx === 0 ? "none" : `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px" }}>
                <button
                  onClick={() => toggle(item.id)}
                  aria-label={done ? `Mark ${item.name} not done` : `Mark ${item.name} done`}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 9,
                    flexShrink: 0,
                    padding: 0,
                    border: `2px solid ${done ? C.pine : C.border}`,
                    background: done ? C.pine : "transparent",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    transition: "background 0.15s",
                    cursor: "pointer",
                  }}
                >
                  {done ? "✓" : ""}
                </button>
                <button
                  onClick={() => setOpenId(open ? null : item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="body"
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: done ? C.faint : C.ink,
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {item.name}
                    </div>
                    <div className="body" style={{ fontSize: 12.5, color: C.faint }}>
                      {dose}
                    </div>
                  </div>
                  <div
                    className="body"
                    style={{
                      color: C.faint,
                      fontSize: 13,
                      flexShrink: 0,
                      transform: open ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s",
                    }}
                  >
                    ›
                  </div>
                </button>
              </div>
              {open && (
                <div style={{ padding: "0 10px 14px 48px" }}>
                  <ol className="body" style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: C.sub, lineHeight: 1.55 }}>
                    {item.how.map((step, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{step}</li>
                    ))}
                  </ol>
                  <div
                    className="body"
                    style={{
                      marginTop: 8,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: C.amberSoft,
                      color: C.amber,
                      fontSize: 12.5,
                      fontWeight: 500,
                      lineHeight: 1.45,
                    }}
                  >
                    {item.caution}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {parked.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 10px",
              borderTop: `1px solid ${C.border}`,
              opacity: 0.55,
            }}
          >
            <div style={{ width: 26, height: 26, borderRadius: 9, border: `2px dashed ${C.amber}`, flexShrink: 0 }} />
            <div>
              <div className="body" style={{ fontSize: 15, fontWeight: 600, color: C.sub }}>
                {item.name}
              </div>
              <div className="body" style={{ fontSize: 12.5, color: C.amber, fontWeight: 500 }}>
                Parked while amber
              </div>
            </div>
          </div>
        ))}
      </Card>

      <SectionLabel>Morning log</SectionLabel>
      <Card>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="body" style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
            Symptom score
          </div>
          <div className="disp tnum" style={{ fontSize: 28, fontWeight: 700, color: C.pine }}>
            {score}
            <span style={{ fontSize: 14, color: C.faint, fontWeight: 400 }}> /10</span>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          style={{ width: "100%", marginTop: 8 }}
        />
        <div className="body" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.faint }}>
          <span>quiet</span>
          <span>worst</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Yesterday's triggers, sleep, anything notable…"
          rows={2}
          className="body"
          style={{
            width: "100%",
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            fontSize: 14,
            resize: "none",
            color: C.ink,
            background: C.bg,
          }}
        />
        <button
          onClick={() => setLog({ score, note })}
          className="body"
          style={{
            width: "100%",
            marginTop: 10,
            padding: "12px 0",
            borderRadius: 12,
            border: "none",
            background: C.pine,
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {log.score == null ? "Save today's log" : "Update log ✓"}
        </button>
        {log.score != null && (
          <div className="body" style={{ textAlign: "center", fontSize: 12.5, color: C.pine, marginTop: 8, fontWeight: 500 }}>
            Logged for today
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Breathe ---------------- */

const IN_S = 4;
const OUT_S = 6;

function BreatheView() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("in");
  const [remain, setRemain] = useState(IN_S);
  const [cycles, setCycles] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const reduced = useMemo(
    () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    let ph = "in";
    let phStart = t0;
    const id = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - t0) / 1000));
      const dur = (ph === "in" ? IN_S : OUT_S) * 1000;
      const left = dur - (now - phStart);
      if (left <= 0) {
        if (ph === "out") setCycles((c) => c + 1);
        ph = ph === "in" ? "out" : "in";
        phStart = now;
        setPhase(ph);
        setRemain(ph === "in" ? IN_S : OUT_S);
      } else {
        setRemain(Math.ceil(left / 1000));
      }
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    setPhase("in");
    setRemain(IN_S);
    setCycles(0);
    setElapsed(0);
    setRunning(true);
  };

  const scale = !running ? 0.7 : phase === "in" ? 1 : 0.62;

  return (
    <div style={{ textAlign: "center" }}>
      <SectionLabel>Breath pacer · 4 in / 6 out</SectionLabel>
      <Card style={{ padding: "28px 16px" }}>
        <div
          style={{
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            className="breath-ring"
            style={{
              width: 210,
              height: 210,
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 42%, ${C.pineSoft}, #CFE4DC)`,
              border: `2px solid ${C.pine}`,
              transform: `scale(${scale})`,
              transition: running
                ? `transform ${phase === "in" ? IN_S : OUT_S}s cubic-bezier(0.37, 0, 0.44, 1)`
                : "transform 0.6s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <div className="disp" style={{ fontSize: 22, fontWeight: 600, color: C.pine }}>
              {running ? (phase === "in" ? "In through the nose" : "Out, slow") : "Ready"}
            </div>
            {running && (
              <div className="disp tnum" style={{ fontSize: 44, fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>
                {remain}
              </div>
            )}
          </div>
        </div>
        <div className="body" style={{ fontSize: 13, color: C.sub, marginTop: 6, lineHeight: 1.5 }}>
          Belly rises, chest and neck stay quiet. Small lazy breaths — if you feel fizzy or lightheaded, breathe smaller, not bigger.
        </div>
        <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 16 }}>
          <div>
            <div className="disp tnum" style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>{cycles}</div>
            <div className="body" style={{ fontSize: 11.5, color: C.faint }}>cycles</div>
          </div>
          <div>
            <div className="disp tnum" style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>{fmtClock(elapsed)}</div>
            <div className="body" style={{ fontSize: 11.5, color: C.faint }}>elapsed</div>
          </div>
        </div>
        <button
          onClick={() => (running ? setRunning(false) : start())}
          className="body"
          style={{
            marginTop: 16,
            width: "100%",
            padding: "13px 0",
            borderRadius: 12,
            border: "none",
            background: running ? C.card : C.pine,
            color: running ? C.red : "#fff",
            boxShadow: running ? `inset 0 0 0 1.5px ${C.border}` : "none",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {running ? "Stop" : "Start 4 · 6 breathing"}
        </button>
        {reduced && (
          <div className="body" style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>
            Reduced motion is on — follow the countdown numbers.
          </div>
        )}
      </Card>
      <div className="body" style={{ fontSize: 12.5, color: C.faint, marginTop: 12, padding: "0 8px", lineHeight: 1.5 }}>
        The highest-leverage item in the whole programme. Aim for 3–5 minutes; any extra sessions through the day are a bonus — this one has no cap.
      </div>
    </div>
  );
}

/* ---------------- Roos ---------------- */

const ROOS_CAP = 180;

function RoosView({ data, update }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const last = data.roos.length ? data.roos[data.roos.length - 1] : null;
  const daysSince = last ? daysBetween(last.date, todayKey()) : null;
  const gateStatus = data.status !== "green" ? "status" : last && daysSince < 7 ? "week" : "open";
  const doneToday = last && last.date === todayKey();

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const s = (Date.now() - startRef.current) / 1000;
      if (s >= ROOS_CAP) {
        clearInterval(id);
        save(ROOS_CAP, true);
      } else {
        setElapsed(s);
      }
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const save = (seconds, capped) => {
    setRunning(false);
    setElapsed(seconds);
    update((d) => ({
      ...d,
      roos: [...d.roos, { date: todayKey(), seconds: Math.round(seconds), capped: !!capped }],
    }));
  };

  const begin = () => {
    startRef.current = Date.now();
    setElapsed(0);
    setRunning(true);
  };

  const best = data.roos.reduce((m, r) => Math.max(m, r.seconds), 0);

  return (
    <div>
      <SectionLabel>Weekly Roos test</SectionLabel>
      <Card>
        <div className="body" style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.55 }}>
          Arms in the surrender position — upper arms out at shoulder height, elbows at 90°, palms forward. Slowly open and
          close your fists. Stop the clock at the <strong style={{ color: C.ink }}>first familiar symptom</strong>, or make it
          to 3:00.
        </div>

        {gateStatus !== "open" && !doneToday && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              background: gateStatus === "status" ? STATUS[data.status].soft : C.bg,
              border: `1px solid ${C.border}`,
            }}
          >
            <div className="body" style={{ fontSize: 13.5, fontWeight: 600, color: gateStatus === "status" ? STATUS[data.status].color : C.ink }}>
              {gateStatus === "status" ? "Locked while " + data.status : `Locked · next test in ${7 - daysSince} day${7 - daysSince === 1 ? "" : "s"}`}
            </div>
            <div className="body" style={{ fontSize: 12.5, color: C.sub, marginTop: 2, lineHeight: 1.5 }}>
              {gateStatus === "status"
                ? "This test provokes symptoms on purpose. Let the flare settle and come back on a green day."
                : "Once a week is the dose — testing more often stirs the nerve and muddies the trend."}
            </div>
          </div>
        )}

        {(gateStatus === "open" || doneToday || running) && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <div className="disp tnum" style={{ fontSize: 56, fontWeight: 700, color: running ? C.pine : C.ink, lineHeight: 1 }}>
              {fmtClock(doneToday && !running ? last.seconds : elapsed)}
            </div>
            {doneToday && !running ? (
              <div className="body" style={{ fontSize: 13.5, color: C.pine, fontWeight: 600, marginTop: 8 }}>
                Logged for this week {last.capped ? "· full 3:00, clean" : ""}
              </div>
            ) : running ? (
              <button
                onClick={() => save(elapsed, false)}
                className="body"
                style={{ marginTop: 14, width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: C.amber, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                Symptoms started — stop
              </button>
            ) : (
              <button
                onClick={begin}
                className="body"
                style={{ marginTop: 14, width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: C.pine, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                Start test
              </button>
            )}
          </div>
        )}
      </Card>

      {data.roos.length > 0 && (
        <>
          <SectionLabel>History · best {fmtClock(best)}</SectionLabel>
          <Card style={{ padding: 8 }}>
            {[...data.roos]
              .slice(-6)
              .reverse()
              .map((r, i) => (
                <div
                  key={r.date + i}
                  className="body"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 8px",
                    borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: C.sub }}>{r.date}</span>
                  <span className="tnum" style={{ fontWeight: 600, color: C.ink }}>
                    {fmtClock(r.seconds)}
                    {r.capped ? " ✓" : ""}
                  </span>
                </div>
              ))}
          </Card>
        </>
      )}
    </div>
  );
}

/* ---------------- Trends ---------------- */

function TrendsView({ data, update, persist }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef(null);

  const scoreData = useMemo(
    () =>
      Object.entries(data.logs)
        .filter(([, v]) => v.score != null)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .slice(-30)
        .map(([d, v]) => ({ d: d.slice(5), score: v.score })),
    [data.logs]
  );

  const roosData = useMemo(
    () => data.roos.slice(-12).map((r) => ({ d: r.date.slice(5), s: r.seconds })),
    [data.roos]
  );

  const last7 = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toLocaleDateString("en-CA");
      if (data.logs[k] && data.logs[k].score != null) n++;
    }
    return n;
  }, [data.logs]);

  const phase = PHASES[data.phase];

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hq-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || typeof obj !== "object" || !obj[STORAGE_KEY]) throw new Error("not an HQ backup");
        store.importAll(obj);
        update(() => ({ ...DEFAULT_DATA, ...obj[STORAGE_KEY] }));
      } catch {
        alert("That file doesn't look like an HQ backup.");
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  return (
    <div>
      <SectionLabel>Consistency</SectionLabel>
      <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div className="disp tnum" style={{ fontSize: 34, fontWeight: 700, color: C.pine }}>
          {last7}<span style={{ fontSize: 16, color: C.faint, fontWeight: 400 }}>/7</span>
        </div>
        <div className="body" style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.45 }}>
          days logged this week. The boring daily 15 minutes is the treatment — consistency beats intensity here.
        </div>
      </Card>

      <SectionLabel>Morning score · lower is better</SectionLabel>
      <Card style={{ padding: "16px 8px 8px 0" }}>
        {scoreData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={scoreData} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: C.faint }} tickLine={false} axisLine={{ stroke: C.border }} />
              <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fontSize: 10, fill: C.faint }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "Instrument Sans" }} />
              <Line type="monotone" dataKey="score" stroke={C.pine} strokeWidth={2.5} dot={{ r: 3, fill: C.pine }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="body" style={{ fontSize: 13, color: C.faint, padding: "24px 16px" }}>
            Two or more logged mornings will draw the trend line here.
          </div>
        )}
      </Card>

      <SectionLabel>Roos time · higher is better</SectionLabel>
      <Card style={{ padding: "16px 8px 8px 0" }}>
        {roosData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={roosData} margin={{ top: 4, right: 12, left: -14, bottom: 0 }}>
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: C.faint }} tickLine={false} axisLine={{ stroke: C.border }} />
              <YAxis domain={[0, 180]} ticks={[0, 90, 180]} tick={{ fontSize: 10, fill: C.faint }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "Instrument Sans" }} />
              <ReferenceLine y={180} stroke={C.border} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="s" stroke={C.amber} strokeWidth={2.5} dot={{ r: 3, fill: C.amber }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="body" style={{ fontSize: 13, color: C.faint, padding: "24px 16px" }}>
            Your weekly test results plot here — this number trending up is the primary barometer.
          </div>
        )}
      </Card>

      <SectionLabel>Phase</SectionLabel>
      <Card>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4].map((p) => (
            <button
              key={p}
              onClick={() => update((d) => ({ ...d, phase: p }))}
              className="disp"
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 12,
                border: `1.5px solid ${data.phase === p ? C.pine : C.border}`,
                background: data.phase === p ? C.pineSoft : C.card,
                color: data.phase === p ? C.pine : C.sub,
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="body" style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: C.ink }}>
          {data.phase}. {phase.name}
        </div>
        <div className="body" style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, marginTop: 2 }}>
          Gate to next phase: {phase.gate}
        </div>
      </Card>

      <SectionLabel>Data</SectionLabel>
      <Card>
        <div className="body" style={{ fontSize: 12.5, color: C.faint, lineHeight: 1.5 }}>
          {persist
            ? "Saved on this device — your logs never leave your phone. Export a backup now and then in case you lose or replace it."
            : "Storage is unavailable right now, so this session won't be saved."}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={exportBackup}
            className="body"
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 12,
              border: `1.5px solid ${C.border}`,
              background: C.card,
              color: C.pine,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Export backup
          </button>
          <button
            onClick={() => fileRef.current && fileRef.current.click()}
            className="body"
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 12,
              border: `1.5px solid ${C.border}`,
              background: C.card,
              color: C.sub,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Import
          </button>
          <input ref={fileRef} type="file" accept="application/json" onChange={importBackup} style={{ display: "none" }} />
        </div>
        <button
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              setTimeout(() => setConfirmReset(false), 4000);
            } else {
              update(() => ({ ...DEFAULT_DATA }));
              setConfirmReset(false);
            }
          }}
          className="body"
          style={{
            marginTop: 8,
            width: "100%",
            padding: "11px 0",
            borderRadius: 12,
            border: `1.5px solid ${confirmReset ? C.red : C.border}`,
            background: confirmReset ? C.redSoft : C.card,
            color: confirmReset ? C.red : C.sub,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {confirmReset ? "Tap again to erase everything" : "Reset all data"}
        </button>
      </Card>

      <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", margin: "18px 12px 4px", lineHeight: 1.5 }}>
        A companion to the rehab programme, not a diagnosis — the NCS/EMG referral still runs alongside this.
      </div>
    </div>
  );
}

/* ---------------- Module shell ---------------- */

const TABS = [
  { id: "today", label: "Today", icon: "☰" },
  { id: "breathe", label: "Breathe", icon: "◯" },
  { id: "roos", label: "Roos", icon: "⏱" },
  { id: "trends", label: "Trends", icon: "↗" },
];

export default function PhysioApp() {
  const [{ data, persist: initialPersist }] = useState(loadData);
  const [state, setState] = useState(data);
  const [persist, setPersist] = useState(initialPersist);
  const [tab, setTab] = useState("today");

  const update = (fn) => {
    setState((prev) => {
      const next = fn(prev);
      if (!store.set(STORAGE_KEY, next)) setPersist(false);
      return next;
    });
  };

  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ background: C.bg }}>
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 96px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
              Physio
            </div>
            <div className="body" style={{ fontSize: 13, color: C.faint }}>{dateStr}</div>
          </div>
          <div
            className="body"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: STATUS[state.status].color,
              background: STATUS[state.status].soft,
              padding: "5px 10px",
              borderRadius: 999,
            }}
          >
            {STATUS[state.status].label} · P{state.phase}
          </div>
        </div>

        {!persist && (
          <div className="body" style={{ marginTop: 12, padding: 10, borderRadius: 10, background: C.amberSoft, color: C.amber, fontSize: 12.5, fontWeight: 500 }}>
            Storage unavailable — this session won't be saved.
          </div>
        )}

        <div style={{ marginTop: 4 }}>
          {tab === "today" && <TodayView data={state} update={update} />}
          {tab === "breathe" && <BreatheView />}
          {tab === "roos" && <RoosView data={state} update={update} />}
          {tab === "trends" && <TrendsView data={state} update={update} persist={persist} />}
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(10px)",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div style={{ maxWidth: 430, margin: "0 auto", display: "flex", padding: "8px 8px calc(8px + env(safe-area-inset-bottom))" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="body"
              style={{
                flex: 1,
                padding: "8px 0 6px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: tab === t.id ? C.pine : C.faint,
              }}
            >
              <div style={{ fontSize: 17, lineHeight: 1 }}>{t.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 3 }}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
