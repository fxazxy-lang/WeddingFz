import { DIETARY_LABELS, SIDE_LABELS, STATUS_LABELS, type Dietary } from '../../shared/constants';
import type { Guest } from '../../shared/types';
import type { Cell } from './csv';
import type { SheetSpec } from './xlsx';

const dietLabel = (g: Guest) =>
  g.dietary === 'none' ? '' : g.dietaryNote ? `${DIETARY_LABELS[g.dietary]} (${g.dietaryNote})` : DIETARY_LABELS[g.dietary];

const formatDate = (iso: string | null) => (iso ? iso.slice(0, 16).replace('T', ' ') + ' UTC' : '');

export const GUEST_COLUMNS = [
  { header: 'Guest name', width: 30 },
  { header: 'Side', width: 10 },
  { header: 'Phone', width: 16 },
  { header: 'Status', width: 12 },
  { header: 'Pax', width: 7 },
  { header: 'Table', width: 9 },
  { header: 'Dietary', width: 26 },
  { header: 'Notes', width: 30 },
  { header: 'Responded', width: 20 },
];

export function guestRows(guests: Guest[]): Cell[][] {
  return guests.map((g) => [
    g.name,
    SIDE_LABELS[g.side],
    g.phone,
    STATUS_LABELS[g.status],
    g.pax,
    g.tableNumber,
    dietLabel(g),
    g.notes,
    formatDate(g.respondedAt),
  ]);
}

const tableSort = (a: string, b: string) => {
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, undefined, { numeric: true });
};

/** Workbook for catering and seating: full list, seating plan, per-table totals. */
export function guestWorkbook(guests: Guest[]): SheetSpec[] {
  const confirmed = guests
    .filter((g) => g.status === 'confirmed')
    .sort((a, b) => tableSort(a.tableNumber, b.tableNumber) || a.name.localeCompare(b.name));

  const tables = new Map<string, { parties: number; pax: number; diets: Map<Dietary, number> }>();
  for (const g of confirmed) {
    const key = g.tableNumber || 'Unassigned';
    const entry = tables.get(key) ?? { parties: 0, pax: 0, diets: new Map() };
    entry.parties += 1;
    entry.pax += g.pax;
    if (g.dietary !== 'none') entry.diets.set(g.dietary, (entry.diets.get(g.dietary) ?? 0) + g.pax);
    tables.set(key, entry);
  }
  const tableRows: Cell[][] = [...tables.entries()]
    .sort(([a], [b]) => tableSort(a === 'Unassigned' ? '' : a, b === 'Unassigned' ? '' : b))
    .map(([table, t]) => [
      table,
      t.parties,
      t.pax,
      [...t.diets.entries()].map(([d, n]) => `${DIETARY_LABELS[d]} × ${n}`).join(', '),
    ]);
  const totalPax = confirmed.reduce((sum, g) => sum + g.pax, 0);
  tableRows.push(['Total', confirmed.length, totalPax, '']);

  return [
    { name: 'Guest list', columns: GUEST_COLUMNS, rows: guestRows(guests) },
    {
      name: 'Seating (confirmed)',
      columns: [
        { header: 'Table', width: 9 },
        { header: 'Guest name', width: 30 },
        { header: 'Side', width: 10 },
        { header: 'Pax', width: 7 },
        { header: 'Dietary', width: 26 },
        { header: 'Phone', width: 16 },
      ],
      rows: confirmed.map((g) => [g.tableNumber || 'Unassigned', g.name, SIDE_LABELS[g.side], g.pax, dietLabel(g), g.phone]),
    },
    {
      name: 'Catering by table',
      columns: [
        { header: 'Table', width: 12 },
        { header: 'Parties', width: 10 },
        { header: 'Pax', width: 8 },
        { header: 'Special diets (pax)', width: 40 },
      ],
      rows: tableRows,
    },
  ];
}
