import { useState, useEffect, useCallback, useRef } from 'react';
import { getStarFeed, recordStarClick } from '../lib/api';
import { Star, GitFork, ExternalLink, ArrowLeft, ArrowRight, Zap, Users, Code2, CheckCircle2, X, ChevronRight, Share2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

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

// ─── Repo Card Component ──────────────────────────────────────────────────────
function RepoCard({ card, onDirectStar, onSkip, isTop, stackIndex, totalCards }) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
    const starOpacity = useTransform(x, [50, 150], [0, 1]);
    const skipOpacity = useTransform(x, [-150, -50], [1, 0]);

    const handleDragEnd = (event, info) => {
        if (info.offset.x > 100) {
            onDirectStar();
        } else if (info.offset.x < -100) {
            onSkip();
        }
    };

    const langColor = LANG_COLORS[card.primary_language] || '#a1a1aa';

    // Desktop/Mobile specific styles
    const scale = 1 - stackIndex * 0.05;
    const translateY = stackIndex * -15;

    return (
        <motion.div
            style={{
                x,
                rotate,
                scale,
                y: translateY,
                zIndex: totalCards - stackIndex,
                position: 'absolute',
                width: '100%',
                height: '100%',
                touchAction: 'none',
            }}
            drag={isTop ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            animate={{
                scale: 1 - stackIndex * 0.05,
                y: stackIndex * -15,
                opacity: 1 - stackIndex * 0.2,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="cursor-grab active:cursor-grabbing"
        >
            {/* Visual feedback overlays */}
            {isTop && (
                <>
                    <motion.div 
                        style={{ opacity: starOpacity }}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-ds-success/20 rounded-[32px] pointer-events-none"
                    >
                        <div className="bg-ds-success text-white px-8 py-3 rounded-full font-black uppercase tracking-tighter flex items-center gap-2 shadow-2xl scale-125 border-4 border-white/20">
                            <Star size={28} fill="currentColor" /> STAR
                        </div>
                    </motion.div>
                    <motion.div 
                        style={{ opacity: skipOpacity }}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-ds-danger/20 rounded-[32px] pointer-events-none"
                    >
                        <div className="bg-ds-danger text-white px-8 py-3 rounded-full font-black uppercase tracking-tighter flex items-center gap-2 shadow-2xl scale-125 border-4 border-white/20">
                            <X size={28} /> SKIP
                        </div>
                    </motion.div>
                </>
            )}

            <div className="ds-industrial-card p-8 md:p-8 space-y-6 md:space-y-5 border-ds-border relative overflow-hidden h-full flex flex-col justify-between shadow-2xl">
                <div className="space-y-8 md:space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-5">
                        <img
                            src={`https://github.com/${card.owner_username}.png?size=80`}
                            alt={card.owner_username}
                            className="w-14 h-14 md:w-10 md:h-10 rounded-2xl border border-ds-border flex-shrink-0"
                            draggable={false}
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] md:text-[9px] font-black text-ds-muted uppercase tracking-widest truncate">
                                @{card.owner_username}
                            </p>
                            <h3 className="text-2xl md:text-base font-black text-ds-text tracking-tight truncate mt-1">
                                {card.name}
                            </h3>
                        </div>
                        {card.is_boosted && (
                            <span className="flex-shrink-0 px-3 py-1 rounded-full bg-ds-warning/10 border border-ds-warning/30 text-ds-warning text-[10px] md:text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                <Zap size={10} fill="currentColor" /> NEW
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <p className="text-[16px] md:text-[12px] text-ds-muted leading-relaxed line-clamp-6 md:line-clamp-3">
                        {card.description || 'No description provided.'}
                    </p>

                    {/* Stats row */}
                    <div className="flex items-center gap-6 md:gap-4">
                        {card.primary_language && (
                            <span className="flex items-center gap-2 text-[14px] md:text-[11px] font-bold text-ds-text-dim">
                                <span className="w-3.5 h-3.5 md:w-2.5 md:h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: langColor }} />
                                {card.primary_language}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 text-[14px] md:text-[11px] font-bold text-ds-text-dim">
                            <Star size={14} className="text-ds-warning" fill="currentColor" /> {card.stars.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1.5 text-[14px] md:text-[11px] font-bold text-ds-text-dim">
                            <GitFork size={14} /> {card.forks}
                        </span>
                    </div>

                    {/* Quality badges */}
                    <div className="flex flex-wrap gap-2.5 md:gap-1.5">
                        <QualityBadge label="CI" active={card.has_ci} />
                        <QualityBadge label="Tests" active={card.has_tests} />
                        <QualityBadge label="Docker" active={card.has_docker} />
                        <QualityBadge label="Lint" active={card.has_lint} />
                    </div>
                </div>

                <div className="space-y-6 md:space-y-4">
                    {/* Social proof */}
                    {card.weekly_clicks > 0 && (
                        <p className="text-[12px] md:text-[10px] text-ds-muted flex items-center gap-2.5">
                            <Users size={14} className="text-ds-muted/60" />
                            <span><strong className="text-ds-text">{card.weekly_clicks}</strong> star engagements this week</span>
                        </p>
                    )}

                    {/* CTA — only on top card */}
                    {isTop && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDirectStar(); }}
                            className="w-full btn-premium flex items-center justify-center gap-3 py-5 md:py-3 text-base md:text-xs font-black shadow-2xl"
                        >
                            <Star size={20} className="md:size-4" fill="currentColor" /> STAR ON GITHUB
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onReset }) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center space-y-10 py-20"
        >
            <div className="w-24 h-24 rounded-[3rem] bg-ds-warning/10 border border-ds-warning/20 flex items-center justify-center shadow-2xl">
                <Star size={48} className="text-ds-warning" fill="currentColor" />
            </div>
            <div className="space-y-4">
                <h3 className="text-3xl font-black uppercase tracking-tight text-ds-text">Discovery Done!</h3>
                <p className="text-ds-muted text-base max-w-[300px] mx-auto leading-relaxed">
                    You've seen all the featured repositories. Come back soon for fresh projects!
                </p>
            </div>
            <button onClick={onReset} className="btn-premium px-12 py-4">
                Reset Feed
            </button>
        </motion.div>
    );
}

// ─── Main Stars page ───────────────────────────────────────────────────────────
export default function Stars() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [seenIds, setSeenIds] = useState(() => getSeenIds());
    const [animatingDirection, setAnimatingDirection] = useState(null);
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

    const dismissTop = (direction) => {
        const top = cards[0];
        if (!top) return;
        
        setAnimatingDirection(direction);
        
        setTimeout(() => {
            setCards(prev => prev.slice(1));
            setAnimatingDirection(null);
            
            const newSeen = [...seenIds, top.id];
            setSeenIds(newSeen);
            addSeenId(top.id);
            
            if (cards.length < 5) {
                fetchFeed(newSeen);
            }
        }, 300);
    };

    const handleStar = async () => {
        const top = cards[0];
        if (!top) return;
        try { await recordStarClick(top.id, sessionId); } catch {}
        window.open(top.github_url, '_blank', 'noopener,noreferrer');
        dismissTop('right');
    };

    const handleSkip = () => dismissTop('left');

    const handleReset = () => {
        localStorage.removeItem(SEEN_KEY);
        setSeenIds([]);
        setCards([]);
        fetchFeed([]);
    };

    const visibleCards = cards.slice(0, 3);
    const isEmpty = !loading && cards.length === 0;

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-black">
            {/* DESKTOP HEADER (Preserved) */}
            <div className="hidden md:block border-b border-ds-border bg-ds-bg/80 backdrop-blur-md sticky top-0 z-20">
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

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10 overflow-hidden">
                {loading && cards.length === 0 ? (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-ds-border border-t-ds-warning rounded-full animate-spin" />
                        <p className="text-xs font-black text-ds-muted uppercase tracking-[0.3em]">Discovery Initializing</p>
                    </div>
                ) : isEmpty ? (
                    <EmptyState onReset={handleReset} />
                ) : (
                    <div className="w-full max-w-[95%] md:max-w-xs flex flex-col items-center h-[80vh] md:h-auto">
                        {/* Card stack */}
                        <div className="relative w-full h-full md:h-[310px]">
                            <AnimatePresence mode="popLayout">
                                {visibleCards.map((card, i) => (
                                    <RepoCard
                                        key={card.id}
                                        card={card}
                                        isTop={i === 0}
                                        stackIndex={i}
                                        totalCards={visibleCards.length}
                                        onDirectStar={handleStar}
                                        onSkip={handleSkip}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* DESKTOP Action buttons (Preserved) */}
                        <div className="hidden md:flex items-center justify-center gap-6 mt-2">
                            <button onClick={handleSkip} className="w-14 h-14 rounded-2xl bg-ds-bg border border-ds-border flex items-center justify-center text-ds-muted hover:text-ds-danger transition-all active:scale-95">
                                <X size={20} />
                            </button>
                            <button onClick={handleStar} className="w-16 h-16 rounded-2xl bg-ds-warning/10 border border-ds-warning/40 flex items-center justify-center text-ds-warning transition-all active:scale-95 shadow-lg shadow-ds-warning/10">
                                <Star size={22} fill="currentColor" />
                            </button>
                            <button onClick={() => dismissTop('right')} className="w-14 h-14 rounded-2xl bg-ds-bg border border-ds-border flex items-center justify-center text-ds-muted transition-all active:scale-95">
                                <ChevronRight size={20} />
                            </button>
                        </div>


                    </div>
                )}
            </div>
        </div>
    );
}
