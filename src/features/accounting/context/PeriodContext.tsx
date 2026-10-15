import React, { createContext, useContext, useMemo, useState } from 'react';
import { periodEnd, periodLabel, periodStart } from '../../../shared/utils/date';

export type AccountingPeriod = 'week' | 'month';

type PeriodContextType = {
  period: AccountingPeriod;
  periodOffset: number;
  startDate: string;
  endDate: string;
  label: string;
  isCurrent: boolean;
  setPeriod: (period: AccountingPeriod) => void;
  goPrevious: () => void;
  goNext: () => void;
  goCurrent: () => void;
};

const PeriodContext = createContext<PeriodContextType>({
  period: 'month',
  periodOffset: 0,
  startDate: '',
  endDate: '',
  label: '',
  isCurrent: true,
  setPeriod: () => undefined,
  goPrevious: () => undefined,
  goNext: () => undefined,
  goCurrent: () => undefined,
});

/**
 * Periodo contable visible, compartido entre la pestaña Contabilidad
 * y el asistente IA (para que "esas mismas fechas" lleguen a la IA).
 */
export function AccountingPeriodProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [period, setPeriodState] = useState<AccountingPeriod>('month');
  const [periodOffset, setPeriodOffset] = useState(0);

  const value = useMemo<PeriodContextType>(() => {
    const startDate = periodStart(period, new Date(), periodOffset);
    const endDate = periodEnd(period, new Date(), periodOffset);
    return {
      period,
      periodOffset,
      startDate,
      endDate,
      label: periodLabel(period, new Date(), periodOffset),
      isCurrent: periodOffset === 0,
      setPeriod: next => {
        setPeriodState(next);
        setPeriodOffset(0);
      },
      goPrevious: () => setPeriodOffset(offset => offset - 1),
      goNext: () =>
        setPeriodOffset(offset => (offset < 0 ? offset + 1 : offset)),
      goCurrent: () => setPeriodOffset(0),
    };
  }, [period, periodOffset]);

  return (
    <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
  );
}

export const useAccountingPeriod = () => useContext(PeriodContext);
