import { useCallback, useEffect, useState } from 'react';
import { AUTO_EXIT_DELAY } from '../constants';
import { usePressAnyKey } from './usePressAnyKey';
import { useRetimer } from './useRetimer';

interface UseStepFlowOptions<TStep extends string> {
  initialStep: TStep;
  inputSteps: readonly TStep[];
  onComplete: (success: boolean) => void;
  showReturnHint?: boolean;
  autoExitDelay?: number;
  /** Optional step normalization (e.g., color-custom → color) */
  normalizeStep?: (step: TStep) => TStep;
}

export function useStepFlow<TStep extends string>({
  initialStep,
  inputSteps,
  onComplete,
  showReturnHint = false,
  autoExitDelay = AUTO_EXIT_DELAY,
  normalizeStep,
}: UseStepFlowOptions<TStep>) {
  const [step, setStep] = useState<TStep>(initialStep);
  const retimer = useRetimer();

  const getStepStatus = useCallback(
    (stepId: TStep): 'completed' | 'active' | 'pending' => {
      const currentStep = normalizeStep ? normalizeStep(step) : step;
      const normalizedStepId = normalizeStep ? normalizeStep(stepId) : stepId;

      const currentIndex = inputSteps.indexOf(currentStep);
      const stepIndex = inputSteps.indexOf(normalizedStepId);

      if (currentIndex === -1) return 'completed';
      if (stepIndex < currentIndex) return 'completed';
      if (stepIndex === currentIndex) return 'active';
      return 'pending';
    },
    [step, inputSteps, normalizeStep],
  );

  // Auto-exit on done/error
  useEffect(() => {
    const isDone = step === ('done' as TStep);
    const isError = step === ('error' as TStep);

    if ((isDone || isError) && !showReturnHint) {
      retimer(setTimeout(() => onComplete(isDone), autoExitDelay));
    }

    return () => retimer();
  }, [step, showReturnHint, onComplete, autoExitDelay, retimer]);

  // Press any key to return
  usePressAnyKey((step === ('done' as TStep) || step === ('error' as TStep)) && showReturnHint, () =>
    onComplete(step === ('done' as TStep)),
  );

  return {
    step,
    setStep,
    getStepStatus,
    retimer,
  };
}
