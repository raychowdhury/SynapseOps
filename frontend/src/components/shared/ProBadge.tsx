export default function ProBadge({ className = "" }: { className?: string }) {
    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/20 ${className}`}>
            PRO
        </span>
    );
}
