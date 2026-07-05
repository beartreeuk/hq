import { useState } from "react";
import { store } from "./lib/store.js";
import { C } from "./lib/ui.jsx";
import TodayApp from "./modules/today/TodayApp.jsx";
import PhysioApp from "./modules/physio/PhysioApp.jsx";
import FuelApp from "./modules/fuel/FuelApp.jsx";
import HomeApp from "./modules/home/HomeApp.jsx";
import VapeApp from "./modules/vape/VapeApp.jsx";
import ReadApp from "./modules/read/ReadApp.jsx";
import SocialApp from "./modules/social/SocialApp.jsx";
import ProjectsApp from "./modules/projects/ProjectsApp.jsx";
import InboxApp from "./modules/inbox/InboxApp.jsx";

/*
  HQ — modular personal app.
  Each life area is a self-contained module with its own namespaced
  storage key (see src/lib/store.js). The pill bar at the top switches
  modules; the app always opens on the Today dashboard.
*/
const MODULES = [
  { id: "today", label: "Today", component: TodayApp },
  { id: "physio", label: "Physio", component: PhysioApp },
  { id: "fuel", label: "Fuel", component: FuelApp },
  { id: "home", label: "Home", component: HomeApp },
  { id: "vape", label: "Vape", component: VapeApp },
  { id: "read", label: "Read", component: ReadApp },
  { id: "social", label: "Social", component: SocialApp },
  { id: "projects", label: "Projects", component: ProjectsApp },
  { id: "inbox", label: "Inbox", component: InboxApp },
];

const inboxOpenCount = () => {
  const d = store.get("inbox.v1");
  return d && d.items ? d.items.filter((i) => !i.done).length : 0;
};

export default function App() {
  const [moduleId, setModuleId] = useState("today");

  const switchTo = (id) => {
    if (MODULES.some((m) => m.id === id)) setModuleId(id);
  };

  const active = MODULES.find((m) => m.id === moduleId) || MODULES[0];
  const Active = active.component;
  const badge = inboxOpenCount();

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div
        className="pillbar"
        style={{
          maxWidth: 430,
          margin: "0 auto",
          padding: "14px 16px 0",
          display: "flex",
          gap: 6,
          flexWrap: "nowrap",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {MODULES.map((m) => {
          const isActive = m.id === moduleId;
          const showBadge = m.id === "inbox" && badge > 0 && !isActive;
          return (
            <button
              key={m.id}
              onClick={() => switchTo(m.id)}
              className="body"
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: `1.5px solid ${isActive ? C.pine : C.border}`,
                background: isActive ? C.pineSoft : C.card,
                color: isActive ? C.pine : C.sub,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {m.label}
              {showBadge && (
                <span
                  className="tnum"
                  style={{
                    background: C.pine,
                    color: "#fff",
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "1px 6px",
                    lineHeight: 1.5,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Active onNavigate={switchTo} />
    </div>
  );
}
