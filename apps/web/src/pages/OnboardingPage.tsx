import { useState, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Server,
  Activity,
  Bell,
  Globe,
  ArrowRight,
  Check,
  ChevronLeft,
} from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Create your workspace',
    description: 'Set up your workspace to organize services and monitors',
    icon: Server,
  },
  {
    id: 2,
    title: 'Add your first service',
    description: 'Group related monitors under a service',
    icon: Activity,
  },
  {
    id: 3,
    title: 'Configure a monitor',
    description: 'Set up checks for your endpoints',
    icon: Activity,
  },
  {
    id: 4,
    title: 'Set up alerts',
    description: 'Connect notification channels',
    icon: Bell,
  },
  {
    id: 5,
    title: 'Create status page',
    description: 'Publish a public status page',
    icon: Globe,
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const completeOnboarding = () => {
    navigate('/app/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome to PulseBoard</h1>
        <p className="text-gray-500">Let's get you set up in a few steps</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`w-3 h-3 rounded-full ${
              index < currentStep ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              {createElement(steps[currentStep - 1].icon, {
                className: 'h-6 w-6 text-primary-600',
              })}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{steps[currentStep - 1].title}</h2>
              <p className="text-gray-500 mt-1">{steps[currentStep - 1].description}</p>
            </div>
          </div>

          {currentStep === 1 && (
            <div className="space-y-4">
              <Input label="Workspace Name" placeholder="My Company" />
              <Input label="Slug" placeholder="my-company" hint="Used in URLs" />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <Input label="Service Name" placeholder="API Backend" />
              <div>
                <label className="text-sm font-medium block mb-2">Environment</label>
                <select className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3">
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Development</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <Input label="Monitor Name" placeholder="Health Check" />
              <div>
                <label className="text-sm font-medium block mb-2">Type</label>
                <select className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3">
                  <option value="http">HTTP Check</option>
                  <option value="websocket">WebSocket Check</option>
                </select>
              </div>
              <Input label="URL" placeholder="https://api.example.com/health" />
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Alert Channel Type</label>
                <select className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3">
                  <option value="slack">Slack</option>
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
              <Input label="Channel Name" placeholder="Engineering Team" />
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <Input label="Status Page Name" placeholder="My Company Status" />
              <Input label="Slug" placeholder="my-company" hint="URL: status.pulseboard.dev/my-company" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {currentStep < steps.length ? (
          <Button onClick={() => setCurrentStep(currentStep + 1)}>
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={completeOnboarding}>
            <Check className="h-4 w-4 mr-1" />
            Finish Setup
          </Button>
        )}
      </div>

      {/* Skip */}
      <div className="text-center mt-6">
        <button
          onClick={completeOnboarding}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Skip setup, take me to the dashboard
        </button>
      </div>
    </div>
  );
}