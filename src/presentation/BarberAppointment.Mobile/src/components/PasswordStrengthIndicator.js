import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { evaluatePassword } from '../utils/passwordUtils';
import { useTheme } from '../context/ThemeContext';

export const PasswordStrengthIndicator = ({
  password = '',
  confirmPassword = null,
  showConfirmMatch = false
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { criteria, passedCount, totalCount, isStrong, score, level, color } = evaluatePassword(password);
  const hasInput = Boolean(password && password.length > 0);
  const passwordsMatch = Boolean(hasInput && confirmPassword !== null && password === confirmPassword);
  const confirmTouched = Boolean(confirmPassword !== null && confirmPassword.length > 0);

  if (!hasInput && !confirmTouched) {
    return null;
  }

  return (
    <View style={[styles.container, isStrong && styles.containerStrong]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.strengthLabel, { color: hasInput ? color : colors.textMuted }]}>
          {isStrong ? '🛡️ ' : '⚠️ '}Şifre Gücü: {hasInput ? level : 'Belirlenmedi'}
        </Text>
        <Text style={styles.criteriaCounter}>
          {passedCount}/{totalCount} Kriter
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBackground}>
        <View style={[styles.progressBar, { width: `${score}%`, backgroundColor: color }]} />
      </View>

      {/* Checklist */}
      <View style={styles.criteriaList}>
        {criteria.map((item) => (
          <View key={item.id} style={styles.criteriaRow}>
            <Text style={[styles.criteriaIcon, { color: item.met ? '#10b981' : colors.textMuted }]}>
              {item.met ? '✓' : '○'}
            </Text>
            <Text
              style={[
                styles.criteriaText,
                {
                  color: item.met ? colors.textPrimary : colors.textMuted,
                  fontWeight: item.met ? '600' : '400'
                }
              ]}
            >
              {item.label}
            </Text>
          </View>
        ))}

        {showConfirmMatch && confirmTouched && (
          <View style={[styles.criteriaRow, styles.matchRow]}>
            <Text style={[styles.criteriaIcon, { color: passwordsMatch ? '#10b981' : '#ef4444' }]}>
              {passwordsMatch ? '✓' : '✕'}
            </Text>
            <Text
              style={[
                styles.criteriaText,
                {
                  color: passwordsMatch ? '#10b981' : '#ef4444',
                  fontWeight: '600'
                }
              ]}
            >
              {passwordsMatch ? 'Şifreler eşleşiyor' : 'Şifreler eşleşmiyor'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgInput,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
      marginTop: 2
    },
    containerStrong: {
      borderColor: 'rgba(16, 185, 129, 0.4)'
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8
    },
    strengthLabel: {
      fontSize: 12,
      fontWeight: '700'
    },
    criteriaCounter: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600'
    },
    progressBackground: {
      height: 4,
      backgroundColor: 'rgba(128, 128, 128, 0.2)',
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 10
    },
    progressBar: {
      height: 4,
      borderRadius: 2
    },
    criteriaList: {
      gap: 4
    },
    criteriaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
    },
    criteriaIcon: {
      fontSize: 12,
      fontWeight: '800',
      width: 14,
      textAlign: 'center'
    },
    criteriaText: {
      fontSize: 12
    },
    matchRow: {
      marginTop: 4,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.border
    }
  });

