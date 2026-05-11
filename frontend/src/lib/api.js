import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('devscore_token');
    if (token) {
        config.headers.Authorization = `Token ${token}`;
    }
    return config;
});

// Handle 401 — redirect to home/login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('devscore_token');
            localStorage.removeItem('devscore_user');
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

// Auth
export const loginWithGitHub = (code) => api.post('/auth/github/login/', { code });

// User
export const getMe = () => api.get('/api/me/');
export const deleteAccount = () => api.delete('/api/delete-account/');

// Leaderboard
export const getLeaderboard = () => api.get('/api/leaderboard/');

// Analysis
export const getAnalysisStatus = () => api.get('/api/analysis/status/');
export const resetAnalysis = () => api.post('/api/analysis/reset/');

// Score
export const getScore = () => api.get('/api/score/');
export const getScoreHistory = () => api.get('/api/score/history/');
export const triggerAnalysis = () => api.post('/api/analyze/');

// Auditor API
export const getRepositories = () => api.get('/api/github/repositories/');
export const auditRepository = (repoId) => api.post(`/api/github/repositories/${repoId}/audit/`);

// Recommendations
export const getRecommendations = () => api.get('/api/recs/');
export const getTechRecommendations = () => api.get('/api/recs/tech/');
export const dismissTechRecommendation = (id) => api.post(`/api/recs/tech/dismiss/${id}/`);
export const regenerateTechRecommendations = () => api.post('/api/recs/tech/regenerate/');

// Admin
export const adminLogin = (username, password) =>
    api.post('/api/admin/login/', { username, password });
export const getAdminStats = () => api.get('/api/admin/stats/');
export const adminDeleteUser = (userId) => api.delete(`/api/admin/users/${userId}/`);
export const adminGetUserProfile = (userId) => api.get(`/api/admin/users/${userId}/`);

// Star Feed (public — no auth needed, uses axios without token interceptor for anon calls)
export const getStarFeed = (seenIds = []) => {
    const params = seenIds.length ? `?seen_ids=${seenIds.join(',')}` : '';
    return api.get(`/api/github/stars/feed/${params}`);
};
export const recordStarClick = (pinnedRepoId, sessionId) =>
    api.post(`/api/github/stars/click/${pinnedRepoId}/`, { session_id: sessionId });

// Pinned Repos (auth required)
export const getPinnedRepos = () => api.get('/api/github/stars/pins/');
export const pinRepo = (repositoryId) =>
    api.post('/api/github/stars/pins/', { repository_id: repositoryId });
export const unpinRepo = (pinId) => api.delete(`/api/github/stars/pins/${pinId}/`);

export default api;
