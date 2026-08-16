import { calculateTrend, groupByMonth } from '../components/utils/analytics';

describe('Analytics Utils', () => {
  describe('calculateTrend', () => {
    it('should calculate positive trend correctly', () => {
      expect(calculateTrend(150, 100)).toBe(50);
    });

    it('should calculate negative trend correctly', () => {
      expect(calculateTrend(50, 100)).toBe(-50);
    });

    it('should return null if previous is 0', () => {
      expect(calculateTrend(100, 0)).toBeNull();
    });

    it('should return 0 if both are 0', () => {
      expect(calculateTrend(0, 0)).toBe(0);
    });
  });

  describe('groupByMonth', () => {
    it('should group items by month', () => {
      const items = [
        { id: 1, date: '2026-08-15T12:00:00Z', value: 100 },
        { id: 2, date: '2026-08-01T12:00:00Z', value: 50 },
        { id: 3, date: '2026-07-20T12:00:00Z', value: 200 }
      ];
      
      const result = groupByMonth(items, 'date', 'value');
      expect(result['2026-08']).toBe(150);
      expect(result['2026-07']).toBe(200);
    });
  });
});
