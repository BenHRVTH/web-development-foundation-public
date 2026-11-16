import { Check, Circle } from 'lucide-react';
export interface StatusBadgeProps {
  completed: boolean;
}
export function StatusBadge({ completed }: StatusBadgeProps) {
  const Icon = completed ? Check : Circle;
  return (
    <span
      className={`status-badge status-badge--${completed ? 'completed' : 'open'}`}
    >
      <Icon aria-hidden="true" />
      <span>{completed ? 'Kész' : 'Nyitott'}</span>
    </span>
  );
}
