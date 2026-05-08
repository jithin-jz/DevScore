const TIER_CONFIG = {
    baseline: { label: 'Baseline', color: '#ffffff' },
    proficient: { label: 'Proficient', color: '#ffffff' },
    advanced: { label: 'Advanced', color: '#ffffff' },
    architect: { label: 'Architect', color: '#ffffff' },
    principal: { label: 'Principal', color: '#ffffff' },
};

export default function ScoreCard({ score, tier }) {
    const radius = 42; // Smaller radius
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    return (
        <div className="ds-industrial-card flex flex-col items-center justify-between h-full bg-ds-bg-subtle w-full z-10 relative px-4 py-6 md:px-6 md:py-8">
            <h3 className="text-[9px] font-black text-ds-muted uppercase tracking-[0.4em] opacity-40">
                Standard Index
            </h3>

            <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center shrink-0 my-4 md:my-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke="var(--ds-border)"
                        strokeWidth="3"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke="var(--ds-accent)"
                        strokeWidth="4"
                        strokeLinecap="square"
                        strokeDashoffset={circumference - (progress || 0)}
                        strokeDasharray={circumference}
                        style={{
                            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center mt-0.5">
                    <span className="text-4xl font-black text-ds-text tracking-tighter leading-none mb-0.5">
                        {Math.round(score || 0)}
                    </span>
                    <span className="text-[8px] font-black text-ds-muted tracking-widest uppercase opacity-30">
                        PCT
                    </span>
                </div>
            </div>

            <div className="flex flex-col items-center gap-1.5 w-full pt-4 md:pt-6 border-t border-ds-border">
                <div className="text-[8px] font-black text-ds-muted uppercase tracking-[0.3em] opacity-40">
                    Status Check
                </div>
                <div className="text-[10px] font-black text-ds-text uppercase tracking-[0.2em]">
                    {tier}
                </div>
            </div>
        </div>
    );
}
