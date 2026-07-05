/* Shared design system — palette + primitives used by every module. */

export const C = {
  bg: "#F2F4F3",
  card: "#FFFFFF",
  border: "#E1E7E4",
  ink: "#17211E",
  sub: "#5C6B66",
  faint: "#8FA09A",
  pine: "#2E6E5E",
  pineSoft: "#E3EFEA",
  green: "#2F7D4F",
  greenSoft: "#E4F1E8",
  amber: "#B4690E",
  amberSoft: "#F6ECDC",
  red: "#B3372F",
  redSoft: "#F6E3E1",
};

export function Card({ children, style }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div
      className="body"
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: C.faint,
        margin: "20px 4px 8px",
      }}
    >
      {children}
    </div>
  );
}
