import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getAdminStats, adminDeleteUser, adminGetUserProfile } from '../lib/api';
import { Shield, Users, Activity, Target, Trash2, Eye, X } from 'lucide-react';
import ScoreCard from '../components/ScoreCard';
import ScoreBreakdownTable from '../components/ScoreBreakdownTable';

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewingUser, setViewingUser] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await getAdminStats();
                setStats(res.data);
            } catch (err) {
                console.error('Failed to fetch admin stats:', err);
                if (err.response?.status === 403 || err.response?.status === 401) {
                    window.location.href = '/admin';
                }
            } finally {
                setLoading(false);
            }
        };

        if (user?.is_admin) {
            fetchStats();
        } else {
            window.location.href = '/admin';
        }
    }, [user]);

    const handleDeleteUser = async (userId, githubUsername) => {
        if (!window.confirm(`Are you sure you want to permanently delete user ${githubUsername}?`))
            return;

        try {
            await adminDeleteUser(userId);
            const res = await getAdminStats();
            setStats(res.data);
        } catch (err) {
            console.error('Failed to delete user:', err);
            alert(err.response?.data?.error || 'Failed to delete user.');
        }
    };

    const handleViewUser = async (userId) => {
        setViewLoading(true);
        try {
            const res = await adminGetUserProfile(userId);
            setViewingUser(res.data);
        } catch (err) {
            console.error('Failed to view user:', err);
            alert('Failed to load user details.');
        } finally {
            setViewLoading(false);
        }
    };

    return (
        <>
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-10 h-10 border-2 border-white/5 border-t-ds-brand rounded-full animate-spin mx-auto" />
                </div>
            ) : (
                <main className="max-w-[1500px] mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="ds-panel flex flex-col gap-4">
                            <div className="flex items-center justify-between opacity-50">
                                <span className="ds-label">Total Users</span>
                                <Users size={16} />
                            </div>
                            <div className="text-4xl font-black text-white">
                                {stats?.total_users || 0}
                            </div>
                        </div>

                        <div className="ds-panel flex flex-col gap-4">
                            <div className="flex items-center justify-between opacity-50">
                                <span className="ds-label">Avg Platform Score</span>
                                <Target size={16} />
                            </div>
                            <div className="text-4xl font-black text-ds-brand">
                                {stats?.avg_score || 0}
                            </div>
                        </div>

                        <div className="ds-panel flex flex-col gap-4">
                            <div className="flex items-center justify-between opacity-50">
                                <span className="ds-label">Total Scans Conducted</span>
                                <Activity size={16} />
                            </div>
                            <div className="text-4xl font-black text-white">
                                {stats?.total_analyses || 0}
                            </div>
                        </div>
                    </div>

                    <div className="ds-panel border-white/5 overflow-hidden p-0 mt-4">
                        <header className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-black/50">
                            <span className="ds-label">Recent User Profiles</span>
                        </header>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-ds-muted">
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Current Tier</th>
                                        <th className="px-6 py-4">DevScore</th>
                                        <th className="px-6 py-4">Analysis Status</th>
                                        <th className="px-6 py-4">Joined</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats?.recent_users?.map((u) => (
                                        <tr
                                            key={u.id}
                                            className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={
                                                            u.avatar_url ||
                                                            'https://github.com/ghost.png'
                                                        }
                                                        className="w-8 h-8 rounded border border-white/10"
                                                    />
                                                    <span className="font-bold text-[12px] text-white uppercase tracking-tight">
                                                        {u.github_username}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] text-ds-muted font-mono">
                                                {u.email}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[9px] font-black uppercase text-ds-brand bg-ds-brand/10 px-2 py-1 rounded border border-ds-brand/20">
                                                    {u.tier}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-black text-[14px] text-white">
                                                {Math.round(u.dev_score || 0)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${u.analysis_status === 'complete' ? 'text-ds-success border-ds-success/20' : 'text-ds-muted border-white/10'}`}
                                                >
                                                    {u.analysis_status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] text-ds-muted font-mono">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewUser(u.id)}
                                                        className="p-2 bg-white/5 rounded"
                                                    >
                                                        <Eye size={12} />
                                                    </button>
                                                    {!u.is_admin && (
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteUser(
                                                                    u.id,
                                                                    u.github_username
                                                                )
                                                            }
                                                            className="p-2 bg-ds-danger/10 text-ds-danger rounded"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            )}

            {viewingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="ds-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-premium-fade-in">
                        <button
                            onClick={() => setViewingUser(null)}
                            className="absolute top-6 right-6 p-2 bg-white/5 rounded hover:bg-white/10 transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <div className="space-y-8">
                            <header className="flex items-start gap-6 pb-6 border-b border-white/5">
                                <img
                                    src={
                                        viewingUser.profile.avatar_url ||
                                        'https://github.com/ghost.png'
                                    }
                                    className="w-20 h-20 rounded-xl border border-white/10"
                                />
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                                        {viewingUser.profile.github_username}
                                    </h2>
                                    <p className="text-[11px] text-ds-muted font-mono">
                                        {viewingUser.profile.email}
                                    </p>
                                </div>
                            </header>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-6">
                                    <h3 className="ds-label">Score Profile</h3>
                                    {viewingUser.score ? (
                                        <div className="bg-black/50 p-6 rounded-xl border border-white/5">
                                            <ScoreBreakdownTable data={viewingUser.score} />
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-ds-muted uppercase">
                                            No data.
                                        </p>
                                    )}
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
