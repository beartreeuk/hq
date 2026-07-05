import React, { useEffect, useState } from "react";
import { store } from "../../lib/store.js";
import { C, Card, SectionLabel } from "../../lib/ui.jsx";

/* ------------------------------------------------------------------
   Vape module — off nicotine by strength taper, not white-knuckle.
   Drop the strength every 2-3 weeks, reach 0mg keeping the hand
   ritual, then drop the device. Slips are data, never a reset.
------------------------------------------------------------------- */

const STORAGE_KEY = "vape.v1";
const DEFAULT_DATA = {
  weeklyCost: null,
  strength: null,
  strengthLog: [],
  quitDate: null,
  checkins: {},
  cravingsSurfed: 0,
  slips: [],
};

const PRESETS = [20, 10, 5, 3];
const LADDER = [18, 16, 14, 12, 10, 8, 6, 5, 4, 3, 2, 1, 0];

const SOS_SECONDS = 300;
const SOS_MIN_COUNT = 60;
const CUES = ["In through the nose… 4", "Out slow… 6"];

const todayKey = () => new Date().toLocaleDateString("en-CA");

function load() {
  const saved = store.get(STORAGE_KEY);
  return saved ? { ...DEFAULT_DATA, ...saved } : { ...DEFAULT_DATA };
}

/* Days between two "YYYY-MM-DD" keys (b - a). */
function daysBetween(a, b) {
  const pa = new Date(a + "T00:00:00");
  const pb = new Date(b + "T00:00:00");
  if (isNaN(pa) || isNaN(pb)) return 0;
  return Math.round((pb - pa) / 86400000);
}

function fmtClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const btnBase = {
  borderRadius: 12,
  border: `1.5px solid ${C.border}`,
  background: C.card,
  color: C.ink,
  cursor: "pointer",
};

