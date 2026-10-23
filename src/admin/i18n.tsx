import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Dietary, GuestStatus, Side, WishStatus } from '../../shared/constants';
import { readStored, writeStored } from '../lib/storage';

export type AdminLang = 'en' | 'km';

const en = {
  meta: { title: 'Wedding admin · Tango & Rothanakpanha' },
  common: {
    cancel: 'Cancel',
    close: 'Close',
    tryAgain: 'Try again',
    loading: 'Loading…',
    saving: 'Saving…',
    deleting: 'Deleting…',
    edit: 'Edit',
    delete: 'Delete',
    apply: 'Apply',
    actions: 'Actions',
    pax: (n: number) => `${n} pax`,
  },
  lang: { label: 'Dashboard language' },
  nav: {
    caption: 'Wedding admin',
    overview: 'Overview',
    guests: 'Guest list',
    wishes: 'Guestbook',
    viewSite: 'View website',
    signOut: 'Sign out',
    awaiting: (n: number) => `${n} awaiting review`,
  },
  side: {
    groom: 'Groom',
    bride: 'Bride',
    groomSide: "Groom's side",
    brideSide: "Bride's side",
    both: 'Both sides',
  } as Record<Side | 'groomSide' | 'brideSide' | 'both', string>,
  status: { pending: 'Pending', confirmed: 'Confirmed', declined: 'Declined' } as Record<GuestStatus, string>,
  wishStatus: { pending: 'Awaiting review', approved: 'Public', hidden: 'Hidden' } as Record<WishStatus, string>,
  dietary: {
    none: 'No restrictions',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    halal: 'Halal',
    no_pork: 'No pork',
    no_beef: 'No beef',
    no_seafood: 'No seafood',
    other: 'Other',
  } as Record<Dietary, string>,
  time: {
    justNow: 'just now',
    minutes: (n: number) => `${n} min ago`,
    hours: (n: number) => `${n} hr ago`,
    yesterday: 'yesterday',
    days: (n: number) => `${n} days ago`,
  },
  login: {
    title: 'Wedding dashboard',
    subtitle: 'Guests, replies and wishes for Tango & Rothanakpanha.',
    password: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    empty: 'Enter the admin password.',
    wrong: 'That password is not correct.',
    offline: 'No connection to the server.',
    failed: 'Sign-in failed.',
  },
  export: {
    button: 'Export',
    buttonFull: 'Export guest list',
    xlsx: 'Excel workbook (.xlsx)',
    xlsxHint: 'Guest list, seating plan and catering totals per table',
    csv: 'CSV file (.csv)',
    csvHint: 'Plain guest list for Google Sheets or other tools',
    filtered: 'Only guests matching the current filters are exported.',
  },
  overview: {
    title: 'Overview',
    subtitle: 'Where replies stand today.',
    loadError: 'The dashboard could not be loaded.',
    metrics: {
      pax: 'Total pax attending',
      paxPending: (n: number) => `Up to ${n} more from pending invitations`,
      paxNone: 'Seats to plan for',
      invited: 'Guests invited',
      stillToReply: (n: number) => `${n} still to reply`,
      attending: 'Attending',
      declined: 'Declined',
      ofInvitations: (p: number) => `${p}% of invitations`,
      wishes: 'Wishes received',
      wishesPending: (n: number) => `${n} awaiting review`,
      wishesDone: 'All reviewed',
      ariaLabel: 'Key numbers',
      guestsTotal: 'Total guests',
      confirmed: 'Confirmed',
      pending: 'Pending',
      replied: (p: number) => `${p}% have replied`,
      paxExpected: (n: number) => `Of up to ${n} expected`,
      open: (label: string) => `${label}: open the list`,
    },
    latest: 'Latest replies',
    openGuests: 'Open guest list',
    noReplies: 'No replies yet',
    noRepliesBody: 'Replies from the website RSVP form appear here.',
    byFamily: 'Attending by family',
    repliesReceived: 'Replies received',
    of: (a: number, b: number) => `${a} of ${b}`,
    guestbook: 'Guestbook',
    wishesWaiting: (n: number) =>
      `${n} ${n === 1 ? 'wish is' : 'wishes are'} waiting for your review before ${n === 1 ? 'it appears' : 'they appear'} on the website.`,
    wishesReviewed: (total: number, pub: number) => `All ${total} wishes have been reviewed. ${pub} are public.`,
    reviewWishes: 'Review wishes',
    openGuestbook: 'Open guestbook',
  },
  guests: {
    title: 'Guest list',
    subtitle: 'Invitations, replies and seating. Edit a table number right in the list.',
    add: 'Add guests',
    search: 'Search name, phone or table',
    searchLabel: 'Search guests',
    sideFilter: 'Filter by side',
    statusFilter: 'Filter by status',
    all: 'All',
    columns: { name: 'Guest name', side: 'Side', contact: 'Contact', pax: 'Pax', status: 'Status', table: 'Table' },
    mobileGuest: 'Guest',
    selectAll: 'Select all guests in this list',
    selectAllShort: 'Select all',
    select: (name: string) => `Select ${name}`,
    tableFor: (name: string) => `Table for ${name}`,
    statusFor: (name: string) => `Status for ${name}`,
    editGuest: (name: string) => `Edit ${name}`,
    deleteGuest: (name: string) => `Delete ${name}`,
    loading: 'Loading guests…',
    loadError: 'Guests could not be loaded.',
    emptyTitle: 'No guests yet',
    emptyBody: 'Add the people you are inviting, or wait for replies from the website. Guests who reply are added automatically.',
    noMatch: 'No guests match these filters',
    clearFilters: 'Clear filters',
    summary: (n: number, pax: number, total: number | null) =>
      `Showing ${n} ${n === 1 ? 'guest' : 'guests'}, ${pax} pax${total !== null ? ` (of ${total})` : ''}`,
    saveFailed: 'Could not save the change.',
    deleteTitle: 'Delete guest?',
    deleteBody: 'will be removed from the guest list. Their wishes stay in the guestbook.',
    deleteConfirm: 'Delete guest',
    deleted: (name: string) => `Deleted ${name}.`,
    deleteFailed: 'Could not delete the guest.',
  },
  bulk: {
    selected: (n: number) => `${n} ${n === 1 ? 'guest' : 'guests'} selected`,
    toolbar: 'Actions for selected guests',
    assignTable: 'Assign table',
    updateStatus: 'Update status',
    markConfirmed: 'Confirm',
    moreStatuses: 'Other statuses',
    delete: 'Delete',
    clear: 'Clear selection',
    tableLabel: (n: number) => `Table number for ${n} ${n === 1 ? 'guest' : 'guests'}`,
    tableHint: 'Leave empty to remove the table number.',
    tablePlaceholder: 'e.g. 12',
    tableAssigned: (t: string, n: number) => `Table ${t} assigned to ${n} ${n === 1 ? 'guest' : 'guests'}.`,
    tableCleared: (n: number) => `Table removed for ${n} ${n === 1 ? 'guest' : 'guests'}.`,
    statusChanged: (n: number, status: string) => `${n} ${n === 1 ? 'guest' : 'guests'} marked ${status}.`,
    deleteTitle: (n: number) => `Delete ${n} ${n === 1 ? 'guest' : 'guests'}?`,
    deleteBody: 'These guests will be removed from the guest list. Their wishes stay in the guestbook.',
    deleteConfirm: (n: number) => `Delete ${n} ${n === 1 ? 'guest' : 'guests'}`,
    deleted: (n: number) => `Deleted ${n} ${n === 1 ? 'guest' : 'guests'}.`,
    failed: 'The change could not be saved. Please try again.',
  },
  dialog: {
    addTitle: 'Add guests',
    editTitle: (name: string) => `Edit ${name}`,
    howToAdd: 'How to add guests',
    one: 'One guest',
    paste: 'Paste a list',
    pasteLabel: 'One guest per line: name, phone, side, pax',
    pasteHint: 'You can paste straight from Excel. Phone, side and pax are optional.',
    pasteSide: 'When side is missing, use',
    pasteEmpty: 'Paste at least one guest, one per line.',
    ready: (n: number, pax: number) => `Ready to add ${n} ${n === 1 ? 'guest' : 'guests'} (${pax} pax).`,
    name: 'Guest name',
    nameRequired: 'Enter the guest’s name.',
    phone: 'Phone',
    side: 'Side',
    status: 'Status',
    pax: 'Pax',
    table: 'Table',
    tablePlaceholder: 'e.g. 12',
    dietary: 'Dietary',
    dietaryNote: 'Dietary note',
    notes: 'Private notes',
    save: 'Save changes',
    addOne: 'Add guest',
    addMany: (n: number) => (n === 1 ? 'Add 1 guest' : n ? `Add ${n} guests` : 'Add guests'),
    added: (name: string) => `Added ${name}.`,
    saved: (name: string) => `Saved ${name}.`,
    addedMany: (n: number, skipped: number) =>
      skipped
        ? `Added ${n} guests. Skipped ${skipped} with a phone number already on the list.`
        : `Added ${n} guests.`,
    saveFailed: 'Could not save the guest.',
  },
  wishes: {
    title: 'Guestbook',
    subtitle: 'Only public wishes are shown on the website.',
    tabs: 'Filter wishes',
    all: 'All',
    publishAll: (n: number) => `Publish all ${n} waiting`,
    publishing: 'Publishing…',
    published: (n: number) => `Published ${n} wishes.`,
    publishFailed: 'Some wishes could not be published.',
    loading: 'Loading wishes…',
    loadError: 'Wishes could not be loaded.',
    emptyPending: 'Nothing waiting for review',
    emptyPendingBody: 'New wishes from the website and RSVP form will appear here.',
    empty: 'No wishes here',
    withRsvp: 'Sent with RSVP',
    approve: 'Approve',
    hide: 'Hide',
    deleteFrom: (name: string) => `Delete wish from ${name}`,
    nowPublic: (name: string) => `Wish from ${name} is now public.`,
    nowHidden: (name: string) => `Wish from ${name} is hidden.`,
    updateFailed: 'Could not update the wish.',
    deleted: 'Wish deleted.',
    deleteFailed: 'Could not delete the wish.',
    deleteTitle: 'Delete this wish?',
    deleteBody: (name: string) =>
      `The wish from ${name} will be removed permanently. To keep it but take it off the website, choose Hide instead.`,
    deleteConfirm: 'Delete wish',
    selectAll: 'Select all',
    selectWish: (name: string) => `Select wish from ${name}`,
    count: (n: number) => `${n} ${n === 1 ? 'wish' : 'wishes'}`,
    makePublic: 'Make public',
    show: 'Show on website',
  },
  wishBulk: {
    toolbar: 'Actions for selected wishes',
    selected: (n: number) => `${n} ${n === 1 ? 'wish' : 'wishes'} selected`,
    setPublic: 'Set Public',
    hide: 'Hide',
    delete: 'Delete',
    clear: 'Deselect all',
    madePublic: (n: number) => `${n} ${n === 1 ? 'wish is' : 'wishes are'} now public.`,
    madeHidden: (n: number) => `${n} ${n === 1 ? 'wish' : 'wishes'} hidden.`,
    deleted: (n: number) => `Deleted ${n} ${n === 1 ? 'wish' : 'wishes'}.`,
    deleteTitle: (n: number) => `Delete ${n} ${n === 1 ? 'wish' : 'wishes'}?`,
    deleteBody: 'These wishes will be removed permanently. To keep them but take them off the website, choose Hide instead.',
    deleteConfirm: (n: number) => `Delete ${n} ${n === 1 ? 'wish' : 'wishes'}`,
    failed: 'The change could not be saved. Please try again.',
  },
};

