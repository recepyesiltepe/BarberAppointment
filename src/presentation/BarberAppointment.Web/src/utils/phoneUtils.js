/**
 * Türkiye cep telefonu numarası doğrulama, canlı biçimlendirme ve normalizasyon yardımcıları.
 * Standart Türkiye mobil formatı: 05XX XXX XX XX (11 hane, 05 ile başlar).
 */

/**
 * Verilen metindeki tüm rakamları ayıklar.
 */
export const cleanPhoneDigits = (value) => {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
};

/**
 * Kullanıcı giriş yaparken Türkiye cep telefonu formatına göre (05XX XXX XX XX)
 * canlı maskeleme ve biçimlendirme uygular.
 * 
 * Örnek: "5551234567" -> "0555 123 45 67"
 *        "05551234567" -> "0555 123 45 67"
 */
export const formatTurkishPhone = (value) => {
  if (!value) return '';

  let digits = cleanPhoneDigits(value);

  // +90 ile başlarsa 90'ı kaldır
  if (digits.startsWith('90') && digits.length > 2) {
    digits = digits.slice(2);
  }

  // İlk rakam 5 ise otomatik olarak başına 0 ekle (kullanıcı kolaylığı)
  if (digits.startsWith('5')) {
    digits = '0' + digits;
  }

  // Maksimum 11 hane (05XXXXXXXXX)
  if (digits.length > 11) {
    digits = digits.slice(0, 11);
  }

  // 05XX XXX XX XX formatı
  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 7) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
};

/**
 * Verilen telefon numarasının geçerli bir Türkiye cep telefonu olup olmadığını denetler.
 * Kural: Rakamlar ayıklandığında (+90 ve 0 temizlendikten sonra) 10 haneli olmalı ve '5' ile başlamalıdır.
 */
export const isValidTurkishPhone = (value) => {
  if (!value) return false;

  let digits = cleanPhoneDigits(value);

  if (digits.startsWith('90') && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  return digits.length === 10 && digits.startsWith('5');
};

/**
 * Backend'e gönderilmek üzere numarayı standart 11 haneli '05XXXXXXXXX' biçimine dönüştürür.
 */
export const normalizeTurkishPhone = (value) => {
  if (!value) return '';

  let digits = cleanPhoneDigits(value);

  if (digits.startsWith('90') && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  return digits.length === 10 && digits.startsWith('5') ? '0' + digits : cleanPhoneDigits(value);
};

