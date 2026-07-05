import React, { useState } from "react";
import { store } from "../../lib/store.js";
import { C, Card } from "../../lib/ui.jsx";
import { ITEMS, STATUS } from "../physio/PhysioApp.jsx";
import { todaysHomeTask } from "../home/HomeApp.jsx";
import { DEFAULT_DATA as PROJECTS_DEFAULT } from "../projects/ProjectsApp.jsx";

/* ------------------------------------------------------------------
   Today module — the front page. One glance, whole day.
   Every row is a door into its module; a couple have inline actions
   so the common taps never cost a navigation.
------------------------------------------------------------------- */

const todayKey = () => new Date().toLocaleDateString("en-CA");

/* Days between two "YYYY-MM-DD" keys (b - a). */
function daysBetween(a, b) {
  const pa = new Date(a + "T00:00:00");
  const pb = new Date(b + "T00:00:00");
  if (isNaN(pa) || isNaN(pb)) return 0;
  return Math.round((pb - pa) / 86400000);
}

/* SocialApp doesn't export its ladder — duplicated verbatim. */
const SOCIAL_LADDER = [
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
const SOCIAL_WEEKLY_TARGET = 2;

/* ---------------- defensive store reads ---------------- */

const getPhysio = () => ({ status: "green", phase: 1, logs: {}, roos: [], ...(store.get("physio.v1") || {}) });
const getFuel = () => ({ waterGoal: 8, days: {}, ...(store.get("fuel.v1") || {}) });
const getHome = () => {
  const d = store.get("home.v1") || {};
  return {
    history: d.history && typeof d.history === "object" ? d.history : {},
    rescues: Array.isArray(d.rescues) ? d.rescues : [],
  };
};
const getRead = () => ({ book: "", goal: 10, log: {}, ...(store.get("read.v1") || {}) });
const getVape = () => ({
  weeklyCost: null,
  strength: null,
  strengthLog: [],
  quitDate: null,
  checkins: {},
  cravingsSurfed: 0,
  slips: [],
  ...(store.get("vape.v1") || {}),
});
const getSocial = () => {
  const d = store.get("social.v1") || {};
  const rung = Number.isFinite(d.rung) ? Math.min(SOCIAL_LADDER.length - 1, Math.max(0, Math.round(d.rung))) : 0;
  return { rung, attempts: Array.isArray(d.attempts) ? d.attempts : [] };
};
const getProjects = () => {
  const d = store.get("projects.v1") || PROJECTS_DEFAULT;
  return { projects: Array.isArray(d.projects) ? d.projects : [] };
};
const getInbox = () => {
  const d = store.get("inbox.v1") || {};
  return { items: Array.isArray(d.items) ? d.items : [] };
};

/* ---------------- row shell ---------------- */

function Row({ label, onTap, children, right }) {
  return (
    <Card
      onClick={onTap}
      style={{
        marginTop: 8,
        padding: "12px 14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="body"
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: C.faint,
          }}
        >
          {label}
        </div>
        <div style={{ marginTop: 3 }}>{children}</div>
      </div>
      {right}
      <div className="body" style={{ color: C.faint, fontSize: 14, flexShrink: 0 }}>
        ›
      </div>
    </Card>
  );
}

function Pill({ text, color, soft }) {
  return (
    <span
      className="body tnum"
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        color,
        background: soft,
        padding: "4px 9px",
        borderRadius: 999,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

const mainLine = { fontSize: 14.5, fontWeight: 600, color: C.ink, lineHeight: 1.35 };
const subLine = { fontSize: 12, color: C.faint, marginTop: 1 };

/* ---------------- module ---------------- */

export default function TodayApp({ onNavigate }) {
  const tk = todayKey();
  const go = (id) => {
    if (onNavigate) onNavigate(id);
  };

  /* Fuel and Home get inline actions, so they live in state. */
  const [fuel, setFuel] = useState(getFuel);
  const [home, setHome] = useState(getHome);

  /* Read-only rows — fresh read on every render is fine here. */
  const physio = getPhysio();
  const read = getRead();
  const vape = getVape();
  const social = getSocial();
  const projects = getProjects();
  const inbox = getInbox();

  /* --- Physio --- */
  const status = STATUS[physio.status] ? physio.status : "green";
  const st = STATUS[status];
  const tierItems = ITEMS.filter((i) => i.tiers.includes(status));
  const physioLog = (physio.logs && physio.logs[tk]) || { done: {} };
  const physioDoneMap = physioLog.done || {};
  const physioDone = tierItems.filter((i) => physioDoneMap[i.id]).length;
  const physioWin = tierItems.length > 0 && physioDone >= tierItems.length;

  /* --- Fuel --- */
  const fuelDay = (fuel.days && fuel.days[tk]) || { water: 0, meals: {}, snacks: 0 };
  const water = fuelDay.water || 0;
  const waterGoal = fuel.waterGoal || 8;
  const mealsDone = ["breakfast", "lunch", "dinner"].filter((m) => fuelDay.meals && fuelDay.meals[m]).length;
  const fuelWin = water >= waterGoal && mealsDone >= 3;

  const addGlass = (e) => {
    e.stopPropagation();
    setFuel((prev) => {
      const k = todayKey();
      const day = (prev.days && prev.days[k]) || { water: 0, meals: {}, snacks: 0 };
      const next = { ...prev, days: { ...(prev.days || {}), [k]: { ...day, water: (day.water || 0) + 1 } } };
      store.set("fuel.v1", next);
      return next;
    });
  };

  /* --- Home --- */
  const homeTask = todaysHomeTask(tk);
  const homeDone = !!(home.history[tk] && home.history[tk].done);

  const tickHome = (e) => {
    e.stopPropagation();
    if (homeDone) return;
    setHome((prev) => {
      const k = todayKey();
      const t = todaysHomeTask(k);
      const next = { ...prev, history: { ...prev.history, [k]: { task: t, done: true } } };
      store.set("home.v1", next);
      return next;
    });
  };

  /* --- Read --- */
  const readLog = read.log || {};
  const readToday = readLog[tk] || 0;
  const readGoal = read.goal || 10;
  const readWin = readToday >= readGoal;

  /* --- Vape --- */
  const vapeSetup = vape.strength !== null;
  const postQuit = vapeSetup && vape.quitDate !== null && tk >= vape.quitDate;
  const vapeCheckins = vape.checkins || {};
  const vapeSlips = Array.isArray(vape.slips) ? vape.slips : [];
  const checkinDone = vapeCheckins[tk] != null;
  const slipToday = vapeSlips.includes(tk);
  const daysOff = postQuit ? daysBetween(vape.quitDate, tk) + 1 : 0;
  const vapeWin = vapeSetup && (postQuit ? !slipToday : checkinDone);

  /* --- Social --- */
  const weekAgo = Date.now() - 7 * 86400000;
  const reps = social.attempts.filter((a) => a && a.ts >= weekAgo).length;
  const rungText = SOCIAL_LADDER[social.rung] || SOCIAL_LADDER[0];
  const socialWin = reps >= SOCIAL_WEEKLY_TARGET;

  /* --- Projects --- */
  const live = projects.projects.filter((p) => p && !p.parked);
  const firstLive = live[0] || null;

  /* --- Inbox --- */
  const openCount = inbox.items.filter((i) => i && !i.done).length;

  /* --- wins chip --- */
  const wins = [physioWin, fuelWin, homeDone, readWin, vapeWin, socialWin];
  const winCount = wins.filter(Boolean).length;
  const allWon = winCount === wins.length;

  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const tickBtn = (done, onClick, ariaLabel) => (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 30,
        height: 30,
        borderRadius: 10,
        flexShrink: 0,
        padding: 0,
        border: `2px solid ${done ? C.green : C.border}`,
        background: done ? C.green : "transparent",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        cursor: done ? "default" : "pointer",
      }}
    >
      {done ? "✓" : ""}
    </button>
  );

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", padding: "8px 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
            Today
          </div>
          <div className="body" style={{ fontSize: 13, color: C.faint }}>{dateStr}</div>
        </div>
        <div
          className="body tnum"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: allWon ? C.green : C.pine,
            background: allWon ? C.greenSoft : C.pineSoft,
            padding: "5px 10px",
            borderRadius: 999,
          }}
        >
          {winCount}/{wins.length}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {/* Physio — keystone */}
        <Row
          label="Physio"
          onTap={() => go("physio")}
          right={<Pill text={`${st.label} · ${physioDone}/${tierItems.length}`} color={st.color} soft={st.soft} />}
        >
          <div className="body" style={mainLine}>
            {physioWin
              ? "Daily dose done."
              : `Daily dose — ${physioDone} of ${tierItems.length} ticked`}
          </div>
        </Row>

        {/* Fuel */}
        <Row
          label="Fuel"
          onTap={() => go("fuel")}
          right={
            <button
              onClick={addGlass}
              aria-label="Drank a glass of water"
              className="disp"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "none",
                background: C.pineSoft,
                color: C.pine,
                fontSize: 17,
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              +
            </button>
          }
        >
          <div>
            <div className="body tnum" style={mainLine}>
              Water {water}/{waterGoal} · Meals {mealsDone}/3
            </div>
            <div className="body" style={subLine}>{fuelWin ? "fed and watered" : "tap + for a glass"}</div>
          </div>
        </Row>

        {/* Home */}
        <Row
          label="Home"
          onTap={() => go("home")}
          right={tickBtn(homeDone, tickHome, homeDone ? "Home task done" : "Mark home task done")}
        >
          <div>
            <div
              className="body"
              style={{
                ...mainLine,
                color: homeDone ? C.faint : C.ink,
                textDecoration: homeDone ? "line-through" : "none",
              }}
            >
              {homeTask}
            </div>
            <div className="body" style={subLine}>{homeDone ? "done — house handled" : "ten minutes, that's the deal"}</div>
          </div>
        </Row>

        {/* Read */}
        <Row
          label="Read"
          onTap={() => go("read")}
          right={
            <Pill
              text={`${readToday}/${readGoal}`}
              color={readWin ? C.green : C.pine}
              soft={readWin ? C.greenSoft : C.pineSoft}
            />
          }
        >
          <div className="body" style={mainLine}>
            {readWin
              ? "Pages done for tonight."
              : readToday > 0
                ? `${readToday} of ${readGoal} pages tonight`
                : `${readGoal} pages tonight${read.book ? ` — ${read.book}` : ""}`}
          </div>
        </Row>

        {/* Vape */}
        <Row
          label="Vape"
          onTap={() => go("vape")}
          right={
            !vapeSetup ? (
              <Pill text="set up" color={C.sub} soft={C.bg} />
            ) : postQuit ? (
              <Pill text={`day ${daysOff}`} color={C.green} soft={C.greenSoft} />
            ) : (
              <Pill
                text={checkinDone ? `checked · ${vapeCheckins[tk]}/5` : "check in"}
                color={checkinDone ? C.green : C.amber}
                soft={checkinDone ? C.greenSoft : C.amberSoft}
              />
            )
          }
        >
          <div>
            <div className="body" style={mainLine}>
              {!vapeSetup
                ? "Not set up yet — two numbers and you're off"
                : postQuit
                  ? `Day ${daysOff} off it${slipToday ? " — slip logged, carry on" : ""}`
                  : checkinDone
                    ? `Checked in today at ${vape.strength}mg`
                    : `How heavy today? (${vape.strength}mg)`}
            </div>
            <div className="body tnum" style={subLine}>
              {(vape.cravingsSurfed || 0)} craving{(vape.cravingsSurfed || 0) === 1 ? "" : "s"} surfed all time
            </div>
          </div>
        </Row>

        {/* Social */}
        <Row
          label="Social"
          onTap={() => go("social")}
          right={
            <Pill
              text={`${reps}/${SOCIAL_WEEKLY_TARGET} wk`}
              color={socialWin ? C.green : C.pine}
              soft={socialWin ? C.greenSoft : C.pineSoft}
            />
          }
        >
          <div
            className="body"
            style={{
              ...mainLine,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {rungText}
          </div>
        </Row>

        {/* Projects */}
        <Row label="Projects" onTap={() => go("projects")}>
          <div>
            {firstLive ? (
              <>
                <div className="body" style={mainLine}>
                  {firstLive.next || "Needs a next action — no rush"}
                </div>
                <div className="body" style={subLine}>{firstLive.title}</div>
              </>
            ) : (
              <div className="body" style={{ ...mainLine, color: C.faint, fontWeight: 500 }}>
                {projects.projects.length ? "All parked — that's allowed" : "Nothing on the books yet"}
              </div>
            )}
          </div>
        </Row>

        {/* Inbox */}
        <Row
          label="Inbox"
          onTap={() => go("inbox")}
          right={
            <button
              onClick={(e) => {
                e.stopPropagation();
                go("inbox");
              }}
              className="body"
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                background: C.pineSoft,
                color: C.pine,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              + capture
            </button>
          }
        >
          <div className="body tnum" style={mainLine}>
            {openCount === 0 ? "Empty. Nice." : `${openCount} open thought${openCount === 1 ? "" : "s"}`}
          </div>
        </Row>
      </div>

      <div className="body" style={{ fontSize: 11.5, color: C.faint, textAlign: "center", margin: "18px 12px 4px", lineHeight: 1.5 }}>
        Everything ticked? Close the app. You're done.
      </div>
    </div>
  );
}
