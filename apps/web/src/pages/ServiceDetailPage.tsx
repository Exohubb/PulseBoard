import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Activity,
  Clock,
  TrendingUp,
  Plus,
  Settings,
  AlertTriangle,
} from 'lucide-react';

export function ServiceDetailPage() {
  const { id } = useParams();

  // Mock data
  const service = {
    id,
    name: 'API Backend',
    slug: 'api-backend',
    status: 'up',
    description: 'Main REST API service',
    environment: 'production',
    tags: ['api', 'critical'],
    uptime24h: 99.9,
    uptime7d: 99.95,
    avgLatency: 120,
    monitorCount: 3,
  };

  const monitors = [
    { id: '1', name: 'Health Check', type: 'http', status: 'up', lastRun: '2 min ago', latency: '45ms' },
    { id: '2', name: 'Auth Endpoint', type: 'http', status: 'up', lastRun: '2 min ago', latency: '78ms' },
    { id: '3', name: 'WebSocket Test', type: 'websocket', status: 'down', lastRun: '5 min ago', latency: 'Timeout' },
  ];

  const incidents = [
    { id: '1', title: 'High latency', severity: 'medium', status: 'resolved', createdAt: '2 hours ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Activity className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{service.name}</h1>
            <p className="text-gray-500">{service.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={service.status} />
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Uptime 24h</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{service.uptime24h}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Uptime 7d</span>
            </div>
            <p className="text-2xl font-bold">{service.uptime7d}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Avg Latency</span>
            </div>
            <p className="text-2xl font-bold">{service.avgLatency}ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs">Monitors</span>
            </div>
            <p className="text-2xl font-bold">{service.monitorCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monitors */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Monitors</CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Monitor
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b dark:border-gray-800">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Latency</th>
                  <th className="pb-3 font-medium">Last Run</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {monitors.map((monitor) => (
                  <tr key={monitor.id} className="border-b dark:border-gray-800 last:border-0">
                    <td className="py-3 font-medium">{monitor.name}</td>
                    <td className="py-3">
                      <Badge variant="default">{monitor.type}</Badge>
                    </td>
                    <td className="py-3">
                      <StatusBadge status={monitor.status} />
                    </td>
                    <td className="py-3 font-mono">{monitor.latency}</td>
                    <td className="py-3 text-gray-500">{monitor.lastRun}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Recent Incidents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No incidents</p>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{incident.title}</span>
                    <Badge variant={incident.status === 'resolved' ? 'success' : 'warning'}>
                      {incident.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{incident.createdAt}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}