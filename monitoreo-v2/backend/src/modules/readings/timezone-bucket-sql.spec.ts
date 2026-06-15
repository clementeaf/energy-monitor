import { timeBucketExpr, intervalNeedsTimezone } from './timezone-bucket-sql';

describe('timezone-bucket-sql', () => {
  describe('intervalNeedsTimezone', () => {
    it('returns true for daily interval', () => {
      expect(intervalNeedsTimezone('1 day')).toBe(true);
    });

    it('returns true for monthly interval', () => {
      expect(intervalNeedsTimezone('1 month')).toBe(true);
    });

    it('returns false for sub-day intervals', () => {
      expect(intervalNeedsTimezone('5 minutes')).toBe(false);
      expect(intervalNeedsTimezone('15 minutes')).toBe(false);
      expect(intervalNeedsTimezone('1 hour')).toBe(false);
    });
  });

  describe('timeBucketExpr', () => {
    it('adds timezone for daily with non-UTC timezone', () => {
      const expr = timeBucketExpr('1 day', 'timestamp', 'America/Santiago');
      expect(expr).toBe("time_bucket('1 day', timestamp, 'America/Santiago')");
    });

    it('adds timezone for monthly with non-UTC timezone', () => {
      const expr = timeBucketExpr('1 month', 'r.timestamp', 'America/Lima');
      expect(expr).toBe("time_bucket('1 month', r.timestamp, 'America/Lima')");
    });

    it('omits timezone for UTC', () => {
      const expr = timeBucketExpr('1 day', 'timestamp', 'UTC');
      expect(expr).toBe("time_bucket('1 day', timestamp)");
    });

    it('omits timezone for sub-day intervals', () => {
      const expr = timeBucketExpr('15 minutes', 'timestamp', 'America/Santiago');
      expect(expr).toBe("time_bucket('15 minutes', timestamp)");
    });

    it('omits timezone for hourly regardless of tz', () => {
      const expr = timeBucketExpr('1 hour', 'timestamp', 'America/Bogota');
      expect(expr).toBe("time_bucket('1 hour', timestamp)");
    });

    it('uses parameterized interval when provided', () => {
      const expr = timeBucketExpr('1 day', 'timestamp', 'America/Santiago', '$1::interval');
      expect(expr).toBe("time_bucket($1::interval, timestamp, 'America/Santiago')");
    });

    it('uses parameterized interval without timezone for sub-day', () => {
      const expr = timeBucketExpr('15 minutes', 'timestamp', 'America/Santiago', '$1::interval');
      expect(expr).toBe('time_bucket($1::interval, timestamp)');
    });

    it('handles column alias correctly', () => {
      const expr = timeBucketExpr('1 day', 'a.bucket', 'America/Santiago');
      expect(expr).toBe("time_bucket('1 day', a.bucket, 'America/Santiago')");
    });
  });
});
