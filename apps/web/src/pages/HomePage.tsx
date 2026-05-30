import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Server,
  Shield,
  Bell,
  Globe,
  Zap,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Github,
  Sparkles,
  Cpu,
  GitBranch,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

/* ---------- helpers ---------- */

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useCounter(target: number, ms = 1400, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, start]);
  return val;
}

/* ---------- cursor blob ---------- */

function CursorBlob() {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (hidden) setHidden(false);
    };
    const onLeave = () => setHidden(true);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    let raf = 0;
    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.12;
      pos.current.y += (target.current.y - pos.current.y) * 0.12;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${pos.current.x - 220}px, ${pos.current.y - 220}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [hidden]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed top-0 left-0 z-0 w-[440px] h-[440px] rounded-full transition-opacity duration-300 hidden md:block ${
        hidden ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)',
        filter: 'blur(20px)',
      }}
    />
  );
}

/* ---------- floating shape that follows cursor with parallax ---------- */

function ParallaxShape({
  className,
  strength = 20,
  children,
}: {
  className?: string;
  strength?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [strength]);
  return (
    <div ref={ref} className={className} aria-hidden>
      {children}
    </div>
  );
}

/* ---------- live status preview ---------- */

function LiveStatusPreview() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(i);
  }, []);

  const services = [
    { name: 'API Gateway', latency: 42 + (tick % 4) * 3, status: 'up' as const },
    { name: 'Auth Service', latency: 78 + (tick % 3) * 5, status: 'up' as const },
    { name: 'WebSocket Stream', latency: 31 + (tick % 5) * 2, status: 'up' as const },
    { name: 'Payment API', latency: 110 + (tick % 6) * 8, status: tick % 12 < 3 ? ('degraded' as const) : ('up' as const) },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <p className="text-xs text-gray-500 ml-2 font-mono">pulseboard.dev/dashboard</p>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 pulse-ring" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Live
        </div>
      </div>

      <div className="p-5 space-y-3">
        {services.map((s, idx) => (
          <div
            key={s.name}
            className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                s.status === 'up' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <div className="flex items-end gap-0.5 h-5 mt-1">
                {Array.from({ length: 28 }).map((_, i) => {
                  const seed = (i * 7 + idx * 13 + tick) % 11;
                  const h = 30 + seed * 6;
                  const ok = s.status === 'up' || i < 22;
                  return (
                    <span
                      key={i}
                      className={`w-1 rounded-sm ${ok ? 'bg-green-500/70' : 'bg-yellow-500/80'}`}
                      style={{ height: `${h}%`, transition: 'height 1.2s ease' }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono">{s.latency}ms</p>
              <p className="text-xs text-gray-500">99.9%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- stats with counter on view ---------- */

function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const checks = useCounter(248_000, 1800, visible);
  const uptime = useCounter(99.9, 1600, visible);
  const incidents = useCounter(87, 1400, visible);
  const integrations = useCounter(8, 1200, visible);

  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
      {[
        { label: 'Checks per month', value: Math.floor(checks).toLocaleString() },
        { label: 'Avg uptime SLA', value: `${uptime.toFixed(1)}%` },
        { label: 'Incidents resolved', value: Math.floor(incidents).toLocaleString() },
        { label: 'Integrations', value: `${Math.floor(integrations)}+` },
      ].map((s, i) => (
        <div key={s.label} className={`text-center reveal reveal-delay-${(i % 4) + 1}`}>
          <p className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary-600 to-purple-600 bg-clip-text text-transparent">
            {s.value}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- FAQ ---------- */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <h4 className="font-semibold">{q}</h4>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </div>
      <div
        className={`grid transition-all duration-300 ${
          open ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-gray-600 dark:text-gray-400">{a}</p>
        </div>
      </div>
    </button>
  );
}

/* ---------- main page ---------- */

export function HomePage() {
  useScrollReveal();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden relative">
      <CursorBlob />

      {/* Header */}
      <header
        className={`sticky top-0 z-40 transition-all ${
          scrolled
            ? 'border-b border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl'
            : 'border-b border-transparent'
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold">PulseBoard</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-600 dark:text-gray-400">
            <a href="#features" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Features</a>
            <a href="#how" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">How it works</a>
            <a href="#configure" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Configure</a>
            <a href="#faq" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:inline text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
              Sign in
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 md:pt-28 pb-24 md:pb-36">
        <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />
        <div className="glow-blob bg-primary-500 w-[480px] h-[480px] -top-20 -left-20 float-slow" aria-hidden />
        <div className="glow-blob bg-purple-500 w-[420px] h-[420px] top-40 -right-32 float-mid" aria-hidden />
        <div className="glow-blob bg-cyan-400 w-[300px] h-[300px] bottom-0 left-1/4 float-fast" aria-hidden />

        <ParallaxShape className="absolute top-32 left-[8%] hidden lg:block" strength={30}>
          <div className="w-16 h-16 rounded-2xl border border-primary-300/40 dark:border-primary-500/30 bg-primary-100/30 dark:bg-primary-900/10 backdrop-blur-sm float-slow flex items-center justify-center">
            <Cpu className="h-7 w-7 text-primary-500/70" />
          </div>
        </ParallaxShape>
        <ParallaxShape className="absolute top-48 right-[10%] hidden lg:block" strength={40}>
          <div className="w-12 h-12 rounded-xl border border-purple-300/40 dark:border-purple-500/30 bg-purple-100/30 dark:bg-purple-900/10 backdrop-blur-sm float-mid rotate-12 flex items-center justify-center">
            <Zap className="h-5 w-5 text-purple-500/70" />
          </div>
        </ParallaxShape>
        <ParallaxShape className="absolute bottom-48 left-[12%] hidden lg:block" strength={20}>
          <div className="w-14 h-14 rounded-full border border-cyan-300/40 dark:border-cyan-500/30 bg-cyan-100/30 dark:bg-cyan-900/10 backdrop-blur-sm float-fast flex items-center justify-center">
            <Globe className="h-6 w-6 text-cyan-500/70" />
          </div>
        </ParallaxShape>

        <div className="relative container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Open source · Self-host or cloud
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Real-time API health
              <br />
              <span className="bg-gradient-to-br from-primary-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                & incident command
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-6">
              Monitor APIs and WebSockets, detect incidents the moment they happen, alert the right
              channel, and publish a status page your users actually trust.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
              <Link to="/register">
                <Button size="lg" className="gap-2 shadow-lg shadow-primary-500/30">
                  Start free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">Try demo</Button>
              </Link>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              demo@pulseboard.dev · password: <code className="font-mono">demo1234</code>
            </p>
          </div>

          {/* Live preview */}
          <div className="relative max-w-3xl mx-auto mt-16 reveal reveal-delay-2">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-2xl" aria-hidden />
            <div className="relative">
              <LiveStatusPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 md:py-20 border-y border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="container mx-auto px-4">
          <StatsBar />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24">
        <div className="absolute inset-0 dot-bg opacity-30 pointer-events-none" aria-hidden />
        <div className="relative container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-bold">Everything you need to stay online</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Built for teams that want visibility without the enterprise weight.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Server, title: 'HTTP Monitoring', desc: 'Response times, status codes, and JSON assertions on the schedule you choose.' },
              { icon: Zap, title: 'WebSocket Monitoring', desc: 'Verify real-time connections, auth flows, and subscription patterns end-to-end.' },
              { icon: Shield, title: 'Security Scanner', desc: 'OWASP-style checks for WebSocket endpoints — auth, origin, rate limits, more.' },
              { icon: AlertTriangle, title: 'Incident Management', desc: 'Auto-create incidents, track timeline, assign owners, document postmortems.' },
              { icon: Bell, title: 'Smart Alerting', desc: 'Slack, email, and webhooks with cooldown and dedup. Alert only when it matters.' },
              { icon: Globe, title: 'Status Pages', desc: 'Branded public pages with uptime history and live incidents.' },
            ].map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={(i % 3) + 1} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent dark:via-gray-900/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-bold">From zero to monitored in 4 steps</h2>
          </div>
          <div className="relative max-w-5xl mx-auto">
            <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary-500/0 via-primary-500/40 to-primary-500/0" aria-hidden />
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { n: 1, title: 'Add services', desc: 'Group monitors by service for clean status pages.' },
                { n: 2, title: 'Configure checks', desc: 'Set intervals, timeouts, and failure thresholds.' },
                { n: 3, title: 'Get alerted', desc: 'Slack, email, or webhooks the moment things drift.' },
                { n: 4, title: 'Publish status', desc: 'Share live health with the people who depend on you.' },
              ].map((s) => (
                <div key={s.n} className={`text-center reveal reveal-delay-${s.n}`}>
                  <div className="relative w-14 h-14 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full bg-primary-500/20 blur-xl" aria-hidden />
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-primary-500/30">
                      {s.n}
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Configure section */}
      <section id="configure" className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-14 reveal">
            <h2 className="text-3xl md:text-4xl font-bold">Configurable, not complicated</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Three monitor types, sensible defaults, and clear hints next to every field.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Server,
                title: 'HTTP Monitor',
                color: 'from-blue-500 to-cyan-500',
                desc: 'REST endpoints and HTTP services',
                fields: [
                  ['URL', 'https://api.example.com/health'],
                  ['Method', 'GET'],
                  ['Interval', 'Every 60s'],
                  ['Expected', '200'],
                ],
                why: 'Detects API downtime and slow responses before users do.',
              },
              {
                icon: Zap,
                title: 'WebSocket Monitor',
                color: 'from-purple-500 to-pink-500',
                desc: 'Real-time connections and subscriptions',
                fields: [
                  ['URL', 'wss://stream.example.com/socket'],
                  ['Auth', '{"event":"auth","token":"…"}'],
                  ['Subscribe', '{"event":"subscribe"}'],
                  ['Expect', 'subscribed'],
                ],
                why: 'Confirms real-time channels are usable, not just connectable.',
              },
              {
                icon: Shield,
                title: 'Security Scanner',
                color: 'from-amber-500 to-orange-500',
                desc: 'Safe OWASP-style WebSocket checks',
                fields: [
                  ['Target', 'wss://api.example.com/socket'],
                  ['Checks', 'Auth · Origin · Rate · Schema'],
                  ['Mode', 'Safe Active'],
                  ['Cap', '50 messages'],
                ],
                why: 'Catches risky WebSocket behavior early, non-destructively.',
              },
            ].map((c, i) => (
              <div
                key={c.title}
                className={`group relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 hover:border-transparent transition-all hover:shadow-xl hover:-translate-y-1 reveal reveal-delay-${i + 1}`}
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${c.color} opacity-0 group-hover:opacity-[0.08] transition-opacity`} aria-hidden />
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <c.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">{c.desc}</p>
                <div className="space-y-3">
                  {c.fields.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-500 dark:text-gray-400 shrink-0">{k}</span>
                      <code className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 truncate">{v}</code>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-semibold text-gray-900 dark:text-gray-200">Why it matters: </span>
                  {c.why}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration row */}
      <section className="py-16 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm uppercase tracking-widest text-gray-500 mb-8 reveal">
            Sends alerts where you already work
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 reveal reveal-delay-1">
            {['Slack', 'Email', 'Webhook', 'Discord', 'PagerDuty', 'GitHub', 'Telegram', 'Teams'].map((name) => (
              <div
                key={name}
                className="px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm text-sm font-medium hover:border-primary-300 dark:hover:border-primary-700 hover:scale-105 transition-all cursor-default"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12 reveal">
            <h2 className="text-3xl md:text-4xl font-bold">Common questions</h2>
          </div>
          <div className="space-y-3 reveal reveal-delay-1">
            <FAQItem q="Can I self-host this?" a="Yes. PulseBoard is open source. Run it with Docker locally, on Railway, Render, or any Node host. SQLite works for small teams; switch to Postgres for production." />
            <FAQItem q="What does it cost?" a="Self-hosting is free. The hosted plan is free for individuals; paid tiers add advanced alerting and retention." />
            <FAQItem q="Do you support WebSockets?" a="Yes — both for monitoring (auth, subscribe, expect) and for security scanning. The scanner is safe-by-default with strict bounds." />
            <FAQItem q="How fast is detection?" a="Checks run on intervals as tight as 30 seconds. Failure thresholds prevent flapping; recovery thresholds prevent false greens." />
            <FAQItem q="Can my customers see status?" a="Yes. Each workspace gets a public status page with live components, incidents, and 30-day uptime." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 to-cyan-600" aria-hidden />
        <div className="absolute inset-0 dot-bg opacity-20" aria-hidden />
        <div className="glow-blob bg-white/30 w-96 h-96 -top-20 -right-20 float-slow" aria-hidden />
        <div className="relative container mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 reveal">Ready to ship with confidence?</h2>
          <p className="text-white/90 max-w-xl mx-auto mb-8 reveal reveal-delay-1">
            Free to self-host. Free to try in the cloud. Either way, your services get visibility today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 reveal reveal-delay-2">
            <Link to="/register">
              <Button variant="secondary" size="lg" className="gap-2">
                Get started free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-lg border border-white/30 hover:bg-white/10 transition-colors text-base font-medium"
            >
              <Github className="h-4 w-4" /> View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">PulseBoard</span>
            <span className="text-sm text-gray-500 ml-2">— open source uptime, built for developers.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 dark:hover:text-gray-200">Features</a>
            <a href="#faq" className="hover:text-gray-900 dark:hover:text-gray-200">FAQ</a>
            <Link to="/login" className="hover:text-gray-900 dark:hover:text-gray-200">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <div
      className={`group relative p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all hover:-translate-y-1 hover:shadow-xl reveal reveal-delay-${delay}`}
    >
      <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold text-lg mb-1.5">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}
