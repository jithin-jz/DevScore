import { useState, useEffect } from 'react';
import { getPinnedRepos, pinRepo, unpinRepo } from '../lib/api';
import { Star, ExternalLink, Plus, X, TrendingUp, Activity } from 'lucide-react';

const LANG_DOT = {
    JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572a5',
    Rust: '#dea584', Go: '#00add8', Java: '#b07219', 'C++': '#f34b7d',
    Ruby: '#701516', Swift: '#f05138', Kotlin: '#7f52ff', PHP: '#4f5d95',
    CSS: '#563d7c', HTML: '#e34c26', Shell: '#89e051', Dart: '#00b4ab',
};

export default function PinnedReposPanel({ repos = [] }) {
    const [pins, setPins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // holds repoId being saved
    const [error, setError] = useState('');

    const fetchPins = async () => {
        try {
            const res = await getPinnedRepos();
            setPins(res.data || []);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPins(); }, []);

    const isPinned = (repoId) => pins.some((p) => p.repo_id === repoId);
    const getPinId  = (repoId) => pins.find((p) => p.repo_id === repoId)?.id;

    const handlePin = async (repoId) => {
        if (pins.length >= 2 && !isPinned(repoId)) {
            setError('Unpin one before adding another.');
            return;
        }
        setError('');
        setSaving(repoId);
        try {
            await pinRepo(repoId);
            await fetchPins();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to pin.');
        } finally {
            setSaving(null);
        }
    };

    const handleUnpin = async (pinId, repoId) => {
        setError('');
        setSaving(repoId);
        try {
            await unpinRepo(pinId);
            await fetchPins();
        } catch {
            setError('Failed to unpin.');
        } finally {
            setSaving(null);
        }
    };

    const totalWeekly  = pins.reduce((s, p) => s + (p.weekly_clicks  || 0), 0);
    const totalAllTime = pins.reduce((s, p) => s + (p.click_count || 0), 0);

    const availableRepos = repos.filter((r) => !r.is_fork).sort((a, b) => b.stars - a.stars);

    return (
        <div className="space-y-6">

            {/* ── Section: Pinned slots ─────────────────────────────── */}
            <div className="space-y-3">

                {/* Header row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Star size={12} className="text-ds-warning" fill="currentColor" />
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-ds-text">
                            Pinned Repos
                        </span>
                        <span className="text-[9px] font-bold text-ds-muted">
                            {loading ? '…' : `${pins.length} / 2`}
                        </span>
                    </div>
                    {/* Inline stats — only when pinned */}
                    {!loading && pins.length > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[9px] text-ds-muted">
                                <TrendingUp size={9} />
                                <strong className="text-ds-text font-black">{totalWeekly}</strong>
                                &nbsp;this wk
                            </span>
                            <span className="flex items-center gap-1 text-[9px] text-ds-muted">
                                <Activity size={9} />
                                <strong className="text-ds-text font-black">{totalAllTime}</strong>
                                &nbsp;total
                            </span>
                        </div>
                    )}
                </div>

                {/* Pinned slot cards — always show 2 slots */}
                {loading ? (
                    <div className="grid grid-cols-2 gap-2">
                        {[0, 1].map((i) => (
                            <div key={i} className="h-20 rounded-xl border border-ds-border animate-pulse bg-ds-btn-subtle-bg" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {/* Filled slots */}
                        {pins.map((pin) => (
                            <div
                                key={pin.id}
                                className="relative group rounded-xl border border-ds-warning/25 bg-ds-warning/[0.04] p-3 space-y-2 overflow-hidden"
                            >
                                {/* Unpin button */}
                                <button
                                    onClick={() => handleUnpin(pin.id, pin.repo_id)}
                                    disabled={saving === pin.repo_id}
                                    className="absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center text-ds-muted hover:text-ds-danger hover:bg-ds-danger/10 transition-all disabled:opacity-30 opacity-0 group-hover:opacity-100"
                                    title="Unpin"
                                >
                                    <X size={10} />
                                </button>

                                <div className="flex items-center gap-1.5 pr-5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-ds-warning flex-shrink-0" />
                                    <p className="text-[11px] font-black text-ds-text truncate leading-none">
                                        {pin.name}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1 text-[9px] text-ds-muted">
                                        <Star size={8} className="text-ds-warning" fill="currentColor" />
                                        {pin.stars ?? 0}
                                    </span>
                                    <span className="text-[9px] text-ds-muted">
                                        {pin.weekly_clicks ?? 0} clicks/wk
                                    </span>
                                </div>

                                <a
                                    href={pin.github_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-ds-muted hover:text-ds-warning transition-colors"
                                >
                                    <ExternalLink size={8} /> GitHub
                                </a>
                            </div>
                        ))}

                        {/* Empty slots */}
                        {Array.from({ length: 2 - pins.length }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="rounded-xl border border-dashed border-ds-border bg-transparent p-3 flex flex-col items-center justify-center gap-1.5 min-h-[80px] opacity-50"
                            >
                                <div className="w-5 h-5 rounded-lg border border-ds-border flex items-center justify-center">
                                    <Plus size={10} className="text-ds-muted" />
                                </div>
                                <p className="text-[8px] text-ds-muted uppercase tracking-widest">Empty slot</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Divider ───────────────────────────────────────────── */}
            <div className="border-t border-ds-border" />

            {/* ── Section: Pick a repo ──────────────────────────────── */}
            <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-ds-text">
                    {pins.length === 0 ? 'Pin a repo' : 'Pin another repo'}
                </span>

                {availableRepos.length === 0 ? (
                    <p className="text-[10px] text-ds-muted py-4 text-center">
                        Sync your GitHub repos first.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto no-scrollbar">
                        {availableRepos.map((repo) => {
                            const pinned  = isPinned(repo.id);
                            const pinId   = getPinId(repo.id);
                            const dot     = LANG_DOT[repo.primary_language];
                            const busy    = saving === repo.id;
                            const full    = !pinned && pins.length >= 2;

                            return (
                                <div
                                    key={repo.id}
                                    className={`relative rounded-xl border p-3 space-y-2 transition-all ${
                                        pinned
                                            ? 'border-ds-warning/30 bg-ds-warning/[0.04]'
                                            : full
                                                ? 'border-ds-border bg-transparent opacity-40 cursor-not-allowed'
                                                : 'border-ds-border bg-ds-btn-subtle-bg hover:border-ds-warning/40 hover:bg-ds-warning/[0.03] cursor-pointer'
                                    }`}
                                    onClick={() => {
                                        if (busy || full) return;
                                        pinned ? handleUnpin(pinId, repo.id) : handlePin(repo.id);
                                    }}
                                >
                                    {/* Pinned indicator */}
                                    {pinned && (
                                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-ds-warning" />
                                    )}

                                    <p className="text-[11px] font-black text-ds-text truncate pr-4 leading-none">
                                        {repo.name}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        {dot && (
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                                        )}
                                        <span className="text-[9px] text-ds-muted truncate">
                                            {repo.primary_language || '—'}
                                        </span>
                                        <span className="flex items-center gap-0.5 text-[9px] text-ds-muted ml-auto flex-shrink-0">
                                            <Star size={8} className="text-ds-warning" fill="currentColor" />
                                            {repo.stars}
                                        </span>
                                    </div>

                                    {/* Action label */}
                                    <div className={`text-[8px] font-black uppercase tracking-widest ${
                                        pinned ? 'text-ds-danger' : 'text-ds-warning'
                                    }`}>
                                        {busy ? '…' : pinned ? 'Unpin' : 'Pin'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Error ────────────────────────────────────────────── */}
            {error && (
                <p className="text-[9px] font-bold text-ds-danger bg-ds-danger/5 border border-ds-danger/15 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            {/* ── Footer note ──────────────────────────────────────── */}
            <p className="text-[9px] text-ds-muted leading-relaxed border-t border-ds-border pt-3">
                Pinned repos appear in the public{' '}
                <a href="/stars" className="text-ds-warning hover:underline">Stars feed</a>
                . New pins get priority for 48 h.
            </p>
        </div>
    );
}
