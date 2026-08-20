import React from 'react';

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
