import { ArrowUpRight } from 'lucide-react';
import type { Task } from '../tasks/model';
import { Checkbox } from './Checkbox';
import { StatusBadge } from './StatusBadge';
export interface TaskCardProps {
  task: Task;
  density?: 'compact' | 'comfortable' | 'spacious' | undefined;
  onToggle: (id: string) => void;
  href: string;
}
export function TaskCard({
  task,
  density = 'comfortable',
  onToggle,
  href,
}: TaskCardProps) {
  return (
    <article
      className={`task-card task-card--${density}`}
      data-completed={task.completed}
    >
      <Checkbox
        label={`${task.completed ? 'Teljesítés visszavonása' : 'Teljesítés'}: ${task.title}`}
        labelHidden
        checked={task.completed}
        onChange={() => onToggle(task.id)}
      />
      <div className="task-card__content">
        <div className="task-card__meta">
          <span className="task-id">{task.id.replace('task-', 'F–')}</span>
          <StatusBadge completed={task.completed} />
        </div>
        <h2>
          <a className="task-card__link" href={href}>
            <span>{task.title}</span>
            <ArrowUpRight aria-hidden="true" />
          </a>
        </h2>
        <p className="task-card__description">
          {task.description || 'Még nincs leírás. A részleteknél hozzáadhatod.'}
        </p>
      </div>
    </article>
  );
}
