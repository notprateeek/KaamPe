import type { UserProfile } from '../context/AppContext';

export const INDIAN_STATES = [
  'Punjab',
  'Delhi',
  'Haryana',
  'Uttar Pradesh',
  'Maharashtra',
  'Rajasthan',
  'Bihar',
  'Madhya Pradesh',
  'West Bengal',
  'Gujarat',
  'Karnataka',
  'Tamil Nadu',
  'Telangana',
  'Other',
];

export const WORKER_TYPES: UserProfile['workerType'][] = [
  'delivery',
  'driver',
  'construction',
  'domestic',
  'daily_wage',
  'street_vendor',
  'other',
];
