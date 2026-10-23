/**
 * Everything about the wedding that you are likely to edit lives here.
 * Text that appears in both languages uses { en, km }.
 * Longer copy (story, schedule descriptions) lives in src/i18n/*.ts.
 *
 * All times are in Cambodia time (UTC+07:00).
 * Photos live in the project's /photo folder and are served at /photo/<file>.
 */
export type Localized = { en: string; km: string };

export type ScheduleItemId = 'krongPeali' | 'monks' | 'procession' | 'haircut' | 'blessing' | 'banquet';

export interface ScheduleItem {
  id: ScheduleItemId;
  /** ISO time with offset, e.g. 2026-12-27T07:00:00+07:00 */
  start: string;
  /** Used for "Add to Calendar"; defaults to two hours after start. */
  end?: string;
}

/** A block of events at one venue, shown as one card. Titles live in src/i18n under schedule.sessions. */
export interface ScheduleSession {
  id: 'gathering' | 'monks' | 'morning' | 'evening';
  venue: 'residence' | 'reception';
  items: ScheduleItem[];
}

/** One tab in the day switcher. Labels live in src/i18n under schedule.days. */
export interface ScheduleDay {
  id: 'day1' | 'day2' | 'day3';
  /** Any time on that day, used for the tab's date label. */
  date: string;
  sessions: ScheduleSession[];
}

export interface Venue {
  name: Localized;
  address: Localized;
  /** Link opened by "Open in Google Maps". */
  mapUrl: string;
  /** Optional coordinates; used to embed a Google Map when there is no mapImage. */
  coordinates?: { lat: number; lng: number };
  /** Optional illustrated map shown instead of the Google Map embed. Clicking it opens mapUrl. */
  mapImage?: {
    src: string;
    /** Smaller copy for phones and normal screens; the full-size src is used on large, sharp screens. */
    webSrc?: string;
    width: number;
    height: number;
    alt: Localized;
  };
}

export interface Photo {
  src: string;
  alt: Localized;
}

export interface GiftAccount {
  id: string;
  title: Localized;
  bank: string;
  accountName: string;
  /** One or more account numbers, e.g. KHR and USD. */
  accounts: { currency: string; number: string }[];
  /** Path to the QR image, e.g. "/photo/QR1.jpg". Leave null to show a placeholder. */
  qrImage: string | null;
}

const TA_KHMAU_MAP_URL =
  'https://www.google.com/maps/place/Ta+Khmau/@11.4565506,104.9054716,13z/data=!3m1!4b1!4m14!1m7!3m6!1s0x3109532931ed88a1:0xa1094f5df89be45d!2sOCIC+Wedding+Hall!8m2!3d11.6096095!4d104.9247467!16s%2Fg%2F11kprmg0fk!3m5!1s0x3109599384325cdd:0xe25c308bc6822c0a!8m2!3d11.4813078!4d104.9449088!16zL20vMGd5c2Ry!5m1!1e4?entry=ttu&g_ep=EgoyMDI2MTAxOC4wIKXMDSoASAFQAw%3D%3D';

const OCIC_MAP_URL =
  'https://www.google.com/maps/place/OCIC+Wedding+Hall/@11.6096095,104.9247467,17z/data=!3m1!4b1!4m6!3m5!1s0x3109532931ed88a1:0xa1094f5df89be45d!8m2!3d11.6096095!4d104.9247467!16s%2Fg%2F11kprmg0fk';

