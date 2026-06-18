import { Controller, Get, Param, Query, Res, NotFoundException, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { MapvxService } from './mapvx.service';

@Controller('mapvx')
@Public()
@SkipThrottle()
export class MapvxController {
  constructor(private readonly mapvxService: MapvxService) {}

  @Get('malls')
  getMalls() {
    return this.mapvxService.getMalls();
  }

  @Get('malls/:id/stores')
  getStores(@Param('id') id: string) {
    return this.mapvxService.getStores(id);
  }

  @Get('malls/:id/geometry')
  getGeometry(
    @Param('id') id: string,
    @Query('floor_key') floorKey: string,
    @Query('layer') layer: string,
  ) {
    return this.mapvxService.getGeometry(id, floorKey, layer);
  }

  @Get('tiles/:z/:x/:y.pbf')
  async getTile(
    @Param('z') z: string,
    @Param('x') x: string,
    @Param('y') y: string,
    @Res() res: Response,
  ) {
    const data = await this.mapvxService.getTile(Number(z), Number(x), Number(y));
    if (!data) throw new NotFoundException();

    res.set({
      'Content-Type': 'application/x-protobuf',
      'Content-Encoding': 'identity',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });
    res.send(data);
  }
}
