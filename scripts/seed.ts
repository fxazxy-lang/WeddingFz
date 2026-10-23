/**
 * Fill the database with sample guests and wishes so you can try the dashboard.
 *   npm run seed           add sample data (only if the database is empty)
 *   npm run clear-sample   remove the sample data again, keeping real replies
 */
import { db } from '../server/db';
import { guestsRepo } from '../server/repositories/guests';
import { wishesRepo } from '../server/repositories/wishes';
import { sampleGuests, sampleWishes } from './sample-data';

const d = await db();
const existing = Number((await d.get<{ n: number }>('SELECT COUNT(*) AS n FROM guests'))?.n ?? 0);
if (existing > 0) {
  console.log(`Database already has ${existing} guests, so no sample data was added.`);
  process.exit(0);
}

const result = await guestsRepo.createMany(sampleGuests);
for (const wish of sampleWishes) await wishesRepo.create(wish);
console.log(`Added ${result.created} sample guests and ${sampleWishes.length} sample wishes.`);
console.log('Remove them any time with: npm run clear-sample');
