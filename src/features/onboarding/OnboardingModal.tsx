import React, { useState } from 'react';
import { useApp, UserProfile } from '../../context/AppContext';
import { Language } from '../../i18n/translations';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Check, PlayCircle } from 'lucide-react';
import { DemoLoginForm } from '../auth/DemoLogin';
import { INDIAN_STATES, WORKER_TYPES } from '../../constants/profile';

const LANGUAGES: Array<{ code: Language; label: string; sub: string }> = [
  { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
  { code: 'en', label: 'English', sub: 'English' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', sub: 'Punjabi' },
];

const choiceClass = (selected: boolean) =>
  `w-full flex items-center justify-between rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
    selected ? 'border-accent bg-accent-light text-ink ring-1 ring-accent' : 'border-hairline bg-surface-1 hover:bg-surface-2 text-ink'
  }`;

export const OnboardingModal: React.FC = () => {
  const { profile, updateLanguage, completeOnboarding, t } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLang, setSelectedLang] = useState<Language>(profile.language || 'hi');
  const [selectedWorker, setSelectedWorker] = useState<UserProfile['workerType']>(profile.workerType || 'delivery');
  const [selectedState, setSelectedState] = useState<string>(profile.state || 'Punjab');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleLangSelect = (lang: Language) => {
    setSelectedLang(lang);
    updateLanguage(lang);
    setStep(2);
  };

  const handleWorkerSelect = (worker: UserProfile['workerType']) => {
    setSelectedWorker(worker);
    setStep(3);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding(selectedWorker, selectedState);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = showDemo ? t.demo.loginTitle : step === 1 ? t.onboarding.step1Title : step === 2 ? t.onboarding.step2Title : t.onboarding.step3Title;

  return (
    // Not dismissible: the app needs a language and profile before it can be used
    <Dialog open onClose={() => {}} dismissible={false} title={title}>
      {showDemo && <DemoLoginForm idPrefix="onboarding-demo" onCancel={() => setShowDemo(false)} />}

      {/* Step indicator */}
      <div className={`${showDemo ? 'hidden' : 'flex'} items-center justify-between -mt-2 mb-5`}>
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? 'w-8 bg-accent' : s < step ? 'w-4 bg-ink' : 'w-4 bg-hairline'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-ink-muted">
          {t.onboarding.stepProgress.replace('{n}', String(step))}
        </span>
      </div>

      {/* SCREEN 1: Language */}
      {step === 1 && !showDemo && (
        <>
        <fieldset>
          <legend className="text-sm text-ink-muted mb-4">{t.onboarding.step1Subtitle}</legend>
          <div className="space-y-3">
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  lang={lang.code}
                  aria-pressed={isSelected}
                  onClick={() => handleLangSelect(lang.code)}
                  className={`${choiceClass(isSelected)} p-4`}
                >
                  <span>
                    <span className="block text-lg font-semibold">{lang.label}</span>
                    <span className="block text-xs text-ink-muted" lang="en">
                      {lang.sub}
                    </span>
                  </span>
                  {isSelected && <Check className="w-5 h-5 text-accent" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Shortcut for testers: a pre-filled demo account instead of setup */}
        <div className="mt-5 pt-4 border-t border-hairline-soft">
          <p className="text-sm font-semibold text-ink">{t.demo.cardTitle}</p>
          <p className="text-xs text-ink-muted mb-2.5">{t.demo.cardText}</p>
          <Button variant="secondary" size="md" fullWidth onClick={() => setShowDemo(true)} className="gap-2">
            <PlayCircle className="w-4 h-4" aria-hidden="true" />
            {t.demo.tryDemo}
          </Button>
        </div>
        </>
      )}

      {/* SCREEN 2: Work */}
      {step === 2 && !showDemo && (
        <div>
          <fieldset>
            <legend className="text-sm text-ink-muted mb-4">{t.onboarding.step2Subtitle}</legend>
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto p-1 -m-1">
              {WORKER_TYPES.map((id) => {
                const isSelected = selectedWorker === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleWorkerSelect(id)}
                    className={`${choiceClass(isSelected)} p-3.5 ${isSelected ? 'font-semibold' : ''}`}
                  >
                    <span className="text-sm">{t.onboarding.workerTypes[id]}</span>
                    {isSelected && <Check className="w-4 h-4 text-accent" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="md" onClick={() => setStep(1)} className="flex-1">
              {t.onboarding.back}
            </Button>
          </div>
        </div>
      )}

      {/* SCREEN 3: State */}
      {step === 3 && !showDemo && (
        <div>
          <p id="onboarding-state-hint" className="text-sm text-ink-muted mb-4">
            {t.onboarding.step3Subtitle}
          </p>

          <div className="space-y-2 mb-6">
            <label htmlFor="state-select" className="block text-xs font-semibold uppercase text-ink-muted mb-1">
              {t.onboarding.stateLabel}
            </label>
            <select
              id="state-select"
              aria-describedby="onboarding-state-hint"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-surface-1 text-ink border border-hairline rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="md" onClick={() => setStep(2)}>
              {t.onboarding.back}
            </Button>
            <Button variant="accent" size="md" className="flex-1" onClick={handleFinish} isLoading={isSubmitting}>
              {t.onboarding.continue}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
};
