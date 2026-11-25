import type { ReactNode } from 'react';

interface FlowHeaderProps {
  context: string;
  title: string;
  description?: string;
  steps: readonly string[];
  currentStep: number;
  children?: ReactNode;
}

export function FlowHeader({ context, title, description, steps, currentStep, children }: FlowHeaderProps) {
  return (
    <header className="pa02-flow-header">
      <div className="pa02-flow-title">
        <div>
          <p className="pa02-context">{context}</p>
          <h1 tabIndex={-1}>{title}</h1>
          {description && <p className="pa02-muted">{description}</p>}
        </div>
        {children && <div className="pa02-actions">{children}</div>}
      </div>
      <ol className="pa02-steps" aria-label="Tiến trình">
        {steps.map((step, index) => (
          <li key={step} aria-current={currentStep === index ? 'step' : undefined}>
            <span aria-hidden="true">{index < currentStep ? '✓' : index + 1}</span>{step}
          </li>
        ))}
      </ol>
    </header>
  );
}
