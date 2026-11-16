export type QualityStatus = 'PASS' | 'FAIL' | 'ERROR' | 'NOT_RUN' | 'STALE';
export interface QualityEvidence {
  id: string;
  ruleId: string;
  severity: 'blocker' | 'warning' | 'suggestion';
  status: QualityStatus;
  target: string;
  description: string;
  evidence: string[];
  configurationDigest: string;
  sourceRevision: string;
  environment: string;
}
// Data contract only; no M5 audit, result freshness or approval engine exists yet.
