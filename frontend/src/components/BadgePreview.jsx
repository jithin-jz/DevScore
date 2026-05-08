import { useState } from 'react';
import CopyIcon from './ui/copy-icon';

export default function BadgePreview({ username, score = 0, tier = 'Baseline' }) {
    const [copied, setCopied] = useState('');
    const apiBase = import.meta.env.VITE_API_BASE || window.location.origin;
    const badgeUrl = `${apiBase}/badge/${username}.svg`;
    const profileUrl = window.location.origin;

    const brandName = 'DevScore';
    const markdownCode = `[![${brandName}](${badgeUrl})](${profileUrl})`;
    const htmlCode = `<a href="${profileUrl}"><img src="${badgeUrl}" alt="${brandName}" /></a>`;

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(''), 2000);
    };

    const score_text = String(Math.round(score || 0));
    const label_width = 75;
    const score_width = 85;
    const total_width = label_width + score_width;

    return (
        <div className="ds-panel space-y-6">
            <h2 className="ds-label mb-2 block">Authenticity Badge</h2>

            <div className="py-10 px-6 rounded-xl bg-black/10 dark:bg-black/40 border border-ds-border border-dashed flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-ds-accent/[0.02] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={total_width}
                    height="28"
                    viewBox={`0 0 ${total_width} 28`}
                    fill="none"
                    role="img"
                    aria-label={`DevScore: ${score_text} · ${tier}`}
                    className="relative transition-transform duration-500 hover:scale-110 z-10"
                >
                    <title>{`DevScore: ${score_text} · ${tier}`}</title>
                    <rect width={total_width} height="28" rx="4" fill="#09090B" />
                    <rect x={label_width} width={score_width} height="28" fill="#27272A" />
                    <rect width={total_width} height="28" rx="4" stroke="#3F3F46" />
                    <line x1={label_width} y1="0" x2={label_width} y2="28" stroke="#3F3F46" />
                    <text
                        x={label_width / 2}
                        y="18"
                        textAnchor="middle"
                        style={{
                            fontFamily:
                                '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                            fontSize: '11px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fill: '#A1A1AA',
                        }}
                    >
                        DevScore
                    </text>
                    <text
                        x={label_width + score_width / 2}
                        y="19"
                        textAnchor="middle"
                        style={{
                            fontFamily:
                                '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                            fontSize: '12px',
                            fontWeight: '700',
                            fill: '#FFFFFF',
                        }}
                    >
                        {score_text} • {tier}
                    </text>
                </svg>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    onClick={() => handleCopy(markdownCode, 'md')}
                    className="btn-subtle py-2.5 flex items-center justify-center gap-2 border-ds-border"
                >
                    {copied === 'md' ? '✅' : <CopyIcon size={14} color="currentColor" />}
                    {copied === 'md' ? 'Copied' : 'Markdown'}
                </button>
                <button
                    onClick={() => handleCopy(htmlCode, 'html')}
                    className="btn-subtle py-2.5 flex items-center justify-center gap-2 border-ds-border"
                >
                    {copied === 'html' ? '✅' : <CopyIcon size={14} color="currentColor" />}
                    {copied === 'html' ? 'Copied' : 'HTML Code'}
                </button>
            </div>
        </div>
    );
}
