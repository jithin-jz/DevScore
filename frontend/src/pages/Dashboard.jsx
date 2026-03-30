import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useSearchParams } from 'react-router-dom';
import {
    getScore,
    getScoreHistory,
    getRecommendations,
    triggerAnalysis,
    getAnalysisStatus,
    resetAnalysis,
    deleteAccount,
} from '../lib/api';
import ScoreCard from '../components/ScoreCard';
import RadarChart from '../components/RadarChart';
import ScoreBreakdownTable from '../components/ScoreBreakdownTable';
import HistoricalChart from '../components/HistoricalChart';
import RecommendationCard from '../components/RecommendationCard';
import DebtChart from '../components/DebtChart';
import AuditorTab from '../components/AuditorTab';
import ReportTab from '../components/ReportTab';
import BadgePreview from '../components/BadgePreview';
import TechStackRecs from '../components/TechStackRecs';
import PlugConnectedIcon from '../components/ui/plug-connected-icon';
import ScanBarcodeIcon from '../components/ui/scan-barcode-icon';
import ShieldCheckIcon from '../components/ui/shield-check';
import GearIcon from '../components/ui/gear-icon';
import LogoutIcon from '../components/ui/logout-icon';
import RefreshIcon from '../components/ui/refresh-icon';
import CheckedIcon from '../components/ui/checked-icon';
import {
    Award,
    Sparkles,
} from 'lucide-react';

