/**
 * Password validation rules and security utilities.
 * Enforces strong passwords across all forms in the application.
 */

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: 'En az 8 karakter',
    test: (pw) => Boolean(pw && pw.length >= 8)
  },
  {
    id: 'upper',
    label: 'En az 1 büyük harf (A-Z)',
    test: (pw) => Boolean(pw && /[A-Z]/.test(pw))
  },
  {
    id: 'lower',
    label: 'En az 1 küçük harf (a-z)',
    test: (pw) => Boolean(pw && /[a-z]/.test(pw))
  },
  {
    id: 'number',
    label: 'En az 1 rakam (0-9)',
    test: (pw) => Boolean(pw && /[0-9]/.test(pw))
  },
  {
    id: 'special',
    label: 'En az 1 özel karakter (!@#$%^&* vb.)',
    test: (pw) => Boolean(pw && /[^A-Za-z0-9]/.test(pw))
  }
];

/**
 * Returns evaluation of all criteria for a given password string.
 */
export const evaluatePassword = (password = '') => {
  const criteria = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password)
  }));

  const passedCount = criteria.filter((c) => c.met).length;
  const isStrong = passedCount === PASSWORD_RULES.length;

  // Strength score: 0 to 100
  let score = Math.round((passedCount / PASSWORD_RULES.length) * 100);

  // Strength label & color
  let level = 'Zayıf';
  let color = '#ef4444'; // red

  if (passedCount >= 5) {
    level = 'Güçlü';
    color = '#10b981'; // green
  } else if (passedCount >= 3) {
    level = 'Orta';
    color = '#f59e0b'; // amber
  }

  return {
    criteria,
    passedCount,
    totalCount: PASSWORD_RULES.length,
    isStrong,
    score,
    level,
    color
  };
};

/**
 * Helper to simply check if password is valid/strong.
 */
export const isStrongPassword = (password) => {
  return evaluatePassword(password).isStrong;
};

