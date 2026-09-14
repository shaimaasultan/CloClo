import type { Caller } from '../i18n/dictionaries';

// Does the contact match a search? Names by substring, numbers by digits
// (so "0122 356" and "0122356" both find Omar). An empty search matches all.
export function contactMatches(contact: Caller, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  return contact.name.toLowerCase().includes(q) || (digits.length > 0 && contact.number.replace(/\D/g, '').includes(digits));
}
