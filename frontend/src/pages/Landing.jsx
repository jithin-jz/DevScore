import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Landing() {
    const { user } = useAuth();
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${import.meta.env.VITE_GITHUB_CLIENT_ID}&scope=read:user,repo&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`;

    return (
        <>
            {/* Hero Section */}
            <main className="relative z-10 pt-10 pb-20 md:pt-16 md:pb-32">
                <div className="max-w-[1500px] mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    <div className="space-y-8 animate-premium-fade-in">
                        <div className="ds-label py-1 opacity-80 text-ds-muted">
                            Engineering Identity Platform
                        </div>

                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.95] text-ds-text uppercase">
                            Your Code. <br />
                            <span className="text-ds-text/40 italic">Verified.</span>
                        </h1>

                        <p className="text-ds-muted text-[12px] font-bold uppercase tracking-widest max-w-md leading-loose opacity-80">
                            The industry standard for engineering credibility. Connect your GitHub
                            to generate a high-fidelity competency profile and shareable reputation
                            badges.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-6">
                            {user ? (
                                <Link
                                    to="/dashboard"
                                    className="btn-premium px-8 flex items-center justify-center w-full sm:w-auto"
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <a
                                    href={githubAuthUrl}
                                    className="btn-premium px-8 flex items-center justify-center w-full sm:w-auto"
                                >
                                    Get Started
                                </a>
                            )}
                            <Link
                                to="/stars"
                                className="px-8 py-3 bg-ds-warning/5 border border-ds-warning/20 hover:bg-ds-warning/10 font-black uppercase text-[10px] tracking-widest text-ds-warning transition-all rounded flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                                ⭐ Star Repos
                            </Link>
                        </div>
                    </div>

                    <div
                        className="hidden lg:block animate-premium-fade-in"
                        style={{ animationDelay: '0.1s' }}
                    >
                        <div className="ds-panel p-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <span className="ds-label">System Baseline</span>
                                <span className="px-2 py-0.5 rounded bg-ds-brand/5 border border-ds-brand/20 text-ds-brand text-[8px] font-black uppercase tracking-widest">
                                    Active Scan
                                </span>
                            </div>
                            <div className="flex items-end gap-2 font-display">
                                <span className="text-7xl font-black text-ds-text leading-none tracking-tighter">
                                    84.2
                                </span>
                                <span className="ds-label mb-2 opacity-50">/ 100</span>
                            </div>
                            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-ds-border">
                                <div className="space-y-1">
                                    <span className="ds-label">Category</span>
                                    <div className="text-[11px] font-black text-ds-text uppercase tracking-widest">
                                        Architect
                                    </div>
                                </div>
                                <div className="space-y-1 text-right">
                                    <span className="ds-label">Status</span>
                                    <div className="text-[11px] font-black text-ds-success uppercase tracking-widest">
                                        Optimal
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Feature Row */}
            <section className="relative z-10 py-20 md:py-32 border-y border-ds-border">
                <div className="max-w-[1500px] mx-auto px-4 md:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ds-border border border-ds-border overflow-hidden rounded-2xl">
                        {[
                            {
                                title: 'Baseline Scan',
                                desc: 'Vector analysis of repository architecture and code discipline patterns.',
                            },
                            {
                                title: 'Growth Map',
                                desc: 'AI-synthesized improvement trajectories for technical evolution.',
                            },
                            {
                                title: 'Showcase',
                                desc: 'Secure, verifiable identity badges for cross-platform professional transparency.',
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="p-6 md:p-10 bg-ds-bg-subtle space-y-4 hover:bg-ds-accent/[0.02] transition-colors"
                            >
                                <h3 className="text-sm font-black uppercase text-ds-text tracking-widest">
                                    {item.title}
                                </h3>
                                <p className="text-[11px] font-medium text-ds-muted leading-relaxed opacity-80">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