export const wedding = {
  couple: {
    groom: { en: 'Yin Tango', km: 'យិន តាំងអូ', firstName: { en: 'Tango', km: 'តាំងអូ' } },
    bride: { en: 'Sro Rothanakpanha', km: 'ស្រូ រតនៈបញ្ញា', firstName: { en: 'Rothanakpanha', km: 'រតនៈបញ្ញា' } },
    monogram: 'T & R',
  },

  /** The main wedding day (Day 3). Used for calendar IDs. */
  date: '2035-11-18T07:00:00+07:00',

  /** Date text shown in the hero. `full` is the line under the names (and the footer); `short` is the Save The Date badge. */
  dateDisplay: {
    full: { en: 'November 16 – 18, 2035', km: 'ថ្ងៃទី ១៦ - ១៧ - ១៨ ខែវិច្ឆិកា ឆ្នាំ ២០៣៥' } as Localized,
    short: { en: 'November 16 – 18, 2035', km: 'ថ្ងៃទី ១៦-១៨ ខែវិច្ឆិកា ឆ្នាំ ២០៣៥' } as Localized,
  },

  /**
   * Hero banner under the date:
   * 'save-the-date' shows the "Save The Date • …" badge;
   * 'countdown' shows the live clock ticking down to `countdownTarget` (start of Day 1).
   */
  heroBanner: 'save-the-date' as 'save-the-date' | 'countdown',
  countdownTarget: '2035-11-16T00:00:00+07:00',
  rsvpDeadline: '2026-12-13T23:59:00+07:00',
  timeZone: 'Asia/Phnom_Penh',

  photos: {
    hero: {
      src: '/photo/WEDDING2.jpg',
      alt: { en: 'Tango and Rothanakpanha in their wedding attire', km: 'តាំងអូ និង រតនៈបញ្ញា ក្នុងសម្លៀកបំពាក់មង្គលការ' },
    } as Photo,
    story: {
      src: '/photo/WEDDING1.jpg',
      alt: { en: 'Tango kissing Rothanakpanha on the forehead', km: 'តាំងអូ ថើបថ្ងាស រតនៈបញ្ញា' },
    } as Photo,
  },

  venues: {
    residence: {
      name: { en: "Bride's Residence, Ta Khmau", km: 'គេហដ្ឋានខាងកូនក្រមុំ - ក្រុងតាខ្មៅ' },
      address: { en: 'Ta Khmau, Kandal Province, Cambodia', km: 'ក្រុងតាខ្មៅ ខេត្តកណ្ដាល ព្រះរាជាណាចក្រកម្ពុជា' },
      mapUrl: TA_KHMAU_MAP_URL,
    } as Venue,
    reception: {
      name: { en: 'OCIC Wedding Hall', km: 'មណ្ឌលសន្និបាត និងពិព័រណ៍ OCIC' },
      address: { en: 'Chroy Changvar, Phnom Penh, Cambodia', km: 'ខណ្ឌជ្រោយចង្វារ រាជធានីភ្នំពេញ ព្រះរាជាណាចក្រកម្ពុជា' },
      mapUrl: OCIC_MAP_URL,
      coordinates: { lat: 11.6096095, lng: 104.9247467 },
      mapImage: {
        src: '/photo/photo1.jpg',
        webSrc: '/photo/photo1-web.jpg',
        width: 2752,
        height: 1536,
        alt: {
          en: 'Illustrated map: Chroy Changvar Bridge, the roundabout, National Road 6 and OCIC Wedding Hall',
          km: 'ផែនទីគំនូរ៖ ស្ពានជ្រោយចង្វារ រង្វង់មូល ផ្លូវជាតិលេខ ៦ និងមណ្ឌលសន្និបាត និងពិព័រណ៍ OCIC',
        },
      },
    } as Venue,
  },

  /** The three-day celebration shown in the day switcher. Times are Cambodia time. */
  schedule: [
    {
      id: 'day1',
      date: '2035-11-16T12:00:00+07:00',
      sessions: [
        {
          id: 'gathering',
          venue: 'residence',
          items: [{ id: 'krongPeali', start: '2035-11-16T14:00:00+07:00', end: '2035-11-16T17:00:00+07:00' }],
        },
      ],
    },
    {
      id: 'day2',
      date: '2035-11-17T12:00:00+07:00',
      sessions: [
        {
          id: 'monks',
          venue: 'residence',
          items: [{ id: 'monks', start: '2035-11-17T16:00:00+07:00', end: '2035-11-17T18:00:00+07:00' }],
        },
      ],
    },
    {
      id: 'day3',
      date: '2035-11-18T12:00:00+07:00',
      sessions: [
        {
          id: 'morning',
          venue: 'residence',
          items: [
            { id: 'procession', start: '2035-11-18T07:00:00+07:00', end: '2035-11-18T08:15:00+07:00' },
            { id: 'haircut', start: '2035-11-18T08:30:00+07:00', end: '2035-11-18T09:45:00+07:00' },
            { id: 'blessing', start: '2035-11-18T10:00:00+07:00', end: '2035-11-18T11:30:00+07:00' },
          ],
        },
        {
          id: 'evening',
          venue: 'reception',
          items: [{ id: 'banquet', start: '2035-11-18T17:00:00+07:00', end: '2035-11-18T21:30:00+07:00' }],
        },
      ],
    },
  ] as ScheduleDay[],

  gifts: [
    {
      id: 'khqr',
      title: { en: 'ABA KHQR', km: 'ABA KHQR' },
      bank: 'ABA Bank',
      accountName: 'ROTHANAKPANHA SRO',
      accounts: [
        { currency: 'KHR', number: '005 127 659' },
        { currency: 'USD', number: '016 263 456' },
      ],
      qrImage: '/photo/QR1.jpg',
    },
  ] as GiftAccount[],

  /**
   * Sound.
   * - song: loops seamlessly in the background, starting when a guest opens the envelope
   *   (or at their first tap). Lives in photo/music/. If missing, a built-in instrumental plays.
   * - chime: plays once as the wax seal breaks (audio/ folder). If missing, a soft synthesised chime plays.
   * Volumes are 0–1; fadeIn/fadeOut are in seconds.
   */
  music: {
    // song2-web.mp3 is a web copy of photo/music/song2.MP3 (silence at the end trimmed, 128 kbps).
    // To go back to the first track: '/photo/music/song1.mp3' with volume 0.55.
    song: '/photo/music/song2-web.mp3',
    chime: '/audio/love-chime.mp3',
    volume: 0.35,
    chimeVolume: 0.7,
    fadeIn: 1.5,
    fadeOut: 0.9,
  },

  /** Show the sealed envelope intro on every page load and refresh. Set false to go straight to the page. */
  envelopeIntro: true,

  defaultLanguage: 'km' as 'km' | 'en',
} as const;

/** Photos shown in the full-screen gallery, in order. */
export const gallery: Photo[] = [wedding.photos.hero, wedding.photos.story];