export default function VapeApp() {
  const [data, setData] = useState(load);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quitInput, setQuitInput] = useState("");
  const [editingCost, setEditingCost] = useState(false);
  const [costInput, setCostInput] = useState("");
  const [setupStrength, setSetupStrength] = useState("");
  const [setupCost, setSetupCost] = useState("");
  const [sos, setSos] = useState(null); // { started: ms epoch } | null
  const [now, setNow] = useState(Date.now());

  const tk = todayKey();

  const update = (fn) =>
    setData((prev) => {
      const next = fn(prev);
      store.set(STORAGE_KEY, next);
      return next;
    });

  /* ---------------- SOS timer ---------------- */
  useEffect(() => {
    if (!sos) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sos]);

  const sosElapsed = sos ? Math.floor((now - sos.started) / 1000) : 0;
  const sosRemaining = Math.max(0, SOS_SECONDS - sosElapsed);

  useEffect(() => {
    if (sos && sosRemaining <= 0) {
      update((d) => ({ ...d, cravingsSurfed: (d.cravingsSurfed || 0) + 1 }));
      setSos(null);
    }
  }, [sos, sosRemaining]);

  const startSos = () => {
    setNow(Date.now());
    setSos({ started: Date.now() });
  };

  const stopSos = () => {
    if (sosElapsed >= SOS_MIN_COUNT) {
      update((d) => ({ ...d, cravingsSurfed: (d.cravingsSurfed || 0) + 1 }));
    }
    setSos(null);
  };

  /* ---------------- derived ---------------- */
  const inSetup = data.strength === null;
  const postQuit = !inSetup && data.quitDate !== null && tk >= data.quitDate;

  const log = Array.isArray(data.strengthLog) ? data.strengthLog : [];
  const lastStep = log.length ? log[log.length - 1] : null;
  const daysAtStrength = lastStep ? daysBetween(lastStep.date, tk) : null;

  const checkins = data.checkins || {};
  const slips = Array.isArray(data.slips) ? data.slips : [];

  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const chipText = inSetup
    ? "Setting up"
    : postQuit
      ? `Day ${daysBetween(data.quitDate, tk) + 1} free`
      : `${data.strength}mg`;

  /* ---------------- actions ---------------- */
  const saveSetup = () => {
    const s = parseFloat(setupStrength);
    const c = parseFloat(setupCost);
    if (isNaN(s) || s < 0 || isNaN(c) || c < 0) return;
    update((d) => ({
      ...d,
      strength: s,
      weeklyCost: c,
      strengthLog: [...(d.strengthLog || []), { date: tk, strength: s }],
    }));
  };

  const stepDown = (s) => {
    update((d) => ({
      ...d,
      strength: s,
      strengthLog: [...(d.strengthLog || []), { date: tk, strength: s }],
    }));
    setPickerOpen(false);
  };

  const setCheckin = (v) =>
    update((d) => ({ ...d, checkins: { ...(d.checkins || {}), [tk]: v } }));

  const saveQuitDate = () => {
    if (!quitInput) return;
    update((d) => ({ ...d, quitDate: quitInput }));
  };

  const saveCost = () => {
    const c = parseFloat(costInput);
    if (isNaN(c) || c < 0) return;
    update((d) => ({ ...d, weeklyCost: c }));
    setEditingCost(false);
  };

  const logSlip = () => {
    if (slips.includes(tk)) return;
    update((d) => ({ ...d, slips: [...(d.slips || []), tk] }));
  };

  /* ---------------- shared pieces ---------------- */
  const header = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <div>
        <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
          Vape
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
        {chipText}
      </div>
    </div>
  );

  const sosCard = (
    <>
      <SectionLabel>Craving SOS</SectionLabel>
      <Card style={{ textAlign: "center" }}>
        {sos ? (
          <>
            <div className="disp tnum" style={{ fontSize: 44, fontWeight: 700, color: C.pine, lineHeight: 1 }}>
              {fmtClock(sosRemaining)}
            </div>
            <div className="body" style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginTop: 12 }}>
              {CUES[Math.floor(sosElapsed / 10) % CUES.length]}
            </div>
            <div className="body" style={{ fontSize: 12.5, color: C.faint, marginTop: 8, lineHeight: 1.5 }}>
              Cravings crest and pass in a few minutes. You only have to outlast this one.
            </div>
            <button
              onClick={stopSos}
              className="disp"
              style={{
                ...btnBase,
                width: "100%",
                marginTop: 14,
                padding: "14px 0",
                fontSize: 15,
                fontWeight: 700,
                color: C.sub,
              }}
            >
              {sosElapsed >= SOS_MIN_COUNT ? "Stop — it passed" : "Stop"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startSos}
              className="disp"
              style={{
                width: "100%",
                padding: "16px 0",
                borderRadius: 12,
                border: "none",
                background: C.pine,
                color: "#fff",
                fontSize: 17,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Craving? Surf it — 5 min
            </button>
            <div className="body tnum" style={{ fontSize: 12.5, color: C.faint, marginTop: 10 }}>
              {data.cravingsSurfed || 0} craving{(data.cravingsSurfed || 0) === 1 ? "" : "s"} surfed so far
            </div>
          </>
        )}
      </Card>
    </>
  );

  /* ---------------- setup ---------------- */
  if (inSetup) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 40px" }}>
        {header}
        <SectionLabel>Where are you now?</SectionLabel>
        <Card>
          <div className="body" style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.5 }}>
            Two numbers and we're off. No judgement — this is just the starting line.
          </div>
          <div className="body" style={{ fontSize: 12, fontWeight: 600, color: C.faint, margin: "16px 0 6px" }}>
            Current strength (mg/ml)
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setSetupStrength(String(p))}
                className="disp tnum"
                style={{
                  ...btnBase,
                  flex: 1,
                  padding: "12px 0",
                  fontSize: 15,
                  fontWeight: 700,
                  border: `1.5px solid ${String(p) === setupStrength ? C.pine : C.border}`,
                  background: String(p) === setupStrength ? C.pineSoft : C.card,
                  color: String(p) === setupStrength ? C.pine : C.ink,
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="or type it"
            value={setupStrength}
            onChange={(e) => setSetupStrength(e.target.value)}
            className="body tnum"
            style={{
              width: "100%",
              marginTop: 8,
              padding: "12px 12px",
              borderRadius: 12,
              border: `1.5px solid ${C.border}`,
              fontSize: 15,
              color: C.ink,
              background: C.card,
              boxSizing: "border-box",
            }}
          />
          <div className="body" style={{ fontSize: 12, fontWeight: 600, color: C.faint, margin: "16px 0 6px" }}>
            Rough weekly spend (£)
          </div>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="e.g. 15"
            value={setupCost}
            onChange={(e) => setSetupCost(e.target.value)}
            className="body tnum"
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 12,
              border: `1.5px solid ${C.border}`,
              fontSize: 15,
              color: C.ink,
              background: C.card,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={saveSetup}
            disabled={setupStrength === "" || setupCost === ""}
            className="disp"
            style={{
              width: "100%",
              marginTop: 16,
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: setupStrength === "" || setupCost === "" ? C.border : C.pine,
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: setupStrength === "" || setupCost === "" ? "default" : "pointer",
            }}
          >
            Start the taper
          </button>
        </Card>
        <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", margin: "18px 12px 4px", lineHeight: 1.5 }}>
          The plan: lower strength every 2-3 weeks, hit 0mg with the hand ritual intact, then retire the device.
        </div>
      </div>
    );
  }

  /* ---------------- post-quit ---------------- */
  if (postQuit) {
    const daysFree = daysBetween(data.quitDate, tk) + 1;
    const weekly = typeof data.weeklyCost === "number" ? data.weeklyCost : 0;
    const saved = (weekly / 7) * daysFree;
    const lastSlip = slips.length ? slips[slips.length - 1] : null;
    const daysSinceSlip = lastSlip ? daysBetween(lastSlip, tk) : null;
    const totalOff = Math.max(0, daysFree - slips.length);

    return (
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 40px" }}>
        {header}

        <SectionLabel>Vape-free</SectionLabel>
        <Card style={{ textAlign: "center" }}>
          <div className="disp tnum" style={{ fontSize: 56, fontWeight: 700, color: C.green, lineHeight: 1 }}>
            {daysFree}
          </div>
          <div className="body" style={{ fontSize: 12.5, color: C.faint, marginTop: 4 }}>
            day{daysFree === 1 ? "" : "s"} since {new Date(data.quitDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 14 }}>
            <div className="disp tnum" style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>
              £{saved.toFixed(2)}
            </div>
            {editingCost ? (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  className="body tnum"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1.5px solid ${C.border}`,
                    fontSize: 14,
                    color: C.ink,
                    background: C.card,
                    boxSizing: "border-box",
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={saveCost}
                  className="disp"
                  style={{ ...btnBase, border: "none", background: C.pine, color: "#fff", padding: "10px 16px", fontSize: 14, fontWeight: 700 }}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setCostInput(weekly ? String(weekly) : "");
                  setEditingCost(true);
                }}
                className="body tnum"
                style={{ border: "none", background: "transparent", color: C.faint, fontSize: 12, cursor: "pointer", padding: "6px 8px", marginTop: 2 }}
              >
                not spent, at £{weekly.toFixed(2)}/week — edit
              </button>
            )}
          </div>
        </Card>

        {sosCard}

        <SectionLabel>Honesty corner</SectionLabel>
        <Card>
          {slips.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, textAlign: "center", background: C.pineSoft, borderRadius: 12, padding: "12px 8px" }}>
                <div className="disp tnum" style={{ fontSize: 22, fontWeight: 700, color: C.pine }}>
                  {daysSinceSlip}
                </div>
                <div className="body" style={{ fontSize: 11.5, color: C.sub }}>days since last slip</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", background: C.greenSoft, borderRadius: 12, padding: "12px 8px" }}>
                <div className="disp tnum" style={{ fontSize: 22, fontWeight: 700, color: C.green }}>
                  {totalOff}
                </div>
                <div className="body" style={{ fontSize: 11.5, color: C.sub }}>total days off it</div>
              </div>
            </div>
          )}
          <button
            onClick={logSlip}
            className="body"
            disabled={slips.includes(tk)}
            style={{
              ...btnBase,
              width: "100%",
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 600,
              color: slips.includes(tk) ? C.faint : C.sub,
              cursor: slips.includes(tk) ? "default" : "pointer",
            }}
          >
            {slips.includes(tk) ? "Logged for today — carry on" : "I had a slip"}
          </button>
          <div className="body" style={{ fontSize: 11.5, color: C.faint, marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
            A slip is a data point, not a verdict. The streak that matters is the total.
          </div>
        </Card>
      </div>
    );
  }

  /* ---------------- pre-quit ---------------- */
  const lowerOptions = LADDER.filter((s) => s < data.strength);
  const todayCheckin = checkins[tk];

  const strip = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toLocaleDateString("en-CA");
    strip.push({ key: k, value: checkins[k] || 0, isToday: k === tk });
  }

  const quitDatePending = data.quitDate !== null; // set but in the future
  const minQuit = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("en-CA");
  })();

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 40px" }}>
      {header}

      <SectionLabel>Taper</SectionLabel>
      <Card style={{ textAlign: "center" }}>
        <div className="disp tnum" style={{ fontSize: 48, fontWeight: 700, color: data.strength === 0 ? C.green : C.ink, lineHeight: 1 }}>
          {data.strength}
          <span style={{ fontSize: 20, color: C.faint, fontWeight: 400 }}> mg/ml</span>
        </div>
        <div className="body tnum" style={{ fontSize: 12.5, color: C.faint, marginTop: 6 }}>
          {daysAtStrength === null
            ? "just started at this strength"
            : daysAtStrength === 0
              ? "stepped down today"
              : `${daysAtStrength} day${daysAtStrength === 1 ? "" : "s"} at this strength`}
        </div>
        {pickerOpen ? (
          <div style={{ marginTop: 14 }}>
            <div className="body" style={{ fontSize: 12, fontWeight: 600, color: C.faint, marginBottom: 8 }}>
              Drop to…
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {lowerOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => stepDown(s)}
                  className="disp tnum"
                  style={{
                    ...btnBase,
                    minWidth: 56,
                    padding: "12px 0",
                    fontSize: 15,
                    fontWeight: 700,
                    border: `1.5px solid ${s === 0 ? C.green : C.border}`,
                    color: s === 0 ? C.green : C.ink,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPickerOpen(false)}
              className="body"
              style={{ border: "none", background: "transparent", color: C.faint, fontSize: 13, cursor: "pointer", marginTop: 12, padding: "8px 12px" }}
            >
              Not yet
            </button>
          </div>
        ) : (
          data.strength > 0 && (
            <button
              onClick={() => setPickerOpen(true)}
              className="disp"
              style={{
                width: "100%",
                marginTop: 14,
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: C.pineSoft,
                color: C.pine,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Step down
            </button>
          )
        )}
        <div className="body" style={{ fontSize: 11.5, color: C.faint, marginTop: 12, lineHeight: 1.5 }}>
          Hold each strength 2-3 weeks. Boring is the goal.
        </div>
      </Card>

      <SectionLabel>How heavy today?</SectionLabel>
      <Card>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              onClick={() => setCheckin(v)}
              className="disp tnum"
              style={{
                ...btnBase,
                flex: 1,
                padding: "14px 0",
                fontSize: 16,
                fontWeight: 700,
                border: `1.5px solid ${todayCheckin === v ? C.pine : C.border}`,
                background: todayCheckin === v ? C.pine : C.card,
                color: todayCheckin === v ? "#fff" : C.ink,
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="body" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.faint, marginTop: 6, padding: "0 4px" }}>
          <span>barely</span>
          <span>constant</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 32, marginTop: 14 }}>
          {strip.map((d) => (
            <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
              <div
                style={{
                  height: d.value ? 6 + d.value * 5 : 4,
                  borderRadius: 3,
                  background: d.value ? C.pine : C.border,
                  opacity: d.value ? 0.28 + d.value * 0.14 : 1,
                  outline: d.isToday ? `1.5px solid ${C.pine}` : "none",
                }}
              />
            </div>
          ))}
        </div>
        <div className="body" style={{ fontSize: 11, color: C.faint, marginTop: 6, textAlign: "center" }}>
          last 14 days — taller means heavier
        </div>
      </Card>

      {data.strength <= 5 && (
        <>
          <SectionLabel>The final step</SectionLabel>
          <Card>
            {quitDatePending ? (
              <div className="body tnum" style={{ fontSize: 14, fontWeight: 600, color: C.pine, textAlign: "center" }}>
                Quit day set: {new Date(data.quitDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            ) : (
              <>
                <div className="body" style={{ fontSize: 13, color: C.sub, lineHeight: 1.55 }}>
                  You're low enough to pick a quit day. 0mg for a week or two keeps the hands busy while the nicotine's already gone. Then the device goes in a drawer.
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input
                    type="date"
                    min={minQuit}
                    value={quitInput}
                    onChange={(e) => setQuitInput(e.target.value)}
                    className="body tnum"
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: `1.5px solid ${C.border}`,
                      fontSize: 14,
                      color: C.ink,
                      background: C.card,
                      boxSizing: "border-box",
                      minWidth: 0,
                    }}
                  />
                  <button
                    onClick={saveQuitDate}
                    disabled={!quitInput || quitInput < minQuit}
                    className="disp"
                    style={{
                      border: "none",
                      borderRadius: 12,
                      background: !quitInput || quitInput < minQuit ? C.border : C.pine,
                      color: "#fff",
                      padding: "10px 16px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: !quitInput || quitInput < minQuit ? "default" : "pointer",
                    }}
                  >
                    Set it
                  </button>
                </div>
                <div className="body" style={{ fontSize: 11.5, color: C.faint, marginTop: 8 }}>
                  At least a week out — no heroics.
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {sosCard}

      <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", margin: "18px 12px 4px", lineHeight: 1.5 }}>
        Strength down, ritual intact, then the drawer. No white knuckles required.
      </div>
    </div>
  );
}
