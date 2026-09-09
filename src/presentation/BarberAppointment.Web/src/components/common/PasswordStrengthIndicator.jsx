import React from 'react';
import { CheckCircle2, Circle, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { evaluatePassword } from '../../utils/passwordUtils';

export const PasswordStrengthIndicator = ({
  password = '',
  confirmPassword = null,
  showConfirmMatch = false
}) => {
  const { criteria, passedCount, totalCount, isStrong, score, level, color } = evaluatePassword(password);
  const hasInput = Boolean(password && password.length > 0);
  const passwordsMatch = Boolean(hasInput && confirmPassword !== null && password === confirmPassword);
  const confirmTouched = Boolean(confirmPassword !== null && confirmPassword.length > 0);

  return (
    <div
      className="animate-fade-in"
      style={{
        marginTop: '0.6rem',
        padding: '0.75rem 0.85rem',
        background: 'var(--card-nested-bg, rgba(255, 255, 255, 0.03))',
        border: `1px solid ${hasInput ? (isStrong ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle, rgba(255, 255, 255, 0.08))') : 'var(--border-subtle, rgba(255, 255, 255, 0.06))'}`,
        borderRadius: 'var(--radius-md, 8px)',
        fontSize: '0.78rem'
      }}
    >
      {/* Strength Bar & Score Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasInput ? color : 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
          {isStrong ? (
            <ShieldCheck size={14} color="#10b981" />
          ) : (
            <ShieldAlert size={14} color={hasInput ? color : 'var(--text-muted, #94a3b8)'} />
          )}
          <span>Şifre Gücü: {hasInput ? level : 'Belirlenmedi'}</span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
          {passedCount}/{totalCount} Kriter
        </span>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '999px',
          overflow: 'hidden',
          marginBottom: '0.65rem'
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: color,
            transition: 'width 0.25s ease, background-color 0.25s ease'
          }}
        />
      </div>

      {/* Checklist Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.35rem 0.6rem'
        }}
      >
        {criteria.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: c.met ? '#10b981' : 'var(--text-muted, #94a3b8)',
              fontWeight: c.met ? 500 : 400,
              transition: 'color 0.2s ease'
            }}
          >
            {c.met ? (
              <CheckCircle2 size={13} color="#10b981" style={{ flexShrink: 0 }} />
            ) : (
              <Circle size={13} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />
            )}
            <span>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Confirmation Match Check */}
      {showConfirmMatch && confirmTouched && (
        <div
          style={{
            marginTop: '0.5rem',
            paddingTop: '0.45rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: passwordsMatch ? '#10b981' : '#ef4444',
            fontWeight: 500
          }}
        >
          {passwordsMatch ? (
            <>
              <CheckCircle2 size={13} color="#10b981" />
              <span>Şifreler eşleşiyor</span>
            </>
          ) : (
            <>
              <XCircle size={13} color="#ef4444" />
              <span>Şifreler henüz eşleşmiyor</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

