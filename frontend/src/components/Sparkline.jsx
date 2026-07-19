// Minimal inline sparkline -- avoids pulling in a charting library for a
// single line. Renders the last N measurements as a simple polyline.
export default function Sparkline({ history }) {
    if (!history || history.length < 2) {
        return <span className="text-muted">Not enough data yet</span>;
    }
    const values = history.map((h) => Number(h.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 120;
    const height = 32;
    const points = values
        .map((v, i) => {
            const x = (i / (values.length - 1)) * width;
            const y = height - ((v - min) / range) * height;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
        </svg>
    );
}

export function bandBadgeClass(band) {
    if (band === 'Green') return 'badge-low';
    if (band === 'Amber') return 'badge-medium';
    if (band === 'Red') return 'badge-extreme';
    return 'badge-role';
}
