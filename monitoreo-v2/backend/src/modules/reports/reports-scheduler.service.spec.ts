import { Test } from '@nestjs/testing';
import { ReportsSchedulerService } from './reports-scheduler.service';
import { ReportsService } from './reports.service';
import { SesEmailService } from '../../common/email/ses-email.service';

describe('ReportsSchedulerService', () => {
  let scheduler: ReportsSchedulerService;
  let reportsService: {
    processDueScheduledReports: jest.Mock;
  };
  let sesService: { sendWithAttachment: jest.Mock };

  beforeEach(async () => {
    reportsService = { processDueScheduledReports: jest.fn() };
    sesService = { sendWithAttachment: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ReportsSchedulerService,
        { provide: ReportsService, useValue: reportsService },
        { provide: SesEmailService, useValue: sesService },
      ],
    }).compile();

    scheduler = module.get(ReportsSchedulerService);
  });

  it('calls processDueScheduledReports on cron tick', async () => {
    reportsService.processDueScheduledReports.mockResolvedValue([]);

    await scheduler.handleScheduledReports();

    expect(reportsService.processDueScheduledReports).toHaveBeenCalled();
  });

  it('sends email for each processed report', async () => {
    const processed = [
      {
        report: { id: 'r-1', reportType: 'consumption', periodStart: '2026-01-01', format: 'pdf' },
        buffer: Buffer.from('fake-pdf'),
        filename: 'consumption_2026-01-01.pdf',
        mime: 'application/pdf',
        recipients: ['admin@example.com'],
      },
    ];
    reportsService.processDueScheduledReports.mockResolvedValue(processed);
    sesService.sendWithAttachment.mockResolvedValue({ ok: true });

    await scheduler.handleScheduledReports();

    expect(sesService.sendWithAttachment).toHaveBeenCalledWith({
      to: ['admin@example.com'],
      subject: expect.stringContaining('consumption'),
      body: expect.any(String),
      attachment: {
        filename: 'consumption_2026-01-01.pdf',
        content: Buffer.from('fake-pdf'),
        contentType: 'application/pdf',
      },
    });
  });

  it('logs error and continues if email fails', async () => {
    const processed = [
      {
        report: { id: 'r-1', reportType: 'consumption', periodStart: '2026-01-01', format: 'pdf' },
        buffer: Buffer.from('fake-pdf'),
        filename: 'consumption_2026-01-01.pdf',
        mime: 'application/pdf',
        recipients: ['admin@example.com'],
      },
      {
        report: { id: 'r-2', reportType: 'demand', periodStart: '2026-01-01', format: 'excel' },
        buffer: Buffer.from('fake-excel'),
        filename: 'demand_2026-01-01.xlsx',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        recipients: ['admin@example.com'],
      },
    ];
    reportsService.processDueScheduledReports.mockResolvedValue(processed);
    sesService.sendWithAttachment
      .mockRejectedValueOnce(new Error('SES down'))
      .mockResolvedValueOnce({ ok: true });

    await scheduler.handleScheduledReports();

    expect(sesService.sendWithAttachment).toHaveBeenCalledTimes(2);
  });

  it('skips email when recipients array is empty', async () => {
    const processed = [
      {
        report: { id: 'r-1', reportType: 'consumption', periodStart: '2026-01-01', format: 'pdf' },
        buffer: Buffer.from('fake-pdf'),
        filename: 'consumption_2026-01-01.pdf',
        mime: 'application/pdf',
        recipients: [],
      },
    ];
    reportsService.processDueScheduledReports.mockResolvedValue(processed);

    await scheduler.handleScheduledReports();

    expect(sesService.sendWithAttachment).not.toHaveBeenCalled();
  });
});
