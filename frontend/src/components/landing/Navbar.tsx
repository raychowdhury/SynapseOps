const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-[100] px-6 md:px-10 py-4 flex justify-between items-center backdrop-blur-xl bg-background/65 border-b border-border">
    <a href="/" className="flex items-center gap-2.5 no-underline">
      <img src="/logo.png" alt="SynapseOps" className="w-9 h-9 rounded-[10px] object-cover" />
      <span className="font-bold text-xl tracking-tight text-foreground">SynapseOps</span>
    </a>
    <ul className="hidden md:flex gap-7 items-center list-none">
      <li><a href="/#platform" className="text-text-2 no-underline text-sm font-medium hover:text-foreground transition-colors">Platform</a></li>
      <li><a href="/#journey" className="text-text-2 no-underline text-sm font-medium hover:text-foreground transition-colors">How It Works</a></li>
      <li className="relative group">
        <a href="/services" className="text-text-2 no-underline text-sm font-medium hover:text-foreground transition-colors">
          Services
        </a>
        <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 absolute left-0 top-full mt-2 min-w-[210px] rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur-xl p-2">
          <a
            href="/services/api-integration"
            className="block rounded-md px-3 py-2 text-sm no-underline text-foreground hover:bg-muted/70 transition-colors"
          >
            API Integration
          </a>
        </div>
      </li>
      <li><a href="/#integrations" className="text-text-2 no-underline text-sm font-medium hover:text-foreground transition-colors">Integrations</a></li>
      <li><a href="/dashboard" className="text-text-2 no-underline text-sm font-medium hover:text-foreground transition-colors">Dashboard</a></li>
      <li>
        <a href="/#cta" className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold no-underline hover:shadow-[0_0_32px_hsl(var(--accent-glow))] hover:-translate-y-0.5 transition-all">
          Get Early Access
        </a>
      </li>
    </ul>
  </nav>
);

export default Navbar;
