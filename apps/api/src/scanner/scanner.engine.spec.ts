import { ScannerEngine, ScanTarget, ScanOptions } from './scanner.engine';

describe('ScannerEngine', () => {
  let engine: ScannerEngine;

  beforeEach(() => {
    engine = new ScannerEngine();
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('transport_security check', () => {
    it('should fail for ws:// URLs', async () => {
      const target: ScanTarget = { url: 'ws://insecure.example.com/socket' };
      const options: ScanOptions = { scanMode: 'passive' };

      const findings = await engine.runScan(target, options);
      const transportFinding = findings.find(f => f.id === 'transport_security');

      expect(transportFinding?.status).toBe('fail');
      expect(transportFinding?.evidence).toContain('ws://');
    });

    it('should pass for wss:// URLs', async () => {
      const target: ScanTarget = { url: 'wss://secure.example.com/socket' };
      const options: ScanOptions = { scanMode: 'passive' };

      const findings = await engine.runScan(target, options);
      const transportFinding = findings.find(f => f.id === 'transport_security');

      expect(transportFinding?.status).toBe('pass');
    });
  });

  describe('query_token_leak check', () => {
    it('should fail when tokens found in query string', async () => {
      const target: ScanTarget = { url: 'wss://example.com/socket?token=abc123' };
      const options: ScanOptions = { scanMode: 'passive' };

      const findings = await engine.runScan(target, options);
      const tokenFinding = findings.find(f => f.id === 'query_token_leak');

      expect(tokenFinding?.status).toBe('fail');
      expect(tokenFinding?.evidence).toContain('token');
    });

    it('should pass when no query string present', async () => {
      const target: ScanTarget = { url: 'wss://example.com/socket' };
      const options: ScanOptions = { scanMode: 'passive' };

      const findings = await engine.runScan(target, options);
      const tokenFinding = findings.find(f => f.id === 'query_token_leak');

      expect(tokenFinding?.status).toBe('pass');
    });
  });

  describe('auth_required check', () => {
    it('should warn when no auth configured', async () => {
      const target: ScanTarget = { url: 'wss://example.com/socket', authType: 'none' };
      const options: ScanOptions = { scanMode: 'passive', allowAuthChecks: true };

      const findings = await engine.runScan(target, options);
      const authFinding = findings.find(f => f.id === 'auth_required');

      expect(authFinding?.status).toBe('warning');
    });

    it('should skip when auth checks disabled', async () => {
      const target: ScanTarget = { url: 'wss://example.com/socket', authType: 'none' };
      const options: ScanOptions = { scanMode: 'passive', allowAuthChecks: false };

      const findings = await engine.runScan(target, options);
      const authFinding = findings.find(f => f.id === 'auth_required');

      expect(authFinding?.status).toBe('skipped');
    });
  });

  describe('calculateScore', () => {
    it('should return secure verdict for high scores', () => {
      const findings = [
        { id: '1', title: 'Test', category: 'test', severity: 'info' as const, status: 'pass' as const },
      ];

      const result = engine.calculateScore(findings);

      expect(result.verdict).toBe('secure');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should return vulnerable verdict for low scores', () => {
      const findings = [
        { id: '1', title: 'Critical Issue', category: 'test', severity: 'critical' as const, status: 'fail' as const },
      ];

      const result = engine.calculateScore(findings);

      expect(result.verdict).toBe('vulnerable');
      expect(result.score).toBeLessThan(50);
    });

    it('should return inconclusive when most checks not testable', () => {
      const findings = [
        { id: '1', title: 'Test', category: 'test', severity: 'info' as const, status: 'not_testable' as const },
        { id: '2', title: 'Test', category: 'test', severity: 'info' as const, status: 'not_testable' as const },
      ];

      const result = engine.calculateScore(findings);

      expect(result.verdict).toBe('inconclusive');
    });
  });

  describe('registerCheck', () => {
    it('should allow registering custom checks', async () => {
      engine.registerCheck('custom_check', async (target, options) => ({
        id: 'custom_check',
        title: 'Custom Check',
        category: 'custom',
        severity: 'info',
        status: 'pass',
        evidence: 'Custom check executed',
      }));

      const target: ScanTarget = { url: 'wss://example.com/socket' };
      const options: ScanOptions = { scanMode: 'passive' };

      const findings = await engine.runScan(target, options);
      const customFinding = findings.find(f => f.id === 'custom_check');

      expect(customFinding).toBeDefined();
      expect(customFinding?.evidence).toBe('Custom check executed');
    });
  });
});