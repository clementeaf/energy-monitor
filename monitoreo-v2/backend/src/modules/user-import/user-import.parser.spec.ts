import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { detectUserImportFormat, parseCsvToRows, parseFileToRows } from './user-import.parser';

const CSV_FIXTURE = `email,auth_provider,role_slug,display_name,building_codes,phone
juan@empresa.cl,microsoft,operator,Juan Pérez,MM446,+56912345678
ana@empresa.cl,google,technician,Ana López,,
bob@empresa.cl,ms,operator,Bob,,
carol@empresa.cl,azure,operator,Carol,,
dave@empresa.cl,gmail,operator,Dave,,`;

describe('user-import.parser', () => {
  it('parses CSV with comma delimiter and 5 data rows', () => {
    const { headers, rows } = parseCsvToRows(Buffer.from(CSV_FIXTURE, 'utf8'));
    expect(headers[0]).toBe('email');
    expect(rows).toHaveLength(5);
    expect(rows[0][0]).toBe('juan@empresa.cl');
  });

  it('parses CSV with semicolon delimiter', () => {
    const semi = 'email;auth_provider;role_slug\na@b.cl;microsoft;operator';
    const { rows } = parseCsvToRows(Buffer.from(semi, 'utf8'));
    expect(rows).toHaveLength(1);
    expect(rows[0][1]).toBe('microsoft');
  });

  it('strips UTF-8 BOM from CSV', () => {
    const bomCsv = `\uFEFFemail,auth_provider,role_slug\na@b.cl,microsoft,operator`;
    const { rows } = parseCsvToRows(Buffer.from(bomCsv, 'utf8'));
    expect(rows[0][0]).toBe('a@b.cl');
  });

  it('rejects PDF magic bytes', () => {
    expect(() =>
      detectUserImportFormat(Buffer.from('%PDF-1.4'), 'users.pdf', 'application/pdf'),
    ).toThrow(BadRequestException);
  });

  it('detects xlsx format by extension', () => {
    const format = detectUserImportFormat(Buffer.from('PK'), 'users.xlsx');
    expect(format).toBe('xlsx');
  });

  it('parses minimal XLSX first sheet', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');
    sheet.addRow(['email', 'auth_provider', 'role_slug']);
    sheet.addRow(['x@y.cl', 'google', 'operator']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const format = detectUserImportFormat(buffer, 'import.xlsx');
    const { rows } = await parseFileToRows(buffer, format);
    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe('x@y.cl');
  });
});
