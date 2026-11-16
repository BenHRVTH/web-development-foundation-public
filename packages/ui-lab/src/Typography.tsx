import { createContext, useContext, type ReactNode } from 'react';
import {
  resolveTokens,
  validateTypographyProfile,
  typographyReportSchema,
  weightAvailability,
  type TypographyProfile,
  type TypographyReport,
  type EditableTokenConfig,
} from '@wdf/core';
import { sameDesignContext } from '@wdf/core/change';
import project from 'virtual:wdf-project';
import type { ChangeClient } from './useChangeManager';

const Context = createContext<{
  profile: TypographyProfile | null;
  report: TypographyReport | null;
  status: string;
  run: () => void;
  busy: boolean;
}>({
  profile: null,
  report: null,
  status: 'NOT_RUN',
  run: () => {},
  busy: false,
});
export function TypographyProvider({
  manager,
  children,
}: {
  manager: ChangeClient;
  children: ReactNode;
}) {
  let profile: TypographyProfile | null = null,
    report: TypographyReport | null = null,
    status = 'NOT_RUN';
  const view = manager.view!;
  try {
    profile = validateTypographyProfile(project.typography, view.state.draft);
  } catch {
    status = 'ERROR';
  }
  const qa = view.state.qa;
  const check = qa?.checks.find((c) => c.ruleId === 'WDF-TYPE-001');
  if (qa?.running) status = 'RUNNING';
  else if (check) {
    if (
      !sameDesignContext(qa!.context, view.context) ||
      check.status === 'STALE'
    )
      status = 'STALE';
    else {
      status = check.status;
      if (check.status === 'PASS' || check.status === 'FAIL') {
        try {
          const parsed = typographyReportSchema.parse(
            JSON.parse(check.evidence[0]!),
          );
          if (parsed.session === project.connection.session) report = parsed;
          else status = 'STALE';
        } catch {
          status = 'ERROR';
        }
      }
    }
  }
  return (
    <Context.Provider
      value={{
        profile,
        report,
        status,
        busy:
          !!manager.pending ||
          !!qa?.running ||
          !!manager.error ||
          view.compatibility === 'conflict',
        run: () => void manager.perform({ type: 'qa', level: 'targeted' }),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function TypographyStatus() {
  const t = useContext(Context);
  return (
    <div className="typography-status" data-typography-status={t.status}>
      <p>
        Betűvastagságok: {t.status}. Csak az aktuális projektben, minden
        deklarált fontszerepen igazolt opció választható. A meglévő értékeket
        nem írjuk át.
      </p>
      <button type="button" disabled={t.busy} onClick={t.run}>
        Tipográfia ellenőrzése
      </button>
    </div>
  );
}
export function useWeightOptions(config: EditableTokenConfig, id: string) {
  const t = useContext(Context);
  const availability = weightAvailability(t.profile, t.report, config, id);
  const resolved = resolveTokens(config);
  const referenceAllowed = (target: string) =>
    resolved.ok &&
    [
      resolved.value.base,
      ...resolved.value.responsive.map((r) => r.tokens),
    ].every((tokens) =>
      availability.verified.includes(Number(tokens[target]?.value)),
    ) &&
    t.report !== null;
  const roles =
    t.profile?.roles.filter((r) => r.weightToken === id).map((r) => r.id) ?? [];
  return {
    ...availability,
    status: t.status,
    referenceAllowed,
    verified: t.report ? availability.verified : [],
    help: t.report
      ? `Igazolt: ${availability.verified.join(', ') || 'nincs'}. Az összeolvadó vagy nem igazolt értékek nem választhatók külön fokozatként. ${roles.join(', ')}`
      : `${t.status}: nincs aktuális fontbizonyíték. Futtasd a Tipográfia ellenőrzését. A jelenlegi érték megmarad.`,
  };
}