export type AdminDict = typeof en;

/** Khmer numerals (០–៩), used where the Khmer copy shows counts in Khmer script. */
const kmDigits = (n: number) => String(n).replace(/\d/g, (d) => '០១២៣៤៥៦៧៨៩'[Number(d)]);

const km: AdminDict = {
  meta: { title: 'ផ្ទាំងគ្រប់គ្រងមង្គលការ · តាំងអូ និង រតនៈបញ្ញា' },
  common: {
    cancel: 'បោះបង់',
    close: 'បិទ',
    tryAgain: 'ព្យាយាមម្តងទៀត',
    loading: 'កំពុងផ្ទុក…',
    saving: 'កំពុងរក្សាទុក…',
    deleting: 'កំពុងលុប…',
    edit: 'កែសម្រួល',
    delete: 'លុប',
    apply: 'អនុវត្ត',
    actions: 'សកម្មភាព',
    pax: (n) => `${n} នាក់`,
  },
  lang: { label: 'ភាសាផ្ទាំងគ្រប់គ្រង' },
  nav: {
    caption: 'ផ្ទាំងគ្រប់គ្រងមង្គលការ',
    overview: 'ទិដ្ឋភាពទូទៅ',
    guests: 'បញ្ជីភ្ញៀវ',
    wishes: 'សៀវភៅជូនពរ',
    viewSite: 'មើលគេហទំព័រ',
    signOut: 'ចាកចេញ',
    awaiting: (n) => `${n} កំពុងរង់ចាំពិនិត្យ`,
  },
  side: {
    groom: 'កូនកំលោះ',
    bride: 'កូនក្រមុំ',
    groomSide: 'ខាងកូនកំលោះ',
    brideSide: 'ខាងកូនក្រមុំ',
    both: 'ទាំងសងខាង',
  },
  status: { pending: 'រង់ចាំការឆ្លើយតប', confirmed: 'បានបញ្ជាក់', declined: 'បដិសេធ' },
  wishStatus: { pending: 'រង់ចាំពិនិត្យ', approved: 'បង្ហាញជាសាធារណៈ', hidden: 'លាក់' },
  dietary: {
    none: 'គ្មានតម្រូវការពិសេស',
    vegetarian: 'បួស',
    vegan: 'បួសសុទ្ធ',
    halal: 'ហាឡាល់',
    no_pork: 'មិនញ៉ាំសាច់ជ្រូក',
    no_beef: 'មិនញ៉ាំសាច់គោ',
    no_seafood: 'មិនញ៉ាំគ្រឿងសមុទ្រ',
    other: 'ផ្សេងៗ',
  },
  time: {
    justNow: 'មុននេះបន្តិច',
    minutes: (n) => `${n} នាទីមុន`,
    hours: (n) => `${n} ម៉ោងមុន`,
    yesterday: 'ម្សិលមិញ',
    days: (n) => `${n} ថ្ងៃមុន`,
  },
  login: {
    title: 'ផ្ទាំងគ្រប់គ្រងមង្គលការ',
    subtitle: 'ភ្ញៀវ ការឆ្លើយតប និងពាក្យជូនពរ សម្រាប់ តាំងអូ និង រតនៈបញ្ញា។',
    password: 'ពាក្យសម្ងាត់',
    submit: 'ចូល',
    submitting: 'កំពុងចូល…',
    empty: 'សូមបញ្ចូលពាក្យសម្ងាត់។',
    wrong: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ។',
    offline: 'មិនអាចភ្ជាប់ទៅម៉ាស៊ីនមេបានទេ។',
    failed: 'មិនអាចចូលបានទេ។',
  },
  export: {
    button: 'ទាញយកទិន្នន័យ',
    buttonFull: 'ទាញយកបញ្ជីភ្ញៀវ',
    xlsx: 'ឯកសារ Excel (.xlsx)',
    xlsxHint: 'បញ្ជីភ្ញៀវ ប្លង់តុ និងចំនួនអាហារតាមតុនីមួយៗ',
    csv: 'ឯកសារ CSV (.csv)',
    csvHint: 'បញ្ជីភ្ញៀវសាមញ្ញ សម្រាប់ Google Sheets ឬកម្មវិធីផ្សេងទៀត',
    filtered: 'នឹងទាញយកតែភ្ញៀវដែលត្រូវនឹងតម្រងបច្ចុប្បន្នប៉ុណ្ណោះ។',
  },
  overview: {
    title: 'ទិដ្ឋភាពទូទៅ',
    subtitle: 'ស្ថានភាពការឆ្លើយតបនៅថ្ងៃនេះ។',
    loadError: 'មិនអាចផ្ទុកផ្ទាំងគ្រប់គ្រងបានទេ។',
    metrics: {
      pax: 'ចំនួនភ្ញៀវចូលរួមសរុប',
      paxPending: (n) => `អាចមានបន្ថែម ${n} នាក់ទៀត ពីការអញ្ជើញដែលកំពុងរង់ចាំ`,
      paxNone: 'ចំនួនកៅអីដែលត្រូវរៀបចំ',
      invited: 'ភ្ញៀវដែលបានអញ្ជើញ',
      stillToReply: (n) => `${n} នាក់មិនទាន់ឆ្លើយតប`,
      attending: 'ចូលរួម',
      declined: 'បដិសេធ',
      ofInvitations: (p) => `${p}% នៃការអញ្ជើញ`,
      wishes: 'ពាក្យជូនពរដែលបានទទួល',
      wishesPending: (n) => `${n} កំពុងរង់ចាំពិនិត្យ`,
      wishesDone: 'បានពិនិត្យទាំងអស់',
      ariaLabel: 'តួលេខសំខាន់ៗ',
      guestsTotal: 'ភ្ញៀវសរុប',
      confirmed: 'បានបញ្ជាក់',
      pending: 'រង់ចាំការឆ្លើយតប',
      replied: (p) => `${p}% បានឆ្លើយតប`,
      paxExpected: (n) => `ក្នុងចំណោមរហូតដល់ ${n} នាក់`,
      open: (label) => `${label}: បើកបញ្ជី`,
    },
    latest: 'ការឆ្លើយតបចុងក្រោយ',
    openGuests: 'បើកបញ្ជីភ្ញៀវ',
    noReplies: 'មិនទាន់មានការឆ្លើយតបនៅឡើយ',
    noRepliesBody: 'ការឆ្លើយតបពីទម្រង់លើគេហទំព័រ នឹងបង្ហាញនៅទីនេះ។',
    byFamily: 'ការចូលរួមតាមខាង',
    repliesReceived: 'ការឆ្លើយតបដែលបានទទួល',
    of: (a, b) => `${a} / ${b}`,
    guestbook: 'សៀវភៅជូនពរ',
    wishesWaiting: (n) => `មានពាក្យជូនពរ ${n} កំពុងរង់ចាំការពិនិត្យរបស់អ្នក មុននឹងបង្ហាញលើគេហទំព័រ។`,
    wishesReviewed: (total, pub) => `ពាក្យជូនពរទាំង ${total} ត្រូវបានពិនិត្យរួច។ ${pub} កំពុងបង្ហាញជាសាធារណៈ។`,
    reviewWishes: 'ពិនិត្យពាក្យជូនពរ',
    openGuestbook: 'បើកសៀវភៅជូនពរ',
  },
  guests: {
    title: 'បញ្ជីភ្ញៀវ',
    subtitle: 'ការអញ្ជើញ ការឆ្លើយតប និងការរៀបចំតុ។ កែសម្រួលលេខតុដោយផ្ទាល់នៅក្នុងបញ្ជី។',
    add: 'បន្ថែមភ្ញៀវ',
    search: 'ស្វែងរកឈ្មោះ លេខទូរស័ព្ទ ឬលេខតុ',
    searchLabel: 'ស្វែងរកភ្ញៀវ',
    sideFilter: 'តម្រងតាមខាង',
    statusFilter: 'តម្រងតាមស្ថានភាព',
    all: 'ទាំងអស់',
    columns: { name: 'ឈ្មោះភ្ញៀវ', side: 'ខាង', contact: 'ទំនាក់ទំនង', pax: 'ចំនួន', status: 'ស្ថានភាព', table: 'លេខតុ' },
    mobileGuest: 'ភ្ញៀវ',
    selectAll: 'ជ្រើសរើសភ្ញៀវទាំងអស់ក្នុងបញ្ជីនេះ',
    selectAllShort: 'ជ្រើសរើសទាំងអស់',
    select: (name) => `ជ្រើសរើស ${name}`,
    tableFor: (name) => `លេខតុសម្រាប់ ${name}`,
    statusFor: (name) => `ស្ថានភាពរបស់ ${name}`,
    editGuest: (name) => `កែសម្រួល ${name}`,
    deleteGuest: (name) => `លុប ${name}`,
    loading: 'កំពុងផ្ទុកបញ្ជីភ្ញៀវ…',
    loadError: 'មិនអាចផ្ទុកបញ្ជីភ្ញៀវបានទេ។',
    emptyTitle: 'មិនទាន់មានភ្ញៀវនៅឡើយ',
    emptyBody: 'បន្ថែមអ្នកដែលអ្នកចង់អញ្ជើញ ឬរង់ចាំការឆ្លើយតបពីគេហទំព័រ។ ភ្ញៀវដែលឆ្លើយតបនឹងត្រូវបន្ថែមដោយស្វ័យប្រវត្តិ។',
    noMatch: 'គ្មានភ្ញៀវត្រូវនឹងតម្រងនេះទេ',
    clearFilters: 'សម្អាតតម្រង',
    summary: (n, pax, total) => `បង្ហាញភ្ញៀវ ${n} សរុប ${pax} នាក់${total !== null ? ` (ក្នុងចំណោម ${total})` : ''}`,
    saveFailed: 'មិនអាចរក្សាទុកការកែប្រែបានទេ។',
    deleteTitle: 'លុបភ្ញៀវនេះ?',
    deleteBody: 'នឹងត្រូវដកចេញពីបញ្ជីភ្ញៀវ។ ពាក្យជូនពររបស់ពួកគេនៅតែមាននៅក្នុងសៀវភៅជូនពរ។',
    deleteConfirm: 'លុបភ្ញៀវ',
    deleted: (name) => `បានលុប ${name}។`,
    deleteFailed: 'មិនអាចលុបភ្ញៀវបានទេ។',
  },
  bulk: {
    selected: (n) => `បានជ្រើសរើសភ្ញៀវ ${n} នាក់`,
    toolbar: 'សកម្មភាពសម្រាប់ភ្ញៀវដែលបានជ្រើសរើស',
    assignTable: 'កំណត់លេខតុ',
    updateStatus: 'ប្តូរស្ថានភាព',
    markConfirmed: 'បញ្ជាក់',
    moreStatuses: 'ស្ថានភាពផ្សេងទៀត',
    delete: 'លុប',
    clear: 'ឈប់ជ្រើសរើស',
    tableLabel: (n) => `លេខតុសម្រាប់ភ្ញៀវ ${n} នាក់`,
    tableHint: 'ទុកទទេ ដើម្បីដកលេខតុចេញ។',
    tablePlaceholder: 'ឧ. 12',
    tableAssigned: (t, n) => `បានកំណត់តុ ${t} ឱ្យភ្ញៀវ ${n} នាក់។`,
    tableCleared: (n) => `បានដកលេខតុពីភ្ញៀវ ${n} នាក់។`,
    statusChanged: (n, status) => `បានប្តូរស្ថានភាពភ្ញៀវ ${n} នាក់ ទៅជា «${status}»។`,
    deleteTitle: (n) => `លុបភ្ញៀវ ${n} នាក់?`,
    deleteBody: 'ភ្ញៀវទាំងនេះនឹងត្រូវដកចេញពីបញ្ជីភ្ញៀវ។ ពាក្យជូនពររបស់ពួកគេនៅតែមាននៅក្នុងសៀវភៅជូនពរ។',
    deleteConfirm: (n) => `លុបភ្ញៀវ ${n} នាក់`,
    deleted: (n) => `បានលុបភ្ញៀវ ${n} នាក់។`,
    failed: 'មិនអាចរក្សាទុកការកែប្រែបានទេ។ សូមព្យាយាមម្តងទៀត។',
  },
  dialog: {
    addTitle: 'បន្ថែមភ្ញៀវ',
    editTitle: (name) => `កែសម្រួល ${name}`,
    howToAdd: 'របៀបបន្ថែមភ្ញៀវ',
    one: 'ម្តងម្នាក់',
    paste: 'បិទភ្ជាប់បញ្ជី',
    pasteLabel: 'ភ្ញៀវម្នាក់ក្នុងមួយបន្ទាត់៖ ឈ្មោះ, លេខទូរស័ព្ទ, ខាង, ចំនួន',
    pasteHint: 'អាចចម្លងពី Excel មកបិទភ្ជាប់ផ្ទាល់។ លេខទូរស័ព្ទ ខាង និងចំនួន មិនចាំបាច់ទេ។',
    pasteSide: 'បើមិនបានបញ្ជាក់ខាង ប្រើ',
    pasteEmpty: 'សូមបិទភ្ជាប់ភ្ញៀវយ៉ាងហោចណាស់ម្នាក់ ម្នាក់ក្នុងមួយបន្ទាត់។',
    ready: (n, pax) => `រួចរាល់សម្រាប់បន្ថែមភ្ញៀវ ${n} (សរុប ${pax} នាក់)។`,
    name: 'ឈ្មោះភ្ញៀវ',
    nameRequired: 'សូមបញ្ចូលឈ្មោះភ្ញៀវ។',
    phone: 'លេខទូរស័ព្ទ',
    side: 'ខាង',
    status: 'ស្ថានភាព',
    pax: 'ចំនួន',
    table: 'លេខតុ',
    tablePlaceholder: 'ឧ. 12',
    dietary: 'តម្រូវការអាហារ',
    dietaryNote: 'កំណត់សម្គាល់អាហារ',
    notes: 'កំណត់សម្គាល់ឯកជន',
    save: 'រក្សាទុក',
    addOne: 'បន្ថែមភ្ញៀវ',
    addMany: (n) => (n ? `បន្ថែមភ្ញៀវ ${n} នាក់` : 'បន្ថែមភ្ញៀវ'),
    added: (name) => `បានបន្ថែម ${name}។`,
    saved: (name) => `បានរក្សាទុក ${name}។`,
    addedMany: (n, skipped) =>
      skipped ? `បានបន្ថែមភ្ញៀវ ${n} នាក់។ រំលង ${skipped} ដែលមានលេខទូរស័ព្ទនៅក្នុងបញ្ជីរួចហើយ។` : `បានបន្ថែមភ្ញៀវ ${n} នាក់។`,
    saveFailed: 'មិនអាចរក្សាទុកភ្ញៀវបានទេ។',
  },
  wishes: {
    title: 'សៀវភៅជូនពរ',
    subtitle: 'មានតែពាក្យជូនពរដែលបង្ហាញជាសាធារណៈប៉ុណ្ណោះ ទើបឃើញនៅលើគេហទំព័រ។',
    tabs: 'តម្រងពាក្យជូនពរ',
    all: 'ទាំងអស់',
    publishAll: (n) => `បង្ហាញទាំង ${n} ដែលកំពុងរង់ចាំ`,
    publishing: 'កំពុងបង្ហាញ…',
    published: (n) => `បានបង្ហាញពាក្យជូនពរ ${n}។`,
    publishFailed: 'ពាក្យជូនពរខ្លះមិនអាចបង្ហាញបានទេ។',
    loading: 'កំពុងផ្ទុកពាក្យជូនពរ…',
    loadError: 'មិនអាចផ្ទុកពាក្យជូនពរបានទេ។',
    emptyPending: 'គ្មានអ្វីកំពុងរង់ចាំពិនិត្យទេ',
    emptyPendingBody: 'ពាក្យជូនពរថ្មីៗពីគេហទំព័រ និងទម្រង់ឆ្លើយតប នឹងបង្ហាញនៅទីនេះ។',
    empty: 'គ្មានពាក្យជូនពរនៅទីនេះទេ',
    withRsvp: 'ផ្ញើជាមួយការឆ្លើយតប',
    approve: 'អនុម័ត',
    hide: 'លាក់',
    deleteFrom: (name) => `លុបពាក្យជូនពររបស់ ${name}`,
    nowPublic: (name) => `ពាក្យជូនពររបស់ ${name} កំពុងបង្ហាញជាសាធារណៈ។`,
    nowHidden: (name) => `ពាក្យជូនពររបស់ ${name} ត្រូវបានលាក់។`,
    updateFailed: 'មិនអាចកែប្រែពាក្យជូនពរបានទេ។',
    deleted: 'បានលុបពាក្យជូនពរ។',
    deleteFailed: 'មិនអាចលុបពាក្យជូនពរបានទេ។',
    deleteTitle: 'លុបពាក្យជូនពរនេះ?',
    deleteBody: (name) =>
      `ពាក្យជូនពររបស់ ${name} នឹងត្រូវលុបជាអចិន្ត្រៃយ៍។ បើចង់រក្សាទុក ប៉ុន្តែមិនបង្ហាញលើគេហទំព័រ សូមជ្រើសរើស «លាក់» ជំនួសវិញ។`,
    deleteConfirm: 'លុបពាក្យជូនពរ',
    selectAll: 'ជ្រើសរើសទាំងអស់',
    selectWish: (name) => `ជ្រើសរើសពាក្យជូនពររបស់ ${name}`,
    count: (n) => `ពាក្យជូនពរ ${kmDigits(n)}`,
    makePublic: 'បង្ហាញជាសាធារណៈ',
    show: 'បង្ហាញលើគេហទំព័រ',
  },
  wishBulk: {
    toolbar: 'សកម្មភាពសម្រាប់ពាក្យជូនពរដែលបានជ្រើសរើស',
    selected: (n) => `បានជ្រើសរើស ${kmDigits(n)}`,
    setPublic: 'បង្ហាញជាសាធារណៈ',
    hide: 'លាក់',
    delete: 'លុបចោល',
    clear: 'ឈប់ជ្រើសរើសទាំងអស់',
    madePublic: (n) => `ពាក្យជូនពរ ${kmDigits(n)} កំពុងបង្ហាញជាសាធារណៈ។`,
    madeHidden: (n) => `បានលាក់ពាក្យជូនពរ ${kmDigits(n)}។`,
    deleted: (n) => `បានលុបពាក្យជូនពរ ${kmDigits(n)}។`,
    deleteTitle: (n) => `លុបពាក្យជូនពរ ${kmDigits(n)}?`,
    deleteBody: 'ពាក្យជូនពរទាំងនេះនឹងត្រូវលុបជាអចិន្ត្រៃយ៍។ បើចង់រក្សាទុក ប៉ុន្តែមិនបង្ហាញលើគេហទំព័រ សូមជ្រើសរើស «លាក់» ជំនួសវិញ។',
    deleteConfirm: (n) => `លុបពាក្យជូនពរ ${kmDigits(n)}`,
    failed: 'មិនអាចរក្សាទុកការកែប្រែបានទេ។ សូមព្យាយាមម្តងទៀត។',
  },
};

