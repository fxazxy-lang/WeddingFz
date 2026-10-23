import type { Dietary } from '../../shared/constants';
import type { ScheduleItemId } from '../config/wedding';

export interface StoryEntry {
  year: string;
  title: string;
  body: string;
}

export interface Dictionary {
  meta: { title: string };
  nav: { story: string; schedule: string; venue: string; rsvp: string; wishes: string; gifts: string; menu: string; close: string };
  gallery: { view: string; previous: string; next: string; close: string };
  language: { switchTo: string; label: string };
  intro: { weddingOf: string; open: string; openTouch: string; aria: string; together: string; skip: string; venueLine: string };
  music: { play: string; pause: string };
  hero: {
    invitation: string;
    and: string;
    rsvpCta: string;
    countdownLabel: string;
    units: { days: string; hours: string; minutes: string; seconds: string };
    today: string;
    married: string;
    saveTheDate: string;
  };
  story: { title: string; intro: string; entries: StoryEntry[] };
  schedule: {
    title: string;
    intro: string;
    tabsLabel: string;
    days: Record<'day1' | 'day2' | 'day3', { tab: string; title: string }>;
    sessions: Record<'gathering' | 'monks' | 'morning' | 'evening', string>;
    directions: string;
    addToCalendar: string;
    googleCalendar: string;
    appleCalendar: string;
    dressCode: string;
    items: Record<ScheduleItemId, { title: string; body: string }>;
  };
  venue: {
    title: string;
    intro: string;
    reception: string;
    openMap: string;
    mapTitle: string;
    addToCalendar: string;
    addressLabel: string;
    dateLabel: string;
  };
  rsvp: {
    title: string;
    intro: (deadline: string) => string;
    name: string;
    namePlaceholder: string;
    phone: string;
    phoneHint: string;
    side: string;
    groomSide: string;
    brideSide: string;
    attending: string;
    yes: string;
    no: string;
    pax: string;
    paxHint: string;
    decrease: string;
    increase: string;
    dietary: string;
    dietaryOptions: Record<Dietary, string>;
    dietaryNote: string;
    dietaryNotePlaceholder: string;
    message: string;
    messagePlaceholder: string;
    optional: string;
    submit: string;
    submitting: string;
    successYes: (name: string) => string;
    successNo: (name: string) => string;
    updatedNote: string;
    wishPending: string;
    editAnswer: string;
    errors: {
      name: string;
      phone: string;
      side: string;
      attending: string;
      pax: string;
      generic: string;
      rateLimited: string;
      network: string;
    };
  };
  wishes: {
    title: string;
    intro: string;
    name: string;
    message: string;
    messagePlaceholder: string;
    submit: string;
    submitting: string;
    posted: string;
    pending: string;
    empty: string;
    loadMore: string;
    showLess: string;
    leaveWish: string;
    dialogTitle: string;
    close: string;
    done: string;
    loading: string;
    loadError: string;
    retry: string;
    errors: { name: string; message: string };
    searchLabel: string;
    searchPlaceholder: string;
    clearSearch: string;
    noMatches: (query: string) => string;
    matches: (n: number) => string;
    viewAll: string;
    allTitle: string;
    allCount: (n: number) => string;
    sortLabel: string;
    sortNewest: string;
    sortOldest: string;
    sortName: string;
    pagination: string;
    previous: string;
    next: string;
    pageOf: (page: number, total: number) => string;
  };
  gifts: {
    title: string;
    intro: string;
    accountName: string;
    accountNumber: string;
    copy: string;
    copied: string;
    copyAccount: (currency: string) => string;
    saveQr: string;
    enlargeQr: string;
    qrPlaceholder: string;
    scanHint: string;
  };
  footer: { thanks: string; madeWith: string };
}

