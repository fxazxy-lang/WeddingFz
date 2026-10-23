/** Sample guests and wishes used by `npm run seed` and removed by `npm run clear-sample`. */
import type { GuestCreateInput } from '../shared/schemas';

const g = (
  name: string,
  phone: string,
  side: 'groom' | 'bride',
  status: GuestCreateInput['status'],
  pax: number,
  tableNumber = '',
  dietary: GuestCreateInput['dietary'] = 'none',
): GuestCreateInput => ({ name, phone, side, status, pax, tableNumber, dietary, dietaryNote: '', notes: '' });

export const sampleGuests: GuestCreateInput[] = [
  g('Yin Sokha & family', '012 111 201', 'groom', 'confirmed', 4, '1'),
  g('យិន សុភាព', '012 111 202', 'groom', 'confirmed', 2, '1'),
  g('Chea Vannak', '017 222 303', 'groom', 'confirmed', 2, '2', 'no_beef'),
  g('Mao Sreypov', '096 333 404', 'groom', 'pending', 2),
  g('Heng Dara', '010 444 505', 'groom', 'declined', 0),
  g('Keo Rithy', '015 555 606', 'groom', 'confirmed', 1, '2'),
  g('Lim Chanthou', '092 666 707', 'groom', 'pending', 3),
  g('Sam Bunthoeun', '011 777 808', 'groom', 'confirmed', 2, '3', 'vegetarian'),
  g('Uncle Vuthy & family', '', 'groom', 'pending', 5),
  g('Tep Sovann', '088 888 909', 'groom', 'confirmed', 2, '3'),
  g('Sro Bopha & family', '012 999 110', 'bride', 'confirmed', 5, '4'),
  g('ស្រូ វិចិត្រ', '012 999 111', 'bride', 'confirmed', 2, '4'),
  g('Nhem Sreyneang', '093 121 212', 'bride', 'confirmed', 2, '5', 'halal'),
  g('Ouk Pisey', '097 131 313', 'bride', 'pending', 2),
  g('Phan Kosal', '016 141 414', 'bride', 'confirmed', 3, '5'),
  g('Ros Malis', '070 151 515', 'bride', 'declined', 0),
  g('Chhim Sopheak', '081 161 616', 'bride', 'confirmed', 1, ''),
  g('Kim Leakhena', '098 171 717', 'bride', 'pending', 2),
  g('Ly Sothea', '069 181 818', 'bride', 'confirmed', 2, '6', 'no_seafood'),
  g('Aunt Sophal', '', 'bride', 'pending', 3),
];


export const sampleWishes: { name: string; message: string; status: 'pending' | 'approved' | 'hidden' }[] = [
  { name: 'Chea Vannak', message: 'Congratulations, brother! Wishing you both a lifetime of love and laughter.', status: 'approved' },
  { name: 'នាង ស្រីនាង', message: 'សូមជូនពរឱ្យប្អូនទាំងពីរមានសុភមង្គល រស់នៅជាមួយគ្នារហូតដល់ចាស់កោងខ្នង។', status: 'approved' },
  { name: 'Ly Sothea', message: 'So happy for you two! Can’t wait to dance at the reception.', status: 'approved' },
  { name: 'Phan Kosal', message: 'May your home always be full of warmth, good food and family.', status: 'approved' },
  { name: 'យិន សុភាព', message: 'សូមអបអរសាទរ! សូមឱ្យគូស្វាមីភរិយាថ្មីជួបតែសេចក្តីសុខ សេចក្តីចម្រើន។', status: 'pending' },
  { name: 'Kim Leakhena', message: 'Rothanakpanha, you deserve all the happiness in the world. Love you!', status: 'pending' },
  { name: 'spam bot', message: 'Visit my site for cheap watches', status: 'hidden' },
];
