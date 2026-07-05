import PhysioApp from "./modules/physio/PhysioApp.jsx";

/*
  HQ — modular personal app.
  Each life area is a self-contained module with its own namespaced
  storage key (see src/lib/store.js). While there's only one module it
  renders full-screen; a module switcher appears once there are more.
*/
const MODULES = [
  { id: "physio", label: "Physio", component: PhysioApp },
  // future: tasks, routines, meds, ...
];

export default function App() {
  const Active = MODULES[0].component;
  return <Active />;
}
