import { useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui/Toast';
import { deleteMoneyEntry, fill, formatPaise, type MoneyEntryKind } from './moneyUtils';

/**
 * Returns `notifySaved`, which shows the "saved ₹x" toast with an Undo action.
 * Undo deletes the entry, then calls `onChanged` so the caller can refresh.
 */
export function useSavedEntryToast() {
  const { t } = useApp();
  const { showToast } = useToast();

  return useCallback(
    (kind: MoneyEntryKind, paise: number, entryId: string | undefined, onChanged: () => void | Promise<void>) => {
      const message = fill(kind === 'earning' ? t.money.savedEarningToast : t.money.savedExpenseToast, {
        amount: formatPaise(paise),
      });
      if (!entryId) {
        showToast(message);
        return;
      }
      showToast(message, {
        label: t.common.undo,
        onAction: () =>
          deleteMoneyEntry(entryId)
            .then(async () => {
              await onChanged();
              showToast(t.money.undoneToast);
            })
            .catch(() => showToast(t.money.errorDelete)),
      });
    },
    [t, showToast]
  );
}
