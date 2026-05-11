import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
    Menu,
    X,
    Trophy,
    LayoutDashboard,
    LogOut,
    Star,
    ShieldCheck,
    Settings,
    ScanBarcode,
    FileText,
} from 'lucide-react';
import { motion } from 'motion/react';
import LayoutDashboardIcon from './ui/layout-dashboard-icon';
import StarIcon from './ui/star-icon';
import ScanBarcodeIcon from './ui/scan-barcode-icon';
import ShieldCheckIcon from './ui/shield-check';
import GearIcon from './ui/gear-icon';

export default function Navbar() {
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';
    const isDashboard = location.pathname === '/dashboard';

    const tabs = useMemo(
        () => [
            { id: 'overview', label: 'Overview', icon: LayoutDashboardIcon },
            { id: 'growth', label: 'Growth', icon: StarIcon },
            { id: 'auditor', label: 'Auditor', icon: ScanBarcodeIcon },
            { id: 'report', label: 'Dossier', icon: ShieldCheckIcon },
            { id: 'settings', label: 'Settings', icon: GearIcon },
        ],
        []
    );

    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const renderTabs = () => {
        if (!isDashboard) return null;
        return (
            <nav className="flex items-center w-full justify-between lg:justify-center h-10 lg:h-14 lg:gap-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setSearchParams({ tab: tab.id });
                        }}
                        className={`
                            flex flex-1 lg:flex-none items-center justify-center gap-1.5 px-1 md:px-4 h-full text-[9px] sm:text-[10px] lg:text-[9.5px] font-black uppercase tracking-wider transition-all group relative focus:outline-none
                            ${
                                activeTab === tab.id
                                    ? 'text-ds-text bg-ds-accent/5 lg:bg-transparent lg:text-ds-accent'
                                    : 'text-ds-muted hover:text-ds-text lg:hover:bg-ds-accent/5'
                            }
                        `}
                    >
                        <tab.icon
                            size={10}
                            color={activeTab === tab.id ? 'var(--ds-accent)' : 'currentColor'}
                            className="opacity-80 group-hover:opacity-100 hidden sm:block lg:block"
                        />
                        <span>{tab.label}</span>
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="nav-tab-active"
                                className="absolute bottom-0 left-0 right-0 h-[2px] bg-ds-accent lg:hidden"
                            />
                        )}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="nav-tab-active-pill"
                                className="hidden lg:block absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-ds-accent rounded-full"
                            />
                        )}
                    </button>
                ))}
            </nav>
        );
    };

    return (
        <header
            className={`border-b border-ds-border transition-all duration-300 sticky top-0 z-50 ${
                scrolled
                    ? 'bg-ds-bg/80 backdrop-blur-2xl shadow-xl shadow-black/5'
                    : 'bg-ds-bg/60 backdrop-blur-xl'
            }`}
        >
            <div className="max-w-[1500px] mx-auto px-4 md:px-6 h-12 md:h-14 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 shrink-0">
                    <Link
                        to="/"
                        className="flex items-center gap-2 md:gap-3 active:scale-95 transition-transform"
                    >
                        <div className="w-5 h-5 md:w-7 md:h-7 bg-ds-accent rounded flex items-center justify-center shadow-lg shadow-ds-accent/10">
                            <span className="text-ds-bg font-black italic text-[8px] md:text-xs">
                                D
                            </span>
                        </div>
                        <span className="text-[11px] md:text-[14px] font-black uppercase tracking-tighter">
                            DevScore
                        </span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-6 ml-4 border-l border-ds-border pl-6">
                        <Link
                            to="/leaderboard"
                            className={`text-[10px] font-black uppercase tracking-widest transition-all relative ${
                                location.pathname === '/leaderboard'
                                    ? 'text-ds-text'
                                    : 'text-ds-muted hover:text-ds-text'
                            }`}
                        >
                            Leaderboard
                            {location.pathname === '/leaderboard' && (
                                <motion.div
                                    layoutId="nav-active-pill"
                                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-ds-brand rounded-full"
                                />
                            )}
                        </Link>
                        <Link
                            to="/stars"
                            className={`text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-1.5 ${
                                location.pathname === '/stars'
                                    ? 'text-ds-warning'
                                    : 'text-ds-muted hover:text-ds-warning'
                            }`}
                        >
                            <Star size={10} fill="currentColor" />
                            Stars
                            {location.pathname === '/stars' && (
                                <motion.div
                                    layoutId="nav-active-pill"
                                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-ds-warning rounded-full"
                                />
                            )}
                        </Link>
                    </nav>
                </div>

                {/* Desktop Tabs Middle */}
                <div className="hidden lg:flex flex-1 justify-center max-w-2xl px-4">
                    {renderTabs()}
                </div>

                <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    {/* Desktop Auth */}
                    <div className="hidden md:flex items-center gap-4">
                        {user ? (
                            <Link
                                to="/dashboard"
                                className="w-8 h-8 rounded-lg overflow-hidden border border-ds-border hover:border-ds-accent transition-colors"
                            >
                                <img
                                    src={user.avatar_url || 'https://github.com/ghost.png'}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </Link>
                        ) : (
                            <Link to="/" className="btn-premium">
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button - Smaller */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-1.5 text-ds-muted hover:text-ds-text"
                    >
                        {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile Tabs Row - More Compact */}
            {isDashboard && (
                <div className="lg:hidden border-t border-ds-border bg-ds-bg/40 backdrop-blur-md">
                    <div className="max-w-full overflow-hidden">{renderTabs()}</div>
                </div>
            )}

            {/* Mobile Menu Drawer */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-ds-border bg-ds-bg/95 backdrop-blur-xl animate-premium-fade-in absolute top-full left-0 w-full shadow-2xl z-50 overflow-hidden">
                    <div className="px-5 py-8 space-y-8">
                        {/* User Profile Header in Menu */}
                        {user && (
                            <div className="flex items-center gap-4 pb-6 border-b border-ds-border/50">
                                <div className="relative">
                                    <img
                                        src={user.avatar_url || 'https://github.com/ghost.png'}
                                        alt=""
                                        className="w-12 h-12 rounded-xl border border-ds-border object-cover"
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-ds-success rounded-full border-2 border-ds-bg" />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[13px] font-black uppercase text-ds-text">
                                        {user.github_username}
                                    </div>
                                    <div className="text-[9px] font-bold text-ds-brand tracking-widest uppercase">
                                        Score: {parseFloat(user.dev_score || 0).toFixed(1)} •{' '}
                                        {user.tier || 'Baseline'}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-ds-muted block px-1">
                                Navigation
                            </span>
                            <div className="grid gap-2">
                                <Link
                                    to="/leaderboard"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-ds-accent/5 border border-ds-border hover:bg-ds-accent/10 transition-all active:scale-[0.98] group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-ds-accent/5 flex items-center justify-center border border-ds-border group-hover:border-ds-brand/30">
                                        <Trophy size={16} className="text-ds-brand" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[11px] font-black uppercase tracking-widest text-ds-text">
                                            Leaderboard
                                        </div>
                                        <div className="text-[8px] font-bold text-ds-muted uppercase tracking-tighter">
                                            Global Rankings
                                        </div>
                                    </div>
                                </Link>
                                <Link
                                    to="/stars"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-ds-warning/5 border border-ds-warning/20 hover:bg-ds-warning/10 transition-all active:scale-[0.98] group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-ds-warning/10 flex items-center justify-center border border-ds-warning/20">
                                        <Star size={16} className="text-ds-warning" fill="currentColor" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[11px] font-black uppercase tracking-widest text-ds-text">
                                            Stars Feed
                                        </div>
                                        <div className="text-[8px] font-bold text-ds-muted uppercase tracking-tighter">
                                            Discover &amp; star repos
                                        </div>
                                    </div>
                                </Link>

                                {user ? (
                                    <Link
                                        to="/dashboard"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-ds-accent/5 border border-ds-border hover:bg-ds-accent/10 transition-all active:scale-[0.98] group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-ds-accent/5 flex items-center justify-center border border-ds-border group-hover:border-ds-brand/30">
                                            <LayoutDashboard size={16} className="text-ds-brand" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-ds-text">
                                                Dashboard
                                            </div>
                                            <div className="text-[8px] font-bold text-ds-muted uppercase tracking-tighter">
                                                Personal Analytics
                                            </div>
                                        </div>
                                    </Link>
                                ) : (
                                    <Link
                                        to="/"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-ds-accent text-ds-bg hover:brightness-110 transition-all active:scale-[0.98] group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-ds-bg/20 flex items-center justify-center">
                                            <LayoutDashboard size={16} className="text-ds-bg" />
                                        </div>
                                        <div className="flex-1 text-center">
                                            <div className="text-[11px] font-black uppercase tracking-widest">
                                                Sign In with GitHub
                                            </div>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {user && (
                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        logout();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-ds-danger/5 border border-ds-danger/10 hover:bg-ds-danger/10 transition-all active:scale-[0.98] group text-ds-danger"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-ds-danger/5 flex items-center justify-center border border-ds-danger/10 group-hover:bg-ds-danger/10">
                                        <LogOut size={16} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-[11px] font-black uppercase tracking-widest">
                                            Sign Out
                                        </div>
                                        <div className="text-[8px] font-bold text-ds-danger/60 uppercase tracking-tighter">
                                            Terminate Session
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Decorative Bottom Bar */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-ds-brand/20 via-ds-accent/20 to-ds-brand/20" />
                </div>
            )}
        </header>
    );
}
