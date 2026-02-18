const AmbientBackground = () => (
  <>
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className="ambient-orb"
        style={{
          width: 600, height: 600,
          background: "hsl(var(--primary))",
          top: "-15%", left: "-10%",
        }}
      />
      <div
        className="ambient-orb"
        style={{
          width: 500, height: 500,
          background: "hsl(var(--accent))",
          top: "30%", right: "-15%",
          animationDelay: "-7s",
        }}
      />
      <div
        className="ambient-orb"
        style={{
          width: 400, height: 400,
          background: "hsl(var(--coral))",
          bottom: "-10%", left: "30%",
          animationDelay: "-14s",
          opacity: 0.2,
        }}
      />
    </div>
    <div className="noise-overlay" />
  </>
);

export default AmbientBackground;
