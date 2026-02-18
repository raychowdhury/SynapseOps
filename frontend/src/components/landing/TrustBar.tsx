const logos = ["Acme Corp", "TechFlow", "DataBridge", "CloudNine", "ScaleStack"];

const TrustBar = () => (
  <div className="py-16 text-center relative z-[1] container">
    <div className="text-[0.72rem] uppercase tracking-[0.15em] text-text-3 font-semibold mb-8">
      Trusted by teams at
    </div>
    <div className="flex justify-center gap-12 flex-wrap items-center opacity-35">
      {logos.map((name) => (
        <span key={name} className="text-xl font-bold tracking-tight text-text-2">{name}</span>
      ))}
    </div>
  </div>
);

export default TrustBar;
