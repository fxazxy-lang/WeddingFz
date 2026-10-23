/**
 * Reduce a phone number to a comparable key so "+855 12 345 678",
 * "012-345-678" and "012345678" all match the same guest.
 * Returns null when there are not enough digits to be meaningful.
 */
export function phoneKey(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('855')) digits = '0' + digits.slice(3);
  if (digits.length >= 8 && !digits.startsWith('0') && digits.length <= 9) digits = '0' + digits;
  return digits.length >= 6 ? digits : null;
}

export const PHONE_PATTERN = /^[+\d][\d\s().-]{5,19}$/;
