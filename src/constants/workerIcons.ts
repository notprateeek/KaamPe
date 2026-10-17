import { Bike, Car, HardHat, Sparkles, Hammer, Store, Briefcase, LucideIcon } from 'lucide-react';
import type { UserProfile } from '../context/AppContext';

/** One icon per kind of work, used for the profile avatar. */
export const WORKER_ICONS: Record<UserProfile['workerType'], LucideIcon> = {
  delivery: Bike,
  driver: Car,
  construction: HardHat,
  domestic: Sparkles,
  daily_wage: Hammer,
  street_vendor: Store,
  other: Briefcase,
};

/** Platforms offered as one-tap sources when adding an earning. */
export const WORKER_PLATFORMS: Record<UserProfile['workerType'], string[]> = {
  delivery: ['Swiggy', 'Zomato', 'Zepto', 'Blinkit'],
  driver: ['Uber', 'Ola', 'Rapido'],
  construction: ['Thekedar', 'Cash'],
  domestic: ['Cash', 'UPI'],
  daily_wage: ['Cash', 'UPI'],
  street_vendor: ['Cash', 'UPI'],
  other: ['Cash', 'UPI'],
};
