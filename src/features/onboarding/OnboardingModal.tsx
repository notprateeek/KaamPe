import React, { useState } from 'react';
import { useApp, UserProfile } from '../../context/AppContext';
import { Language } from '../../i18n/translations';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Check } from 'lucide-react';

const INDIAN_STATES = [
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

export const OnboardingModal: React.FC = () => {
  const { profile, updateLanguage, completeOnboarding, t } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLang, setSelectedLang] = useState<Language>(profile.language || 'hi');
  const [selectedWorker, setSelectedWorker] = useState<UserProfile['workerType']>(profile.workerType || 'delivery');
  const [selectedState, setSelectedState] = useState<string>(profile.state || 'Punjab');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <Card className="w-full max-w-sm bg-surface-1 shadow-float border border-hairline p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1.5">
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
            {step} / 3
          </span>
        </div>

        {/* SCREEN 1: Language */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold text-ink mb-1">
              {t.onboarding.step1Title}
            </h1>
            <p className="text-sm text-ink-muted mb-5">
              {t.onboarding.step1Subtitle}
            </p>

            <div className="space-y-3">
              {[
                { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
                { code: 'en', label: 'English', sub: 'English' },
                { code: 'pa', label: 'ਪੰਜਾਬੀ', sub: 'Punjabi' },
              ].map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLangSelect(lang.code as Language)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-accent bg-accent-light text-ink ring-1 ring-accent'
                        : 'border-hairline bg-surface-1 hover:bg-surface-2 text-ink'
                    }`}
                  >
                    <div>
                      <div className="text-lg font-semibold">{lang.label}</div>
                      <div className="text-xs text-ink-muted">{lang.sub}</div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-accent" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN 2: Work */}
        {step === 2 && (
          <div>
            <h1 className="text-xl font-bold text-ink mb-1">
              {t.onboarding.step2Title}
            </h1>
            <p className="text-sm text-ink-muted mb-4">
              {selectedLang === 'hi' ? 'Sahi jaankari ke liye apna kaam chunein' : 'Select your primary work'}
            </p>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {(
                [
                  { id: 'delivery', label: t.onboarding.workerTypes.delivery },
                  { id: 'driver', label: t.onboarding.workerTypes.driver },
                  { id: 'construction', label: t.onboarding.workerTypes.construction },
                  { id: 'domestic', label: t.onboarding.workerTypes.domestic },
                  { id: 'daily_wage', label: t.onboarding.workerTypes.daily_wage },
                  { id: 'other', label: t.onboarding.workerTypes.other },
                ] as const
              ).map((w) => {
                const isSelected = selectedWorker === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => handleWorkerSelect(w.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-accent bg-accent-light text-ink font-semibold'
                        : 'border-hairline bg-surface-1 hover:bg-surface-2 text-ink'
                    }`}
                  >
                    <span className="text-sm">{w.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-accent" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="md" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
            </div>
          </div>
        )}

        {/* SCREEN 3: State */}
        {step === 3 && (
          <div>
            <h1 className="text-xl font-bold text-ink mb-1">
              {t.onboarding.step3Title}
            </h1>
            <p className="text-sm text-ink-muted mb-4">
              {selectedLang === 'hi' ? 'Sarkari schemes aapke state ke hisaab se dikhengi' : 'Schemes and rights tailored to your state'}
            </p>

            <div className="space-y-2 mb-6">
              <label htmlFor="state-select" className="block text-xs font-semibold uppercase text-ink-muted mb-1">
                State / Rajya
              </label>
              <select
                id="state-select"
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
                Back
              </Button>
              <Button
                variant="accent"
                size="md"
                className="flex-1"
                onClick={handleFinish}
                isLoading={isSubmitting}
              >
                {t.onboarding.continue}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
