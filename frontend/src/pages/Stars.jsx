import { useState, useEffect, useCallback, useRef } from 'react';
import { getStarFeed, recordStarClick } from '../lib/api';
import { Star, GitFork, ExternalLink, ArrowLeft, ArrowRight, Zap, Users, Code2, CheckCircle2, X, ChevronRight } from 'lucide-react';

// ─── Session helpers (no login needed) ────────────────────────────────────────
const SESSION_KEY = 'ds_star_session';
const SEEN_KEY = 'ds_star_seen';

function getSessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();
        localStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

function getSeenIds() {
    try {
        const raw = localStorage.getItem(SEEN_KEY);
        if (!raw) return [];
        const { ids, ts } = JSON.parse(raw);
        // Reset every 24 h so feed feels fresh
        if (Date.now() - ts > 86_400_000) return [];
        return ids;
    } catch {
        return [];
    }
}

function addSeenId(id) {
    const ids = getSeenIds();
    localStorage.setItem(SEEN_KEY, JSON.stringify({ ids: [...new Set([...ids, id])], ts: Date.now() }));
}

// ─── Language colour map ───────────────────────────────────────────────────────
const LANG_COLORS = {
    JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572a5',
    Rust: '#dea584', Go: '#00add8', Java: '#b07219', 'C++': '#f34b7d',
    Ruby: '#701516', Swift: '#f05138', Kotlin: '#7f52ff', PHP: '#4f5d95',
    CSS: '#563d7c', HTML: '#e34c26', Shell: '#89e051', Dart: '#00b4ab',
};

// ─── Badge chip ────────────────────────────────────────────────────────────────
function QualityBadge({ label, active }) {
    if (!active) return null;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-ds-success/10 text-ds-success border border-ds-success/20">
            <CheckCircle2 size={8} />
            {label}
        </span>
    );
}

