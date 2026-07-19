// ratio <= 0.25 Low, <= 0.6 Medium, <= 0.8 High, else Extreme
export default function scoreBadge(likelihood, impact) {
    const score = (likelihood || 0) * (impact || 0);
    const ratio = score / 25;
    let level = 'extreme';
    if (ratio <= 0.25) level = 'low';
    else if (ratio <= 0.6) level = 'medium';
    else if (ratio <= 0.8) level = 'high';
    return { score, label: level.charAt(0).toUpperCase() + level.slice(1), className: `badge-${level}` };
}
