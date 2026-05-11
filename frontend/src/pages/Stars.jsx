import { useState, useEffect, useCallback, useRef } from 'react';
import { getStarFeed, recordStarClick } from '../lib/api';
import { Star, GitFork, ExternalLink, ArrowLeft, ArrowRight, Zap, Users, Code2, CheckCircle2, X, ChevronRight, Share2, Sparkles, Quote } from 'lucide-react';
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

// ─── Action Button Component ──────────────────────────────────────────────────
function ActionButton({ icon, onClick, color, label, primary = false }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={onClick}
                className={`
                    ${primary ? 'w-20 h-20' : 'w-16 h-16'}
                    rounded-full flex items-center justify-center transition-all active:scale-90
                    bg-ds-bg border border-ds-border hover:border-opacity-50 group
                    shadow-[0_8px_30px_rgb(0,0,0,0.4)]
                `}
                style={{
                    borderColor: `${color}44`,
                }}
            >
                <div 
                    className="transition-transform group-hover:scale-110"
                    style={{ color: color }}
                >
                    {icon}
                </div>
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-ds-muted opacity-50">{label}</span>
        </div>
    );
}

// ─── Repo Card Component ──────────────────────────────────────────────────────
function RepoCard({ card, isTop, stackIndex, totalCards, onDirectStar, onSkip }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const rotateY = useTransform(x, [-200, 200], [-30, 30]);
    const scale = useTransform(x, [-200, 200], [1, 0.95]);

    // Opacities for the stamps
    const likeOp = useTransform(x, [50, 150], [0, 1]);
    const nopeOp = useTransform(x, [-50, -150], [0, 1]);
    const superOp = useTransform(y, [-50, -150], [0, 1]);

    const handleDragEnd = (_, info) => {
        if (info.offset.x > 100) {
            onDirectStar();
        } else if (info.offset.x < -100) {
            onSkip();
        } else if (info.offset.y < -100) {
            onDirectStar();
        }
    };

    const langColor = LANG_COLORS[card.primary_language] || '#3b82f6';
    const initials = card.owner_username.slice(0, 2).toUpperCase();
    const matchScore = Math.floor(Math.random() * 15) + 85; 

    return (
        <motion.div
            style={{
                x,
                y,
                rotate,
                rotateY,
                scale,
                zIndex: totalCards - stackIndex,
                position: 'absolute',
                width: '100%',
                maxWidth: '340px',
                height: '520px',
                touchAction: 'none',
                perspective: '1000px',
            }}
            drag={isTop ? true : false}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            animate={{
                scale: 1 - stackIndex * 0.08,
                y: stackIndex * -35,
                opacity: 1 - stackIndex * 0.2,
                rotateZ: stackIndex * (stackIndex % 2 === 0 ? -1.5 : 1.5),
                rotateX: stackIndex * -2,
                x: 0,
            }}
            exit={{ 
                x: x.get() < 0 ? -500 : 500, 
                opacity: 0, 
                scale: 0.5,
                transition: { duration: 0.3 } 
            }}
            transition={{ 
                type: 'spring', 
                stiffness: 260, 
                damping: 25,
                mass: 0.8 
            }}
            className="cursor-grab active:cursor-grabbing"
        >
            <div className="ds-industrial-card p-0 border-ds-border rounded-[2.5rem] relative overflow-hidden h-full flex flex-col shadow-2xl group ring-1 ring-white/10 select-none bg-[#09090b]">
                {/* LIKE stamp */}
                {isTop && (
                    <motion.div style={{ opacity: likeOp }} className="absolute inset-0 z-30 pointer-events-none flex items-start p-8">
                        <div className="border-[4px] border-ds-success rounded-xl px-4 py-1 rotate-[-15deg] bg-ds-success/10">
                            <span className="text-2xl font-black text-ds-success tracking-widest">LIKE</span>
                        </div>
                    </motion.div>
                )}

                {/* NOPE stamp */}
                {isTop && (
                    <motion.div style={{ opacity: nopeOp }} className="absolute inset-0 z-30 pointer-events-none flex items-start justify-end p-8">
                        <div className="border-[4px] border-ds-danger rounded-xl px-4 py-1 rotate-[15deg] bg-ds-danger/10">
                            <span className="text-2xl font-black text-ds-danger tracking-widest">NOPE</span>
                        </div>
                    </motion.div>
                )}

                {/* SUPER stamp */}
                {isTop && (
                    <motion.div style={{ opacity: superOp }} className="absolute inset-0 z-30 pointer-events-none flex items-end justify-center p-12">
                        <div className="border-[4px] border-ds-brand rounded-xl px-4 py-1 bg-ds-brand/10">
                            <span className="text-2xl font-black text-ds-brand tracking-widest">SUPER</span>
                        </div>
                    </motion.div>
                )}

                {/* Top radial glow */}
                <div 
                    className="absolute -top-12 left-1/2 -translate-x-1/2 w-[300px] h-[220px] pointer-events-none opacity-40"
                    style={{ background: `radial-gradient(ellipse, ${langColor}44 0%, transparent 70%)` }}
                />

                {/* Shimmer line */}
                <div 
                    className="absolute top-0 left-0 right-0 h-[1px] opacity-50"
                    style={{ background: `linear-gradient(90deg, transparent 0%, ${langColor} 50%, transparent 100%)` }}
                />

                <div className="flex-1 flex flex-col p-6 relative z-10">
                    {/* Match Badge */}
                    <div className="flex justify-end mb-4">
                        <div className="px-3 py-1 rounded-lg border flex items-center gap-2" style={{ backgroundColor: `${langColor}18`, borderColor: `${langColor}35` }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: langColor }} />
                            <span className="text-[10px] font-black tracking-widest" style={{ color: langColor }}>
                                {matchScore}% MATCH
                            </span>
                        </div>
                    </div>

                    {/* Identity Section */}
                    <div className="flex items-center gap-4 mb-6">
                        <div 
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black border overflow-hidden shrink-0"
                            style={{ backgroundColor: `${langColor}22`, borderColor: `${langColor}45`, color: langColor, fontFamily: 'monospace' }}
                        >
                            {card.owner_avatar ? (
                                <img src={card.owner_avatar} alt={card.owner_username} className="w-full h-full object-cover" />
                            ) : (
                                initials
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h3 className="text-xl font-black text-ds-text leading-none tracking-tight mb-1 truncate">
                                {card.name}
                            </h3>
                            <span className="text-xs text-ds-muted font-medium truncate">@{card.owner_username}</span>
                            <div className="flex items-center gap-1.5 mt-2">
                                <div className="w-1 h-1 rounded-full opacity-50" style={{ backgroundColor: langColor }} />
                                <span className="text-[10px] text-ds-muted uppercase tracking-wider">{card.primary_language || 'Open Source'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bio / Description */}
                    <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 mb-6">
                        <div className="relative">
                            <Quote size={16} className="absolute -top-2 -left-2 opacity-20" style={{ color: langColor }} />
                            <p className="text-[13px] text-ds-text-dim leading-relaxed italic line-clamp-4 pl-6 pt-1">
                                {card.description || 'A remarkable piece of engineering waiting to be explored and integrated into your workflow.'}
                            </p>
                        </div>
                    </div>

                    {/* Centered Stats */}
                    <div className="flex gap-3 mb-6">
                        <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 text-center">
                            <div className="text-lg font-black text-ds-text font-mono leading-none mb-1">
                                {card.stars.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-ds-muted uppercase tracking-[0.2em]">Stars</div>
                        </div>
                        <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 text-center">
                            <div className="text-lg font-black text-ds-text font-mono leading-none mb-1">
                                {card.forks.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-ds-muted uppercase tracking-[0.2em]">Forks</div>
                        </div>
                    </div>

                    {/* Quality Tags */}
                    <div className="flex flex-wrap gap-2 mt-auto">
                        {card.has_ci && <CardTag label="CI/CD" color={langColor} />}
                        {card.has_tests && <CardTag label="Tests" color={langColor} />}
                        {card.has_docker && <CardTag label="Docker" color={langColor} />}
                    </div>
                </div>

                {/* Bottom Accent */}
                <div 
                    className="absolute bottom-0 left-[15%] right-[15%] h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${langColor}55, transparent)` }}
                />
            </div>
        </motion.div>
    );
}

function CardTag({ label, color }) {
    return (
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold border" style={{ backgroundColor: `${color}12`, borderColor: `${color}28`, color }}>
            {label}
        </span>
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
            <div className="w-24 h-24 rounded-[3rem] bg-ds-brand/10 border border-ds-brand/20 flex items-center justify-center shadow-2xl">
                <Star size={48} className="text-ds-brand" fill="currentColor" />
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

    const handleStar = async (openUrl = false) => {
        const top = cards[0];
        if (!top) return;
        try { await recordStarClick(top.id, sessionId); } catch {}
        if (openUrl) {
            window.open(top.github_url, '_blank', 'noopener,noreferrer');
        }
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
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-black relative">
            {/* Background Aesthetics */}
            <div className="absolute inset-0 z-0 opacity-20" 
                 style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} 
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-radial-glow opacity-30 pointer-events-none" />
            


            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10 overflow-hidden">
                {loading && cards.length === 0 ? (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-ds-border border-t-ds-brand rounded-full animate-spin" />
                        <p className="text-xs font-black text-ds-muted uppercase tracking-[0.3em]">Discovery Initializing</p>
                    </div>
                ) : isEmpty ? (
                    <EmptyState onReset={handleReset} />
                ) : (
                    <div className="w-full max-w-[340px] flex flex-col items-center justify-center">
                        {/* Card stack */}
                        <div className="relative w-full h-[520px] flex items-center justify-center">
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

                        {/* Action buttons */}
                        <div className="flex items-center justify-center gap-6 mt-8">
                            <ActionButton 
                                color="#ef4444" 
                                icon={<X size={24} />} 
                                onClick={handleSkip} 
                                label="Skip"
                            />
                            <ActionButton 
                                color="#3b82f6" 
                                icon={<Star size={28} fill="currentColor" />} 
                                onClick={() => handleStar(true)} 
                                label="Star"
                                primary
                            />
                            <ActionButton 
                                color="#10b981" 
                                icon={<ChevronRight size={24} />} 
                                onClick={() => dismissTop('right')} 
                                label="Next"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
