import React, { useState } from "react";
import { store } from "../../lib/store.js";
import { C, Card, SectionLabel } from "../../lib/ui.jsx";

/* ------------------------------------------------------------------
   Fuel module — did you actually eat and drink today?
   Tap-count water, tap-stamp meals. Zero forms, zero calories.
------------------------------------------------------------------- */

const STORAGE_KEY = "fuel.v1";
const DEFAULT_DATA = { waterGoal: 8, days: {} };
const MEALS = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
];

const todayKey = () => new Date().toLocaleDateString("en-CA");

function load() {
  const saved = store.get(STORAGE_KEY);
  return saved ? { ...DEFAULT_DATA, ...saved } : { ...DEFAULT_DATA };
}

const emptyDay = () => ({ water: 0, meals: {}, snacks: 0 });

export default function FuelApp() {
  const [data, setData] = useState(load);
  const tk = todayKey();
  const day = data.days[tk] || emptyDay();

  const update = (fn) =>
    setData((prev) => {
      const next = fn(prev);
      store.set(STORAGE_KEY, next);
      return next;
    });

  const patchDay = (patch) =>
    update((d) => ({
      ...d,
      days: { ...d.days, [tk]: { ...(d.days[tk] || emptyDay()), ...patch } },
    }));

  const toggleMeal = (id) => {
    const meals = { ...day.meals };
    if (meals[id]) delete meals[id];
    else meals[id] = Date.now();
    patchDay({ meals });
  };

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toLocaleDateString("en-CA");
    const dd = data.days[k];
    week.push({
      key: k,
      label: d.toLocaleDateString("en-GB", { weekday: "narrow" }),
      water: !!dd && dd.water >= data.waterGoal,
      meals: !!dd && MEALS.every((m) => dd.meals && dd.meals[m.id]),
      isToday: k === tk,
    });
  }

  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const mealsDone = MEALS.filter((m) => day.meals[m.id]).length;

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
            Fuel
          </div>
          <div className="body" style={{ fontSize: 13, color: C.faint }}>{dateStr}</div>
        </div>
        <div
          className="body"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.pine,
            background: C.pineSoft,
            padding: "5px 10px",
            borderRadius: 999,
          }}
        >
          {day.water}/{data.waterGoal} · {mealsDone}/3
        </div>
      </div>

      <SectionLabel>Water</SectionLabel>
      <Card style={{ textAlign: "center" }}>
        <div className="disp tnum" style={{ fontSize: 48, fontWeight: 700, color: day.water >= data.waterGoal ? C.green : C.ink, lineHeight: 1 }}>
          {day.water}
          <span style={{ fontSize: 20, color: C.faint, fontWeight: 400 }}> / {data.waterGoal}</span>
        </div>
        <div className="body" style={{ fontSize: 12.5, color: C.faint, marginTop: 4 }}>
          glasses today{day.water >= data.waterGoal ? " — goal hit" : ""}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={() => patchDay({ water: Math.max(0, day.water - 1) })}
            className="disp"
            aria-label="Remove a glass"
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
            onClick={() => patchDay({ water: day.water + 1 })}
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
            + Drank a glass
          </button>
        </div>
      </Card>

      <SectionLabel>Meals</SectionLabel>
      <Card style={{ padding: 6 }}>
        {MEALS.map((m, idx) => {
          const ts = day.meals[m.id];
          return (
            <button
              key={m.id}
              onClick={() => toggleMeal(m.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                textAlign: "left",
                padding: "12px 10px",
                background: "transparent",
                border: "none",
                borderTop: idx === 0 ? "none" : `1px solid ${C.border}`,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 9,
                  flexShrink: 0,
                  border: `2px solid ${ts ? C.pine : C.border}`,
                  background: ts ? C.pine : "transparent",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                }}
              >
                {ts ? "✓" : ""}
              </div>
              <div className="body" style={{ fontSize: 15, fontWeight: 600, color: C.ink, flex: 1 }}>
                {m.label}
              </div>
              {ts && (
                <div className="body tnum" style={{ fontSize: 12.5, color: C.faint }}>
                  {new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </button>
          );
        })}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 10px",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <div className="body" style={{ fontSize: 15, fontWeight: 600, color: C.ink, flex: 1, paddingLeft: 38 }}>
            Snacks
          </div>
          <button
            onClick={() => patchDay({ snacks: Math.max(0, day.snacks - 1) })}
            className="disp"
            aria-label="Remove snack"
            style={{ width: 34, height: 34, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, color: C.sub, fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          >
            −
          </button>
          <div className="disp tnum" style={{ fontSize: 17, fontWeight: 700, color: C.ink, width: 20, textAlign: "center" }}>
            {day.snacks}
          </div>
          <button
            onClick={() => patchDay({ snacks: day.snacks + 1 })}
            className="disp"
            aria-label="Add snack"
            style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: C.pineSoft, color: C.pine, fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          >
            +
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
                title="water"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  margin: "0 auto 4px",
                  background: d.water ? C.pine : C.border,
                }}
              />
              <div
                title="meals"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  margin: "0 auto",
                  background: d.meals ? C.amber : C.border,
                }}
              />
            </div>
          ))}
        </div>
        <div className="body" style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 12, fontSize: 11.5, color: C.faint }}>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: C.pine, marginRight: 4 }} />water goal</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: C.amber, marginRight: 4 }} />3 meals</span>
        </div>
      </Card>

      <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", margin: "18px 12px 4px", lineHeight: 1.5 }}>
        No calories, no macros — just "did I eat and drink like a person today".
      </div>
    </div>
  );
}
