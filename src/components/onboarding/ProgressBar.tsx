import { memo } from 'react';
import { StepId, StepInfo, StepStatus } from '../../hooks/useOnboarding';
import { cn } from '../../lib/utils';

export const ProgressBar = memo(({ steps, activeStep, stepStatuses }: { steps: StepInfo[]; activeStep: StepId; stepStatuses: Record<StepId, StepStatus>; }) => (
  <div className="flex items-start justify-center">
    {steps.map((s, i) => <StepItem key={s.id} step={s} index={i} active={s.id === activeStep} status={stepStatuses[s.id]} />)}
  </div>
));

const StepItem = ({ step, index, active, status }: any) => {
  const isDone = status === 'done';
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center">
        {index > 0 && <div className={cn('w-8 h-0.5', isDone ? 'bg-green-400' : 'bg-neutral-200')} />}
        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center transition-all', isDone ? 'bg-green-500' : active ? 'bg-black' : 'bg-neutral-200')}>
          {isDone && <CheckIcon />}
        </div>
      </div>
      <span className={cn('text-[11px] font-medium whitespace-nowrap leading-none mt-1.5', active ? 'text-black' : isDone ? 'text-green-600' : 'text-neutral-400')}>{step.label}</span>
    </div>
  );
};

const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