// ─── Single swipe card ────────────────────────────────────────────────────────
function RepoCard({ card, onDirectStar, onSkip, isTop, stackIndex }) {
    const cardRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [offsetX, setOffsetX] = useState(0);
    const startXRef = useRef(null);

    const handlePointerDown = (e) => {
        if (!isTop) return;
        startXRef.current = e.clientX;
        setDragging(true);
        cardRef.current?.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!dragging || startXRef.current === null) return;
        setOffsetX(e.clientX - startXRef.current);
    };

    const handlePointerUp = () => {
        if (!dragging) return;
        setDragging(false);
        if (offsetX > 80) { onDirectStar(); }
        else if (offsetX < -80) { onSkip(); }
        setOffsetX(0);
        startXRef.current = null;
    };

    const rotate = isTop ? `${offsetX * 0.06}deg` : '0deg';
    const scale = isTop ? 1 : 1 - stackIndex * 0.04;
    const translateY = isTop ? 0 : stackIndex * 14;
    const opacity = isTop ? 1 : 1 - stackIndex * 0.15;
    const zIndex = 10 - stackIndex;

    const starHint = offsetX > 30;
    const skipHint = offsetX < -30;

    const langColor = LANG_COLORS[card.primary_language] || '#a1a1aa';

    return (
        <div
            ref={cardRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
                position: 'absolute',
                width: '100%',
                transform: `translateY(${translateY}px) rotate(${rotate}) scale(${scale})`,
                opacity,
                zIndex,
                isolation: 'isolate',
                transition: dragging ? 'none' : 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s',
                cursor: isTop ? (dragging ? 'grabbing' : 'grab') : 'default',
                touchAction: 'none',
                userSelect: 'none',
            }}
        >
            {/* Swipe hints */}
            {isTop && starHint && (
                <div className="absolute top-5 right-5 z-20 px-3 py-1 rounded-full bg-ds-success/20 border border-ds-success/40 text-ds-success text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Star size={12} fill="currentColor" /> Star
                </div>
            )}
            {isTop && skipHint && (
                <div className="absolute top-5 left-5 z-20 px-3 py-1 rounded-full bg-ds-danger/20 border border-ds-danger/40 text-ds-danger text-[10px] font-black uppercase tracking-widest">
                    Skip
                </div>
            )}

            <div
                className="ds-industrial-card p-6 md:p-8 space-y-5 select-none border-ds-border"
                style={{ backgroundColor: 'var(--ds-bg, #0a0a0a)', backdropFilter: 'none' }}
            >
                {/* Header */}
                <div className="flex items-start gap-3">
                    <img
                        src={`https://github.com/${card.owner_username}.png?size=48`}
                        alt={card.owner_username}
                        className="w-10 h-10 rounded-xl border border-ds-border flex-shrink-0"
                        draggable={false}
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-ds-muted uppercase tracking-widest truncate">
                            @{card.owner_username}
                        </p>
                        <h3 className="text-base font-black text-ds-text tracking-tight truncate mt-0.5">
                            {card.name}
                        </h3>
                    </div>
                    {card.is_boosted && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-ds-warning/10 border border-ds-warning/30 text-ds-warning text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Zap size={8} fill="currentColor" /> New
                        </span>
                    )}
                </div>

                {/* Description */}
                <p className="text-[12px] text-ds-muted leading-relaxed line-clamp-3 min-h-[54px]">
                    {card.description || 'No description provided.'}
                </p>

                {/* Stats row */}
                <div className="flex items-center gap-4">
                    {card.primary_language && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-ds-text-dim">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: langColor }} />
                            {card.primary_language}
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-bold text-ds-text-dim">
                        <Star size={11} className="text-ds-warning" fill="currentColor" /> {card.stars.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-ds-text-dim">
                        <GitFork size={11} /> {card.forks}
                    </span>
                </div>

                {/* Quality badges */}
                <div className="flex flex-wrap gap-1.5">
                    <QualityBadge label="CI" active={card.has_ci} />
                    <QualityBadge label="Tests" active={card.has_tests} />
                    <QualityBadge label="Docker" active={card.has_docker} />
                    <QualityBadge label="Linting" active={card.has_lint} />
                    <QualityBadge label="Types" active={card.has_types} />
                </div>

                {/* Social proof */}
                {card.weekly_clicks > 0 && (
                    <p className="text-[10px] text-ds-muted flex items-center gap-1.5">
                        <Users size={10} />
                        <span><strong className="text-ds-text">{card.weekly_clicks}</strong> people clicked to star this week</span>
                    </p>
                )}

                {/* CTA — only on top card */}
                {isTop && (
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onDirectStar(); }}
                        className="w-full btn-premium flex items-center justify-center gap-2 mt-2"
                    >
                        <Star size={13} fill="currentColor" /> Star on GitHub
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ card, onClose }) {
    const sessionId = getSessionId();
    const langColor = LANG_COLORS[card.primary_language] || '#a1a1aa';

    const handleOpenGitHub = async () => {
        try {
            await recordStarClick(card.id, sessionId);
        } catch {
            // fire-and-forget
        }
        window.open(card.github_url, '_blank', 'noopener,noreferrer');
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            {/* Modal */}
            <div
                className="relative w-full max-w-md ds-industrial-card p-7 space-y-6 animate-premium-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg bg-ds-btn-subtle-bg border border-ds-border text-ds-muted hover:text-ds-text transition-colors"
                >
                    <X size={14} />
                </button>

                {/* Owner */}
                <div className="flex items-center gap-3">
                    <img
                        src={`https://github.com/${card.owner_username}.png?size=64`}
                        alt={card.owner_username}
                        className="w-12 h-12 rounded-xl border border-ds-border"
                    />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-ds-muted">@{card.owner_username}</p>
                        <h2 className="text-xl font-black text-ds-text tracking-tight">{card.name}</h2>
                    </div>
                </div>

                {/* Description */}
                <p className="text-[13px] text-ds-muted leading-relaxed">
                    {card.description || 'No description provided.'}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Stars', value: card.stars.toLocaleString(), icon: Star },
                        { label: 'Forks', value: card.forks, icon: GitFork },
                        { label: 'Clicks/wk', value: card.weekly_clicks, icon: Users },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="ds-panel text-center space-y-1 py-3">
                            <Icon size={14} className="mx-auto text-ds-muted" />
                            <p className="text-base font-black text-ds-text">{value}</p>
                            <p className="ds-label">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Language + quality */}
                <div className="flex flex-wrap gap-2 items-center">
                    {card.primary_language && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-ds-text-dim">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: langColor }} />
                            {card.primary_language}
                        </span>
                    )}
                    <QualityBadge label="CI" active={card.has_ci} />
                    <QualityBadge label="Tests" active={card.has_tests} />
                    <QualityBadge label="Docker" active={card.has_docker} />
                    <QualityBadge label="Linting" active={card.has_lint} />
                    <QualityBadge label="Types" active={card.has_types} />
                </div>

                {/* CTA */}
                <button
                    onClick={handleOpenGitHub}
                    className="w-full btn-premium flex items-center justify-center gap-2 py-3"
                >
                    <Star size={14} fill="currentColor" />
                    Open on GitHub &amp; Star It
                    <ExternalLink size={12} />
                </button>

                <p className="text-center text-[9px] text-ds-muted">
                    Opens GitHub in a new tab · Give the repo a ⭐ to support the developer
                </p>
            </div>
        </div>
    );
}