const dictionaries: Record<AdminLang, AdminDict> = { en, km };
const STORAGE_KEY = 'admin-lang';

interface AdminI18n {
  lang: AdminLang;
  t: AdminDict;
  setLang: (lang: AdminLang) => void;
}

const AdminI18nContext = createContext<AdminI18n | null>(null);

export function AdminI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>(() => (readStored<AdminLang>(STORAGE_KEY) === 'km' ? 'km' : 'en'));

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dictionaries[lang].meta.title;
  }, [lang]);

  const setLang = useCallback((next: AdminLang) => {
    setLangState(next);
    writeStored(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ lang, t: dictionaries[lang], setLang }), [lang, setLang]);
  return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
}

export function useAdminI18n(): AdminI18n {
  const value = useContext(AdminI18nContext);
  if (!value) throw new Error('useAdminI18n must be used inside <AdminI18nProvider>');
  return value;
}

/** `EN | ខ្មែរ` segmented switch. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useAdminI18n();
  return (
    <div className={`lang-toggle ${className ?? ''}`} role="group" aria-label={t.lang.label}>
      <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
        EN
      </button>
      <button type="button" lang="km" aria-pressed={lang === 'km'} onClick={() => setLang('km')}>
        ខ្មែរ
      </button>
    </div>
  );
}

/** "5 min ago" in the current language. */
export function useTimeAgo() {
  const { t } = useAdminI18n();
  return (iso: string | null) => {
    if (!iso) return '';
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (minutes < 1) return t.time.justNow;
    if (minutes < 60) return t.time.minutes(minutes);
    const hours = Math.round(minutes / 60);
    if (hours < 24) return t.time.hours(hours);
    const days = Math.round(hours / 24);
    return days === 1 ? t.time.yesterday : t.time.days(days);
  };
}
