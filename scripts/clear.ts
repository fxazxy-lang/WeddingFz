/**
 * Remove data from the database.
 *   npm run clear-sample   remove only the sample guests and wishes added by `npm run seed`
 *   npm run clear-all      remove EVERY guest and wish (asks you to confirm)
 *
 * Safe to run while the website is running.
 */
import { createInterface } from 'node:readline/promises';
import { db } from '../server/db';
import { sampleGuests, sampleWishes } from './sample-data';

const d = await db();
const count = async (table: 'guests' | 'wishes') => Number((await d.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))?.n ?? 0);
const all = process.argv.includes('--all');

if (all) {
  const guests = await count('guests');
  const wishes = await count('wishes');
  if (!process.argv.includes('--yes')) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      `This permanently deletes ALL ${guests} guests and ${wishes} wishes, including real replies. Type DELETE to continue: `,
    );
    rl.close();
    if (answer.trim() !== 'DELETE') {
      console.log('Nothing was deleted.');
      process.exit(0);
    }
  }
  await d.transaction(async (tx) => {
    await tx.run('DELETE FROM wishes');
    await tx.run('DELETE FROM guests');
  });
  console.log(`Deleted ${guests} guests and ${wishes} wishes.`);
  process.exit(0);
}

// Only rows that match the sample data exactly (same name and phone / same name and message).
const result = await d.transaction(async (tx) => {
  let guests = 0;
  let wishes = 0;
  for (const g of sampleGuests)
    guests += (await tx.run("DELETE FROM guests WHERE name = ? AND phone = ? AND source = 'admin'", [g.name, g.phone])).changes;
  for (const w of sampleWishes) wishes += (await tx.run('DELETE FROM wishes WHERE name = ? AND message = ?', [w.name, w.message])).changes;
  return { guests, wishes };
});

const left = await count('guests');
console.log(`Removed ${result.guests} sample guests and ${result.wishes} sample wishes. ${left} real guests kept.`);
