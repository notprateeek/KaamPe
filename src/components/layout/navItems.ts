import { Home, Wallet, HelpCircle, LucideIcon } from 'lucide-react';
import { Translations } from '../../i18n/translations';

export type TabId = 'home' | 'money' | 'help';

export interface NavItem {
  id: TabId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const getNavItems = (t: Translations): NavItem[] => [
  { id: 'home', label: t.nav.home, description: t.nav.homeDesc, icon: Home },
  { id: 'money', label: t.nav.money, description: t.nav.moneyDesc, icon: Wallet },
  { id: 'help', label: t.nav.help, description: t.nav.helpDesc, icon: HelpCircle },
];
