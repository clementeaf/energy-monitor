import { JsonLoggerService } from './json-logger.service';

describe('JsonLoggerService', () => {
  let writeSpy: jest.SpyInstance;

  beforeEach(() => {
    writeSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('writes one JSON line for log with context', () => {
    const logger = new JsonLoggerService();
    logger.log('hello', 'TestContext');

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const line = (writeSpy.mock.calls[0][0] as string).replace(/\n$/, '');
    const parsed = JSON.parse(line) as {
      level: string;
      context: string;
      msg: string;
    };
    expect(parsed.level).toBe('info');
    expect(parsed.context).toBe('TestContext');
    expect(parsed.msg).toBe('hello');
  });

  it('includes stack on error', () => {
    const logger = new JsonLoggerService();
    logger.error('fail', 'stack-here', 'Ctx');

    const line = (writeSpy.mock.calls[0][0] as string).replace(/\n$/, '');
    const parsed = JSON.parse(line) as {
      level: string;
      stack: string;
    };
    expect(parsed.level).toBe('error');
    expect(parsed.stack).toBe('stack-here');
  });
});
