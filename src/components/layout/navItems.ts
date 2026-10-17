import {
  Home,
  Wallet,
  LifeBuoy,
  UserRound,
  MessageCircle,
  Landmark,
  Scale,
  ShieldCheck,
  FileText,
  PenLine,
  LucideIcon,
} from 'lucide-react';
import type { Translations } from '../../i18n/translations';
import type { TabId } from '../../context/AppContext';
import type { HelpTab } from '../../features/help/HelpView';

export type { TabId };

export interface NavItem {
  id: TabId;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Mobile bottom bar: four destinations (names are relied on by e2e tests). */
export const getNavItems = (t: Translations): NavItem[] => [
  { id: 'home', label: t.nav.home, description: t.nav.homeDesc, icon: Home },
  { id: 'money', label: t.nav.money, description: t.nav.moneyDesc, icon: Wallet },
  { id: 'help', label: t.nav.help, description: t.nav.helpDesc, icon: LifeBuoy },
  { id: 'me', label: t.nav.me, description: t.nav.meDesc, icon: UserRound },
];

/** A top-level destination or one of the Help sections, shown as its own tool. */
export type ToolTarget = { tab: Exclude<TabId, 'help'> } | { help: HelpTab };

export interface ToolItem {
  key: string;
  target: ToolTarget;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Full tool list for the desktop sidebar and the mobile menu drawer. */
export const getToolItems = (t: Translations): ToolItem[] => [
  { key: 'home', target: { tab: 'home' }, label: t.tools.assistant, description: t.tools.assistantDesc, icon: MessageCircle },
  { key: 'money', target: { tab: 'money' }, label: t.nav.money, description: t.nav.moneyDesc, icon: Wallet },
  { key: 'schemes', target: { help: 'schemes' }, label: t.tools.schemes, description: t.tools.schemesDesc, icon: Landmark },
  { key: 'rights', target: { help: 'rights' }, label: t.tools.rights, description: t.tools.rightsDesc, icon: Scale },
  { key: 'safety', target: { help: 'safety' }, label: t.tools.safety, description: t.tools.safetyDesc, icon: ShieldCheck },
  { key: 'documents', target: { help: 'doc' }, label: t.tools.documents, description: t.tools.documentsDesc, icon: FileText },
  { key: 'complaint', target: { help: 'dispute' }, label: t.tools.complaint, description: t.tools.complaintDesc, icon: PenLine },
];

export function isToolActive(item: ToolItem, activeTab: TabId, helpTab: HelpTab): boolean {
  return 'tab' in item.target ? activeTab === item.target.tab : activeTab === 'help' && helpTab === item.target.help;
}