// ─── Empty / done state ────────────────────────────────────────────────────────
function EmptyState({ onReset }) {
    return (
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-24 animate-premium-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-ds-warning/10 border border-ds-warning/20 flex items-center justify-center">
                <Star size={28} className="text-ds-warning" fill="currentColor" />
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-tight">You've seen everything!</h3>
                <p className="text-ds-muted text-[12px] max-w-xs mx-auto leading-relaxed">
                    You've gone through all the pinned repos. Come back tomorrow for fresh ones, or reset to see them again.
                </p>
            </div>
            <button onClick={onReset} className="btn-subtle">
                Reset &amp; Start Over
            </button>
        </div>
    );
}

// ─── Main Stars page ───────────────────────────────────────────────────────────
export default function Stars() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [seenIds, setSeenIds] = useState(() => getSeenIds());
    const [activeModal, setActiveModal] = useState(null);
    const [animatingOut, setAnimatingOut] = useState(null); // 'left' | 'right'
    const sessionId = getSessionId();

    const fetchFeed = useCallback(async (seen = []) => {
        setLoading(true);
        try {
            const res = await getStarFeed(seen);
            setCards(res.data || []);
        } catch (err) {
            console.error('Star feed error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeed(seenIds);
    }, []);// eslint-disable-line

    // Keyboard support
    useEffect(() => {
        const handler = (e) => {
            if (activeModal) return;
            if (e.key === 'ArrowRight') handleStar();
            if (e.key === 'ArrowLeft') handleSkip();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    });// eslint-disable-line

    const dismissTop = (direction) => {
        const top = cards[0];
        if (!top) return;
        setAnimatingOut(direction);
        setTimeout(() => {
            setAnimatingOut(null);
            const newSeen = [...seenIds, top.id];
            setSeenIds(newSeen);
            addSeenId(top.id);
            const remaining = cards.slice(1);
            setCards(remaining);
            // Prefetch more when < 5 cards left
            if (remaining.length < 5) {
                fetchFeed(newSeen);
            }
        }, 300);
    };

    const handleStar = async () => {
        const top = cards[0];
        if (!top) return;
        // Record click fire-and-forget
        try { await recordStarClick(top.id, sessionId); } catch {}
        // Open GitHub directly — no modal
        window.open(top.github_url, '_blank', 'noopener,noreferrer');
        dismissTop('right');
    };

    const handleSkip = () => {
        dismissTop('left');
    };

    const handleReset = () => {
        localStorage.removeItem(SEEN_KEY);
        setSeenIds([]);
        setCards([]);
        fetchFeed([]);
    };

    const visibleCards = cards.slice(0, 3);
    const isEmpty = !loading && cards.length === 0;

    return (
        <div className="flex-1 flex flex-col min-h-screen">
            {/* Header */}
            <div className="border-b border-ds-border bg-ds-bg/80 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-ds-warning/10 border border-ds-warning/20 flex items-center justify-center">
                            <Star size={16} className="text-ds-warning" fill="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-[11px] font-black uppercase tracking-widest text-ds-text">
                                GitHub Stars
                            </h1>
                            <p className="text-[9px] text-ds-muted">Discover &amp; star repos from the community</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-ds-muted">
                        <Code2 size={12} />
                        <span>{cards.length} in queue</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                {loading && cards.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 animate-premium-fade-in">
                        <div className="w-8 h-8 border-2 border-ds-border border-t-ds-warning rounded-full animate-spin" />
                        <p className="ds-label animate-pulse">Loading feed...</p>
                    </div>
                ) : isEmpty ? (
                    <EmptyState onReset={handleReset} />
                ) : (
                    <div className="w-full max-w-sm">
                        {/* Instruction hint */}
                        <div className="flex items-center justify-between mb-6 px-1">
                            <span className="text-[10px] text-ds-muted flex items-center gap-1">
                                <ArrowLeft size={10} /> Skip
                            </span>
                            <span className="text-[9px] text-ds-muted uppercase tracking-widest">Swipe or tap</span>
                            <span className="text-[10px] text-ds-muted flex items-center gap-1">
                                Star <ArrowRight size={10} />
                            </span>
                        </div>

                        {/* Card stack */}
                        <div className="relative" style={{ height: 310 }}>
                            {visibleCards.map((card, i) => {
                                const isTop = i === 0;
                                let extraStyle = {};
                                if (isTop && animatingOut === 'right') {
                                    extraStyle = { transform: 'translateX(120%) rotate(20deg)', opacity: 0, transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)' };
                                } else if (isTop && animatingOut === 'left') {
                                    extraStyle = { transform: 'translateX(-120%) rotate(-20deg)', opacity: 0, transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)' };
                                }
                                return (
                                    <div key={card.id} style={{ position: 'absolute', width: '100%', ...extraStyle }}>
                                        <RepoCard
                                            card={card}
                                            isTop={isTop}
                                            stackIndex={i}
                                            onDirectStar={handleStar}
                                            onSkip={handleSkip}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-center gap-6 mt-2">
                            <button
                                onClick={handleSkip}
                                className="w-14 h-14 rounded-2xl bg-ds-btn-subtle-bg border border-ds-border flex items-center justify-center text-ds-muted hover:text-ds-danger hover:border-ds-danger/30 transition-all active:scale-95"
                                title="Skip (←)"
                            >
                                <X size={20} />
                            </button>
                            <button
                                onClick={handleStar}
                                className="w-16 h-16 rounded-2xl bg-ds-warning/10 border border-ds-warning/40 flex items-center justify-center text-ds-warning hover:bg-ds-warning/20 transition-all active:scale-95 shadow-lg shadow-ds-warning/10"
                                title="Star on GitHub (→)"
                            >
                                <Star size={22} fill="currentColor" />
                            </button>
                            <button
                                onClick={() => { if (cards[0]) setActiveModal(cards[0]); }}
                                className="w-14 h-14 rounded-2xl bg-ds-btn-subtle-bg border border-ds-border flex items-center justify-center text-ds-muted hover:text-ds-text hover:border-ds-border transition-all active:scale-95"
                                title="View details"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <p className="text-center text-[9px] text-ds-muted mt-6 leading-relaxed">
                            ← Skip with left arrow · Star with right arrow →<br />
                            Starring opens GitHub so you can give a real ⭐
                        </p>
                    </div>
                )}
            </div>

            {/* Preview modal */}
            {activeModal && (
                <PreviewModal
                    card={activeModal}
                    onClose={() => setActiveModal(null)}
                    sessionId={sessionId}
                />
            )}
        </div>
    );
}
