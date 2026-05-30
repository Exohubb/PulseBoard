import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiPublic } from '../lib/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { Card, CardContent } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CheckCircle, AlertTriangle, Activity, AlertCircle } from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';

interface PublicComponent {
  id: string;
  name: string;
  status: string;
  service?: { name: string } | null;
  monitor?: { name: string } | null;
}

interface PublicIncident {
  id: string;
  title: string;
  severity: string;
  status: string;
  publicSummary?: string | null;
  impactSummary?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

interface PublicStatusData {
  id: string;
  name: string;
  slug: string;
  introText?: string | null;
  accentColor?: string;
  logoUrl?: string | null;
  overallStatus: string;
  components: PublicComponent[];
  activeIncidents: PublicIncident[];
  recentIncidents: PublicIncident[];
  upcomingMaintenance?: { id: string; title: string; startsAt: string; endsAt: string }[];
}

export function PublicStatusPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery<PublicStatusData | null>({
    queryKey: ['public-status', slug],
    queryFn: async () => (await apiPublic.get(`/public/status/${slug}`)).data,
    enabled: !!slug,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="font-medium">Status page not found</p>
            <p className="text-sm text-gray-500 mt-1">
              No published status page exists at <code className="font-mono">{slug}</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overall = data.overallStatus || 'operational';
  const isAllUp = overall === 'operational' || overall === 'up';
  const accent = data.accentColor || '#6366f1';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="" className="w-12 h-12 rounded-lg" />
            ) : (
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: accent }}>
                <Activity className="h-6 w-6 text-white" />
              </div>
            )}
            <h1 className="text-3xl font-bold">{data.name}</h1>
          </div>
          {data.introText && (
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-4">{data.introText}</p>
          )}
          <StatusBadge status={overall} className="text-base px-3 py-1" />
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <div
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                isAllUp
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              }`}
            >
              {isAllUp ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              )}
              <div>
                <p className={`text-lg font-semibold ${
                  isAllUp ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {isAllUp ? 'All Systems Operational' : 'Some Systems Degraded'}
                </p>
                <p className={`text-sm ${
                  isAllUp ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  {isAllUp
                    ? 'No issues detected at this time'
                    : `${data.activeIncidents.length} active incident(s)`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {data.components.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Components</h2>
              <div className="space-y-3">
                {data.components.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          c.status === 'up' || c.status === 'operational'
                            ? 'bg-green-500'
                            : c.status === 'degraded'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <span className="font-medium">{c.name || c.service?.name || c.monitor?.name}</span>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data.activeIncidents.length > 0 && (
          <Card className="mb-8 border-red-200 dark:border-red-900">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Active Incidents
              </h2>
              <div className="space-y-3">
                {data.activeIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <span className="font-medium">{incident.title}</span>
                      <SeverityBadge severity={incident.severity} />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {incident.publicSummary || incident.impactSummary || 'Investigating issue.'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Started {formatRelativeTime(new Date(incident.createdAt))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data.recentIncidents.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Incidents</h2>
              <div className="space-y-3">
                {data.recentIncidents.map((incident) => (
                  <div key={incident.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <span className="font-medium">{incident.title}</span>
                      <SeverityBadge severity={incident.severity} />
                    </div>
                    {incident.publicSummary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{incident.publicSummary}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {incident.resolvedAt
                        ? `Resolved ${formatRelativeTime(new Date(incident.resolvedAt))}`
                        : `Started ${formatRelativeTime(new Date(incident.createdAt))}`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-gray-500">
          <p>Powered by PulseBoard</p>
        </div>
      </div>
    </div>
  );
}
