import { cn, getSeverityBgColor } from '../../lib/utils';

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

const severityLabels: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', getSeverityBgColor(severity), className)}>
      {severityLabels[severity] || severity}
    </span>
  );
}