import { Checkmark01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { StepId, StepInfo, StepStatus } from '../../hooks/useOnboarding';

interface ProgressBarProps {
  steps: StepInfo[];
  activeStep: StepId;
  stepStatuses: Record<StepId, StepStatus>;
}

export function ProgressBar({ steps, activeStep, stepStatuses }: ProgressBarProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const status = stepStatuses[step.id];
        const isActive = step.id === activeStep;
        const isDone = status === 'done';

        let circleClass = 'border-2 border-neutral-200 bg-white';
        let inner = null;
        if (isDone) {
          circleClass = 'bg-green-500 border-green-500';
          inner = <HugeiconsIcon icon={Checkmark01Icon} size={10} color="white" strokeWidth={3} />;
        } else if (isActive) {
          circleClass = 'bg-black border-black';
        }

        return (
          <div key={step.id} className="flex items-center">
            {i > 0 && (
              <div className={`w-6 h-px ${isDone ? 'bg-green-300' : 'bg-neutral-200'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${circleClass}`}>
                {inner}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  isActive ? 'text-black' : isDone ? 'text-green-600' : 'text-neutral-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
