import React from 'react';
import { WEIGHT_CLASS_MAP } from '../game/constants';

export function Panel({ title, children, className = '', right }) {
  return (
    <div className={`fe-panel ${className}`}>
      {title && (
        <div className="fe-panel-header">
          <span>{title}</span>
          {right}
        </div>
      )}
      <div className="fe-panel-body">{children}</div>
    </div>
  );
}

export function Button({ children, variant = 'primary', onClick, disabled, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      className={`fe-btn fe-btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function WeightPill({ id }) {
  return <span className={`fe-weight-pill fe-wc-${id}`}>{id}</span>;
}

export function Flag({ nationality }) {
  if (!nationality) return null;
  return <span className="fe-flag" title={nationality.name}>{nationality.flag}</span>;
}

const NEWS_ICONS = {
  welcome: '🎬',
  signing: '✍️',
  poached: '🔁',
  rival: '📰',
  fight: '🥊',
  injury: '🏥',
  title: '🏆',
  trending: '📈',
};

export function NewsCategoryIcon({ category }) {
  return <span className="fe-news-icon">{NEWS_ICONS[category] || '📰'}</span>;
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isLightColor(hex) {
  if (!hex) return false;
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // perceived luminance
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export function formatFollowers(n = 0) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${n}`;
}

export function Followers({ count }) {
  return (
    <span className="fe-followers" title={`${(count || 0).toLocaleString()} followers`}>
      <span className="fe-followers-icon">👥</span>{formatFollowers(count || 0)}
    </span>
  );
}

export function Avatar({ fighter, size = 30, champion = false }) {
  if (!fighter) return null;
  const wc = WEIGHT_CLASS_MAP[fighter.weightClass];
  const bg = wc?.color || '#3a4050';
  const dark = isLightColor(bg);
  return (
    <span
      className={`fe-avatar ${champion ? 'fe-avatar-champion' : ''}`}
      style={{ background: bg, color: dark ? '#0b0c0f' : '#fff', width: size, height: size, fontSize: Math.round(size * 0.4) }}
      title={fighter.name}
    >
      {initials(fighter.name)}
    </span>
  );
}
