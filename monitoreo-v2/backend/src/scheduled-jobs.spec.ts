import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SOURCE_DIR = __dirname;
const STACK_TEMPLATE = join(__dirname, '..', '..', 'infra', 'aws', 'stack.yml');
const CRON_NAME = /@Cron\([^)]*name:\s*'([^']+)'/g;
const SCHEDULED_JOB_INPUT = /Input: '\{"job":"([^"]+)"\}'/g;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'coverage' ? [] : listSourceFiles(fullPath);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [fullPath]
      : [];
  });
}

function collectMatches(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

describe('scheduled jobs on Lambda', () => {
  it('has exactly one EventBridge schedule in infra/aws/stack.yml per named @Cron job', () => {
    const cronNames = listSourceFiles(SOURCE_DIR)
      .flatMap((file) => collectMatches(readFileSync(file, 'utf8'), CRON_NAME))
      .sort();
    const scheduledJobs = collectMatches(
      readFileSync(STACK_TEMPLATE, 'utf8'),
      SCHEDULED_JOB_INPUT,
    ).sort();

    expect(cronNames.length).toBeGreaterThan(0);
    expect(scheduledJobs).toEqual(cronNames);
  });
});
