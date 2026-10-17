import { Home, Wallet, LifeBuoy, UserRound, LucideIcon } from 'lucide-react';
import { Translations } from '../../i18n/translations';
import type { TabId } from '../../context/AppContext';

export type { TabId };

export interface NavItem {
  id: TabId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const getNavItems = (t: Translations): NavItem[] => [
  { id: 'home', label: t.nav.home, description: t.nav.homeDesc, icon: Home },
  { id: 'money', label: t.nav.money, description: t.nav.moneyDesc, icon: Wallet },
  { id: 'help', label: t.nav.help, description: t.nav.helpDesc, icon: LifeBuoy },
  { id: 'me', label: t.nav.me, description: t.nav.meDesc, icon: UserRound },
];
