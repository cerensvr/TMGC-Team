const DATE_ONLY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_ONLY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Ürün formu SKT'yi YYYY-AA olarak aldığı için ayın tamamını geçerli kabul eder.
 * API'den tam tarih gelirse o günün sonunu kullanır.
 */
export const parseExpiryDate = (dateString?: string): Date | null => {
  if (!dateString) return null;

  const monthMatch = MONTH_ONLY_PATTERN.exec(dateString);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    return new Date(year, month, 0, 23, 59, 59, 999);
  }

  const dateMatch = DATE_ONLY_PATTERN.exec(dateString);
  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const monthIndex = Number(dateMatch[2]) - 1;
    const day = Number(dateMatch[3]);
    const parsed = new Date(year, monthIndex, day, 23, 59, 59, 999);

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== monthIndex ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return parsed;
  }

  const fallback = new Date(dateString);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const getRemainingDays = (dateString?: string, now = new Date()): number | null => {
  const expiry = parseExpiryDate(dateString);
  if (!expiry) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  return Math.round((expiryDay.getTime() - today.getTime()) / DAY_IN_MS);
};

export const getExpiryTimestamp = (dateString?: string) =>
  parseExpiryDate(dateString)?.getTime() ?? Number.POSITIVE_INFINITY;