export default function Dashboard() {
    const { theme, toggleTheme } = useTheme();
    const { user, setUser, logout } = useAuth();
    const [score, setScore] = useState(null);
    const [history, setHistory] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [repos, setRepos] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';
    const [scanMessage, setScanMessage] = useState('');
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const plugRef = useRef(null);
    const pollingStartRef = useRef(null);
    const POLLING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max polling

    const fetchData = async () => {
        try {
            const { getRepositories } = await import('../lib/api');
            const [scoreRes, historyRes, recsRes, reposRes] = await Promise.all([
                getScore(),
                getScoreHistory(),
                getRecommendations(),
                getRepositories(),
            ]);
            setScore(scoreRes.data);
            setHistory(historyRes.data);
            setRecommendations(recsRes.data);
            setRepos(reposRes.data);
            return { repos: reposRes.data };
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Check if an analysis is already in progress on page load
        getAnalysisStatus()
            .then((res) => {
                if (res.data.status === 'pending' || res.data.status === 'analyzing') {
                    setAnalyzing(true);
                    pollingStartRef.current = Date.now();
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (loading || analyzing) {
            plugRef.current?.startAnimation();
        } else {
            plugRef.current?.stopAnimation();
        }
    }, [loading, analyzing]);

    useEffect(() => {
        if (!analyzing) return;
        if (!pollingStartRef.current) {
            pollingStartRef.current = Date.now();
        }
        const interval = setInterval(async () => {
            // Check polling timeout
            const elapsed = Date.now() - pollingStartRef.current;
            if (elapsed > POLLING_TIMEOUT_MS) {
                setAnalyzing(false);
                pollingStartRef.current = null;
                setScanMessage('Analysis timed out. Please try again.');
                // Auto-reset the stuck analysis on the server
                resetAnalysis().catch(() => {});
                fetchData();
                return;
            }
            try {
                const res = await getAnalysisStatus();
                if (res.data.status === 'complete') {
                    setAnalyzing(false);
                    pollingStartRef.current = null;
                    setScanMessage('');
                    fetchData();
                    const { getMe } = await import('../lib/api');
                    const userRes = await getMe();
                    setUser(userRes.data);
                } else if (res.data.status === 'failed') {
                    setAnalyzing(false);
                    pollingStartRef.current = null;
                    setScanMessage('Analysis failed. Please try again.');
                    fetchData();
                }
            } catch (err) {
                console.error(err);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [analyzing, setUser]);

    const handleAnalyze = async () => {
        try {
            setScanMessage('');
            setAnalyzing(true);
            pollingStartRef.current = Date.now();
            await triggerAnalysis();
        } catch (err) {
            if (err.response?.status === 409) {
                // Check if analysis is genuinely in progress
                try {
                    const statusRes = await getAnalysisStatus();
                    if (statusRes.data.status === 'pending' || statusRes.data.status === 'analyzing') {
                        setAnalyzing(true);
                        pollingStartRef.current = Date.now();
                        setScanMessage('Analysis already in progress...');
                    } else {
                        // Status is not actually in progress — might be stale, retry
                        setAnalyzing(false);
                        setScanMessage('Previous analysis may have stalled. Please try again.');
                    }
                } catch {
                    setAnalyzing(false);
                    setScanMessage('Could not verify analysis status.');
                }
            } else if (err.response?.status === 429) {
                setAnalyzing(false);
                pollingStartRef.current = null;
                setScanMessage('Rate limit reached. Please wait a moment.');
            } else {
                setAnalyzing(false);
                pollingStartRef.current = null;
                setScanMessage('Failed to start analysis.');
                console.error(err);
            }
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setLoading(true);
            await deleteAccount();
            logout();
            window.location.href = '/';
        } catch (err) {
            console.error('Account deletion error:', err);
            alert('Deletion failed. Please try again.');
            setLoading(false);
        }
    };

    const hasScore = score && score.last_calculated;

    return (
        <>
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                    <div className="relative text-center animate-premium-fade-in space-y-10">
                        <PlugConnectedIcon
                            ref={plugRef}
                            size={48}
                            color="#3b82f6"
                            className="mx-auto"
                        />
                        <div className="space-y-1">
                            <h2 className="text-[10px] font-black text-ds-text uppercase tracking-[0.4em] animate-pulse">
                                Syncing Feed
                            </h2>
                            <p className="ds-label opacity-70">Establishing secure connection...</p>
                        </div>
                    </div>
                </div>
            ) : (
                <main className="max-w-[1500px] mx-auto w-full px-3 sm:px-4 md:px-6 py-4 md:py-8 flex-1 flex flex-col gap-6 md:gap-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {!hasScore && !analyzing ? (
                                <section className="ds-panel py-32 flex flex-col items-center justify-center text-center space-y-6">
                                    <ScanBarcodeIcon size={40} className="text-ds-muted/40" />
                                    <div className="space-y-2">
                                        <h2 className="text-lg font-black uppercase tracking-tight">
                                            Welcome to DevScore
                                        </h2>
                                        <p className="text-ds-muted text-[11px] max-w-xs mx-auto leading-relaxed">
                                            We need to scan your GitHub account to calculate your first
                                            engineering score.
                                        </p>
                                    </div>
                                    <button onClick={handleAnalyze} className="btn-premium">
                                        Calculate My Score
                                    </button>
                                </section>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                    <div className="lg:col-span-3 space-y-8">
                                        <div className="h-[260px] md:h-[300px]">
                                            <ScoreCard
                                                score={user?.dev_score || 0}
                                                tier={user?.tier || 'Baseline'}
                                            />
                                        </div>
                                        <div className="ds-panel space-y-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <PlugConnectedIcon
                                                        ref={plugRef}
                                                        size={18}
                                                        color={analyzing ? '#3b82f6' : '#10b981'}
                                                        className="opacity-90 transition-colors duration-500"
                                                    />
                                                    <span className="ds-label">Scan Status</span>
                                                </div>
                                                <div
                                                    className={`w-1.5 h-1.5 rounded-full ${analyzing ? 'bg-ds-brand animate-pulse' : 'bg-ds-success'}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-medium text-ds-muted/90 leading-tight">
                                                    {analyzing
                                                        ? 'Scanning your repositories and analyzing your code...'
                                                        : 'Your GitHub data is up to date.'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleAnalyze}
                                                disabled={analyzing}
                                                className="w-full btn-subtle flex items-center justify-center gap-2"
                                            >
                                                <RefreshIcon
                                                    size={12}
                                                    className={analyzing ? 'animate-spin' : ''}
                                                />
                                                {analyzing ? 'Scanning...' : 'Update Score'}
                                            </button>
                                            {scanMessage && (
                                                <div className="p-2 bg-ds-danger/5 border border-ds-danger/20 rounded text-[8px] font-black text-ds-danger uppercase tracking-widest text-center">
                                                    {scanMessage}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="lg:col-span-9 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                                            <div className="ds-panel h-[320px] md:h-[380px] flex flex-col overflow-hidden">
                                                <header className="flex justify-between items-center mb-6">
                                                    <span className="ds-label">Skills Breakdown</span>
                                                    <span className="text-[8px] font-mono text-ds-muted uppercase">
                                                        Radar Chart
                                                    </span>
                                                </header>
                                                <div className="flex-1 min-h-[250px] w-full">
                                                    <RadarChart data={score} />
                                                </div>
                                            </div>
                                            <div className="ds-panel h-[320px] md:h-[380px] flex flex-col overflow-hidden">
                                                <header className="flex justify-between items-center mb-6">
                                                    <span className="ds-label">Repository Health</span>
                                                    <span className="text-[8px] font-mono text-ds-muted uppercase">
                                                        Potential Issues
                                                    </span>
                                                </header>
                                                <div className="flex-1 min-h-[250px] w-full">
                                                    <DebtChart repos={repos} />
                                                </div>
                                            </div>
                                            <div className="ds-panel h-[320px] md:h-[380px] flex flex-col overflow-hidden">
                                                <header className="flex justify-between items-center mb-6">
                                                    <span className="ds-label">Score History</span>
                                                    <span className="text-[8px] font-mono text-ds-muted uppercase">
                                                        Past 6 Months
                                                    </span>
                                                </header>
                                                <div className="flex-1 min-h-[250px] w-full">
                                                    <HistoricalChart data={history} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ds-panel px-0 pb-0 overflow-hidden">
                                            <header className="px-5 mb-4 border-b border-ds-border pb-3">
                                                <span className="ds-label">Score Details</span>
                                            </header>
                                            <ScoreBreakdownTable data={score} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'growth' && (
                        <div className="space-y-8 md:space-y-12 animate-premium-fade-in">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 mt-4 md:mt-6">
                                <div className="lg:col-span-4 space-y-8">
                                    <div className="ds-panel p-6 md:p-8 space-y-8 md:space-y-12 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Award size={100} className="text-ds-accent" />
                                        </div>
                                        <h3 className="ds-label">Your Engineering Journey</h3>
                                        <div className="space-y-8 md:space-y-10 relative px-2">
                                            <div className="absolute left-6 top-2 bottom-2 w-px bg-ds-border/50" />
                                            {[
                                                { tier: 'Principal', status: 'Locked', current: false },
                                                { tier: 'Architect', status: 'Locked', current: false },
                                                { tier: 'Advanced', status: 'Locked', current: false },
                                                { tier: 'Proficient', status: 'Objective', current: user?.tier === 'Baseline' },
                                                { tier: 'Baseline', status: 'Verified', current: user?.tier === 'Baseline' },
                                            ].map((step, i) => (
                                                <div key={i} className={`flex items-center gap-6 relative z-10 ${step.status === 'Locked' ? 'opacity-30' : 'opacity-100'}`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${step.current ? 'bg-ds-brand border-ds-brand shadow-lg shadow-ds-brand/40' : step.status === 'Verified' ? 'bg-ds-success border-ds-success' : 'bg-ds-accent/5 border-ds-border'}`}>
                                                        {step.status === 'Verified' ? <CheckedIcon size={14} color="white" /> : <span className={`text-[10px] font-black ${step.current ? 'text-white' : 'text-ds-text'}`}>{5 - i}</span>}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-black uppercase tracking-wider text-ds-text">{step.tier}</div>
                                                        <div className={`text-[8px] font-bold uppercase tracking-widest ${step.current ? 'text-ds-brand' : 'text-ds-muted'}`}>{step.status}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-8 space-y-8">
                                    <h3 className="ds-label mb-2">Actionable Intelligence</h3>
                                    {recommendations.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {recommendations.map((rec) => (
                                                <RecommendationCard key={rec.id} recommendation={rec} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="ds-panel py-32 md:py-40 text-center border-dashed border-ds-border flex flex-col items-center gap-4">
                                            <Sparkles className="text-ds-muted/20" size={40} />
                                            <h3 className="text-sm font-black text-ds-text uppercase opacity-40">You're all caught up!</h3>
                                        </div>
                                    )}
                                    <TechStackRecs />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'auditor' && <AuditorTab repos={repos} onRefresh={fetchData} />}
                    {activeTab === 'report' && <ReportTab user={user} score={score} history={history} repos={repos} />}
                    
                    {activeTab === 'settings' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-4 space-y-8">
                                <section className="ds-panel space-y-6">
                                    <div className="flex flex-col items-center text-center space-y-4 pb-4">
                                        <img src={user?.avatar_url || 'https://github.com/ghost.png'} className="w-20 h-20 rounded-2xl border-2 border-ds-border" />
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black uppercase tracking-tight text-ds-text">{user?.github_username}</h3>
                                            <p className="text-[10px] text-ds-muted font-bold tracking-widest uppercase">{user?.email}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 md:p-5 rounded-lg bg-ds-accent/5 border border-ds-border flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black uppercase text-ds-text">Interface Mode</p>
                                            <p className="text-[10px] font-medium text-ds-muted capitalize">Current: {theme}</p>
                                        </div>
                                        <button onClick={toggleTheme} className="px-4 py-2 bg-ds-accent text-ds-bg text-[9px] font-black uppercase rounded">Toggle</button>
                                    </div>
                                    <button onClick={logout} className="w-full py-4 bg-ds-bg border border-ds-border hover:border-ds-danger/30 text-ds-muted hover:text-ds-danger text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-3">
                                        <LogoutIcon size={14} /> Sign Out
                                    </button>
                                </section>
                                <BadgePreview username={user?.github_username} score={user?.dev_score} tier={user?.tier} />
                            </div>
                            <div className="lg:col-span-8 space-y-8">
                                <section className="ds-panel space-y-8 border-ds-danger/20">
                                    <div className="flex items-center gap-4">
                                        <ShieldCheckIcon className="text-ds-danger" size={24} />
                                        <div className="space-y-0.5">
                                            <h3 className="text-sm font-black text-ds-text">Account Security</h3>
                                            <span className="ds-label text-ds-danger opacity-70">Danger Zone</span>
                                        </div>
                                    </div>
                                    <div className="p-4 md:p-5 rounded-lg bg-ds-danger/[0.03] border border-ds-danger/10 flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div className="space-y-1 text-center md:text-left">
                                            <p className="text-[11px] font-black uppercase text-ds-text">Delete Account</p>
                                            <p className="text-[10px] font-medium text-ds-muted max-w-xs">Permanently delete your account and all data.</p>
                                        </div>
                                        {!showConfirmDelete ? (
                                            <button onClick={() => setShowConfirmDelete(true)} className="btn-subtle text-ds-danger border-ds-danger/20 hover:bg-ds-danger hover:text-white">Delete</button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button onClick={handleDeleteAccount} className="px-4 py-2 bg-ds-danger text-white text-[9px] font-black uppercase rounded">Confirm</button>
                                                <button onClick={() => setShowConfirmDelete(false)} className="px-4 py-2 bg-ds-accent/5 text-ds-text text-[9px] font-black uppercase rounded border">Cancel</button>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </main>
            )}
        </>
    );
}
