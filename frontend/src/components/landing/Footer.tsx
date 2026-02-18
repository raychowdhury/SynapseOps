const Footer = () => (
  <footer className="border-t border-border py-10 relative z-[1]">
    <div className="container">
      <div className="flex justify-between items-center flex-wrap gap-5">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 no-underline">
            <img src="/logo.png" alt="SynapseOps" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-semibold text-sm text-foreground">SynapseOps</span>
          </a>
          <span className="text-[0.82rem] text-text-3">© 2026 SynapseOps. All rights reserved.</span>
        </div>
        <ul className="flex gap-6 list-none">
          {["Privacy", "Terms", "Docs", "Twitter", "GitHub"].map((link) => (
            <li key={link}>
              <a href="#" className="text-[0.82rem] text-text-3 no-underline hover:text-foreground transition-colors">{link}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </footer>
);

export default Footer;
