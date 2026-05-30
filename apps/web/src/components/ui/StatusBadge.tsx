import { cn, getStatusBgColor } from '../../lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusLabels: Record<string, string> = {
  up: 'Up',
  slow: 'Slow',
  down: 'Down',
  degraded: 'Degraded',
  paused: 'Paused',
  maintenance: 'Maintenance',
  pending: 'Pending',
  operational: 'Operational',
  incident: 'Incident',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusBgColor(status), className)}>
      <span className="relative flex h-2 w-2 mr-1.5">
        <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', status === 'up' ? 'bg-green-400' : status === 'slow' ? 'bg-yellow-400' : 'bg-red-400')} />
        <span className={cn('relative inline-flex rounded-full h-2 w-2', status === 'up' ? 'bg-green-500' : status === 'slow' ? 'bg-yellow-500' : 'bg-red-500')} />
      </span>
      {statusLabels[status] || status}
    </span>
  );
}