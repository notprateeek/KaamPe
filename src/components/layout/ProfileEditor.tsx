import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useApp, UserProfile } from '../../context/AppContext';
import { INDIAN_STATES, WORKER_TYPES } from '../../constants/profile';
import { Button } from '../ui/Button';

/**
 * Edit work type and state. Three clicks from anywhere: open → pick → save.
 * Persists through the same session endpoint onboarding uses.
 */
export const ProfileEditor: React.FC<{ idPrefix: string; onDone: () => void }> = ({ idPrefix, onDone }) => {
  const { profile, completeOnboarding, t } = useApp();
  const [worker, setWorker] = useState<UserProfile['workerType']>(profile.workerType);
  const [state, setState] = useState(profile.state);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await completeOnboarding(worker, state);
      onDone();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="text-xs font-semibold text-ink-muted mb-1.5">{t.profileEditor.work}</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {WORKER_TYPES.map((type) => {
            const selected = worker === type;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={selected}
                onClick={() => setWorker(type)}
                className={`min-h-[44px] px-2 rounded-subtle text-sm flex items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                  selected
                    ? 'bg-ink text-inverse font-bold'
                    : 'bg-surface-1 text-ink font-medium border border-hairline hover:border-ink'
                }`}
              >
                {selected && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                {t.profileEditor.workerShort[type]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${idPrefix}-state`} className="block text-xs font-semibold text-ink-muted mb-1.5">
          {t.profileEditor.state}
        </label>
        <select
          id={`${idPrefix}-state`}
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full min-h-[44px] bg-surface-1 text-ink border border-hairline rounded-subtle px-3 text-sm font-medium focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
        >
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" size="md" onClick={onDone} className="flex-1">
          {t.profileEditor.cancel}
        </Button>
        <Button type="button" variant="accent" size="md" onClick={handleSave} isLoading={isSaving} className="flex-[2]">
          {t.profileEditor.save}
        </Button>
      </div>
    </div>
  );
};