export const en: Dictionary = {
  meta: { title: 'Tango & Rothanakpanha · Wedding' },
  nav: {
    story: 'Our story',
    schedule: 'Schedule',
    venue: 'Venue',
    rsvp: 'RSVP',
    wishes: 'Wishes',
    gifts: 'Gifts',
    menu: 'Open menu',
    close: 'Close menu',
  },
  gallery: { view: 'View photo', previous: 'Previous photo', next: 'Next photo', close: 'Close photo' },
  language: { switchTo: 'ខ្មែរ', label: 'Switch to Khmer' },
  intro: {
    weddingOf: 'The wedding of',
    open: 'Click to Open Invitation',
    openTouch: 'Tap to Open Invitation',
    aria: 'Open the wedding invitation',
    together: 'Together with our families, we invite you',
    skip: 'Skip',
    venueLine: 'Ta Khmau  ·  OCIC Wedding Hall, Phnom Penh',
  },
  music: { play: 'Play music', pause: 'Pause music' },
  hero: {
    invitation: 'Together with our families, we warmly invite you to celebrate our wedding',
    and: '&',
    rsvpCta: 'Reply to the invitation',
    countdownLabel: 'Until we say “I do”',
    units: { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' },
    today: 'Today is our wedding day',
    married: 'Thank you for celebrating with us',
    saveTheDate: 'Save The Date',
  },
  story: {
    title: 'Our story',
    intro: 'A few memorable milestones that brought us to where we are today',
    entries: [
      {
        year: '2026',
        title: 'Sparked on Social Media',
        body: 'A simple late-night reply to her story turned into hours of effortless conversation, quietly opening the door to our story together.',
      },
      {
        year: '2026',
        title: 'Our First Date',
        body: 'After countless chats and shared laughs through our screens, we finally met in person for a meal—full of warm smiles and an unmistakable connection.',
      },
      {
        year: '2031',
        title: 'The Proposal',
        body: 'On a quiet, intimate evening surrounded by warmth and love, he asked the most important question of his life—and she said yes.',
      },
      {
        year: '2035',
        title: 'Our Wedding Day',
        body: 'Surrounded by our cherished families and dearest friends, we step forward hand in hand to begin our next chapter as one.',
      },
    ],
  },
  schedule: {
    title: 'Our three-day celebration',
    intro: 'A tent blessing on the first day, a monks’ blessing on the second, and the wedding ceremonies and banquet on the third.',
    tabsLabel: 'Choose a day',
    days: {
      day1: { tab: 'Day 1', title: 'Tent Blessing & Gathering' },
      day2: { tab: 'Day 2', title: 'Monks Chanting & Buddhist Blessing' },
      day3: { tab: 'Day 3', title: 'Main Wedding Day' },
    },
    sessions: {
      gathering: 'Pre-Wedding Gathering',
      monks: 'Buddhist Blessing Ceremony',
      morning: 'Morning Ceremonies',
      evening: 'Grand Wedding Banquet Reception',
    },
    directions: 'View Map',
    addToCalendar: 'Add to Calendar',
    googleCalendar: 'Google Calendar',
    appleCalendar: 'Apple Calendar / Outlook (.ics)',
    dressCode: 'Dress code: Khmer traditional or formal attire',
    items: {
      krongPeali: {
        title: 'Krong Peali & Tent Blessing',
        body: 'Pre-wedding tent blessing and family gathering, honoring the guardian spirits.',
      },
      monks: {
        title: 'Buddhist Monks Chanting',
        body: 'Monks chanting and a sacred Buddhist blessing for auspicious fortune and prosperity.',
      },
      procession: {
        title: "Groom's Procession (ពិធីហែជំនូន)",
        body: 'Traditional arrival and presentation of fruit trays.',
      },
      haircut: {
        title: 'Hair Cutting Ceremony (ពិធីកាត់សក់)',
        body: 'Cleansing and blessing ritual.',
      },
      blessing: {
        title: 'Knot-Tying & Blessing Ceremony (ពិធីសំពះផ្ទឹម និងចងដៃ)',
        body: 'Sacred thread-tying by family and elders.',
      },
      banquet: {
        title: 'Guest Welcoming & Grand Banquet',
        body: 'Evening dinner, entertainment, and celebration.',
      },
    },
  },
  venue: {
    title: 'Where to find us',
    intro: 'The Day 3 evening banquet will be held at OCIC Wedding Hall in Chroy Changvar.',
    reception: 'Evening Banquet',
    openMap: 'Open in Google Maps',
    mapTitle: 'Map showing OCIC Wedding Hall',
    addToCalendar: 'Add to calendar',
    addressLabel: 'Address',
    dateLabel: 'Date and time',
  },
  rsvp: {
    title: 'Will you join us?',
    intro: (deadline) => `Please reply by ${deadline} so we can prepare a seat for you.`,
    name: 'Full name',
    namePlaceholder: 'e.g. Sok Dara',
    phone: 'Phone number',
    phoneHint: 'We only use this to match your invitation.',
    side: 'You are a guest of the',
    groomSide: "Groom's side",
    brideSide: "Bride's side",
    attending: 'Will you attend?',
    yes: 'Joyfully attending',
    no: "Sorry, I can't make it",
    pax: 'Number of guests',
    paxHint: 'Including yourself',
    decrease: 'Fewer guests',
    increase: 'More guests',
    dietary: 'Dietary preference',
    dietaryOptions: {
      none: 'No restrictions',
      vegetarian: 'Vegetarian',
      vegan: 'Vegan',
      halal: 'Halal',
      no_pork: 'No pork',
      no_beef: 'No beef',
      no_seafood: 'No seafood / shellfish',
      other: 'Other',
    },
    dietaryNote: 'Allergies or other notes',
    dietaryNotePlaceholder: 'Anything our caterer should know',
    message: 'A blessing for the couple',
    messagePlaceholder: 'Write a few words for Tango and Rothanakpanha',
    optional: 'optional',
    submit: 'Send my reply',
    submitting: 'Sending…',
    successYes: (name) => `Thank you, ${name}. We can't wait to celebrate with you.`,
    successNo: (name) => `Thank you for letting us know, ${name}. You will be missed.`,
    updatedNote: 'We updated the reply you sent earlier.',
    wishPending: 'Your blessing will appear in the guestbook once we have read it.',
    editAnswer: 'Change my reply',
    errors: {
      name: 'Please enter your name.',
      phone: 'Please enter a valid phone number.',
      side: 'Please choose whose guest you are.',
      attending: 'Please let us know if you can come.',
      pax: 'Please enter between 1 and 10 guests.',
      generic: 'Your reply could not be sent. Please check the form and try again.',
      rateLimited: 'Too many attempts. Please wait a few minutes and try again.',
      network: 'No connection. Check your internet and try again.',
    },
  },
  wishes: {
    title: 'Wishes for the couple',
    intro: 'Leave a few words for Tango and Rothanakpanha.',
    name: 'Your name',
    message: 'Your wish',
    messagePlaceholder: 'Wishing you a lifetime of happiness…',
    submit: 'Post my wish',
    submitting: 'Posting…',
    posted: 'Thank you. Your wish has been posted.',
    pending: 'Thank you. Your wish will appear here once the couple has read it.',
    empty: 'No wishes yet. Be the first to write one.',
    loadMore: 'View More',
    showLess: 'Show Less',
    leaveWish: 'Leave a Wish',
    dialogTitle: 'Leave a wish for the couple',
    close: 'Close',
    done: 'Done',
    loading: 'Loading wishes…',
    loadError: 'Wishes could not be loaded.',
    retry: 'Try again',
    errors: { name: 'Please enter your name.', message: 'Please write a short wish.' },
    searchLabel: 'Search wishes',
    searchPlaceholder: 'Search wishes by name…',
    clearSearch: 'Clear search',
    noMatches: (q) => `No wishes match “${q}”.`,
    matches: (n) => `${n} ${n === 1 ? 'wish matches' : 'wishes match'}`,
    viewAll: 'View All Wishes',
    allTitle: 'All wishes',
    allCount: (n) => `${n} ${n === 1 ? 'wish' : 'wishes'} from family and friends`,
    sortLabel: 'Sort',
    sortNewest: 'Newest first',
    sortOldest: 'Oldest first',
    sortName: 'Name A–Z',
    pagination: 'Pages',
    previous: 'Previous page',
    next: 'Next page',
    pageOf: (p, t) => `Page ${p} of ${t}`,
  },
  gifts: {
    title: 'Wedding gifts',
    intro:
      'Your presence is the greatest gift. If you would like to send a gift from afar, you can scan the code below or save it to your phone.',
    accountName: 'Account name',
    accountNumber: 'Account',
    copy: 'Copy',
    copied: 'Copied',
    copyAccount: (currency) => `Copy ${currency} account number`,
    saveQr: 'Save QR',
    enlargeQr: 'Enlarge QR code',
    qrPlaceholder: 'QR code coming soon',
    scanHint: 'Scan with ABA, Bakong or any KHQR banking app',
  },
  footer: { thanks: 'With love and gratitude', madeWith: 'We look forward to celebrating with you.' },
};
