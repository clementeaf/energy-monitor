import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { CreateVarElectricDto } from './dto/create-var-electric.dto';

@Injectable()
export class VarelectricIngressService {
  constructor(
    @InjectDataSource('v3')
    private readonly ds: DataSource,
  ) {}

  async insertOne(dto: CreateVarElectricDto): Promise<void> {
    await this.ds.query(
      `INSERT INTO var_electric
        (idvar_electric, estado, id_remarcador, fecha,
         tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10,
         tag11, tag12, tag13, tag14, tag15, tag16, tag17, tag18, tag19, tag20)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       ON CONFLICT (idvar_electric) DO NOTHING`,
      [
        dto.idvar_electric, dto.estado, dto.id_remarcador, dto.fecha,
        dto.tag1 ?? null, dto.tag2 ?? null, dto.tag3 ?? null, dto.tag4 ?? null,
        dto.tag5 ?? null, dto.tag6 ?? null, dto.tag7 ?? null, dto.tag8 ?? null,
        dto.tag9 ?? null, dto.tag10 ?? null, dto.tag11 ?? null, dto.tag12 ?? null,
        dto.tag13 ?? null, dto.tag14 ?? null, dto.tag15 ?? null, dto.tag16 ?? null,
        dto.tag17 ?? null, dto.tag18 ?? null, dto.tag19 ?? null, dto.tag20 ?? null,
      ],
    );
  }

  async insertBatch(records: CreateVarElectricDto[]): Promise<{ inserted: number }> {
    if (records.length === 0) return { inserted: 0 };

    const BATCH = 500;
    let inserted = 0;

    for (let i = 0; i < records.length; i += BATCH) {
      const chunk = records.slice(i, i + BATCH);
      const values: unknown[] = [];
      const placeholders: string[] = [];

      for (let j = 0; j < chunk.length; j++) {
        const r = chunk[j];
        const offset = j * 24;
        placeholders.push(
          `(${Array.from({ length: 24 }, (_, k) => `$${offset + k + 1}`).join(',')})`,
        );
        values.push(
          r.idvar_electric, r.estado, r.id_remarcador, r.fecha,
          r.tag1 ?? null, r.tag2 ?? null, r.tag3 ?? null, r.tag4 ?? null,
          r.tag5 ?? null, r.tag6 ?? null, r.tag7 ?? null, r.tag8 ?? null,
          r.tag9 ?? null, r.tag10 ?? null, r.tag11 ?? null, r.tag12 ?? null,
          r.tag13 ?? null, r.tag14 ?? null, r.tag15 ?? null, r.tag16 ?? null,
          r.tag17 ?? null, r.tag18 ?? null, r.tag19 ?? null, r.tag20 ?? null,
        );
      }

      const result = await this.ds.query(
        `INSERT INTO var_electric
          (idvar_electric, estado, id_remarcador, fecha,
           tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10,
           tag11, tag12, tag13, tag14, tag15, tag16, tag17, tag18, tag19, tag20)
         VALUES ${placeholders.join(',')}
         ON CONFLICT (idvar_electric) DO NOTHING`,
        values,
      );
      inserted += result?.[1] ?? chunk.length;
    }

    return { inserted };
  }
}
