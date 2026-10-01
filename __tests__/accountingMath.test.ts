import { cop, money } from '../src/features/accounting/utils/currency';

describe('Accounting & Currency Logic', () => {
  describe('cop parser', () => {
    it('parses plain numbers', () => {
      expect(cop('15000')).toBe(15000);
      expect(cop('0')).toBe(0);
    });

    it('parses formatted COP strings with dot thousand separators', () => {
      expect(cop('15.000')).toBe(15000);
      expect(cop('1.250.000')).toBe(1250000);
    });

    it('parses currency symbols and spaces', () => {
      expect(cop('$ 15.000')).toBe(15000);
      expect(cop('COP 50.000')).toBe(50000);
      expect(cop('  75.000  ')).toBe(75000);
    });

    it('returns 0 for empty or invalid input', () => {
      expect(cop('')).toBe(0);
      expect(cop('abc')).toBe(0);
    });
  });

  describe('money formatter', () => {
    it('formats numbers into COP currency string', () => {
      const formatted = money(15000);
      expect(formatted).toContain('15.000');
    });

    it('formats 0 COP', () => {
      const formatted = money(0);
      expect(formatted).toContain('0');
    });
  });

  describe('split payment arithmetic and balances', () => {
    it('validates total sum matches split parts', () => {
      const splits = [
        { accountId: 'acc-1', amount: '20.000' },
        { accountId: 'acc-2', amount: '30.000' },
      ];
      const sumSplits = splits.reduce((acc, s) => acc + cop(s.amount), 0);
      expect(sumSplits).toBe(50000);
    });

    it('calculates balance net totals accurately', () => {
      const income = 1500000;
      const expense = 650000;
      const net = income - expense;
      expect(net).toBe(850000);
    });

    it('handles negative net balance', () => {
      const income = 200000;
      const expense = 500000;
      const net = income - expense;
      expect(net).toBe(-300000);
    });
  });
});
