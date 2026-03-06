import { useQuery } from '@tanstack/react-query';
import { fetchMetersOverview, fetchMetersByBuilding, fetchMeter, fetchMeterReadings, fetchMeterUptime, fetchMeterDowntimeEvents, fetchMeterAlarmEvents, fetchMeterAlarmSummary } from '../../services/endpoints';

export function useMetersOverview() {
  return useQuery({
    queryKey: ['metersOverview'],
    queryFn: fetchMetersOverview,
    staleTime: 30_000,
  });
}

export function useMetersByBuilding(buildingId: string) {
  return useQuery({
    queryKey: ['meters', buildingId],
    queryFn: () => fetchMetersByBuilding(buildingId),
  });
}

export function useMeter(meterId: string) {
  return useQuery({
    queryKey: ['meter', meterId],
    queryFn: () => fetchMeter(meterId),
  });
}

export function useMeterReadings(
  meterId: string,
  resolution: 'raw' | '15min' | 'hourly' | 'daily' = 'hourly',
  from?: string,
  to?: string,
) {
  return useQuery({
    queryKey: ['readings', meterId, resolution, from, to],
    queryFn: () => fetchMeterReadings(meterId, resolution, from, to),
  });
}

export function useMeterUptime(meterId: string) {
  return useQuery({
    queryKey: ['meter-uptime', meterId],
    queryFn: () => fetchMeterUptime(meterId),
    staleTime: 60_000,
  });
}

export function useMeterDowntimeEvents(meterId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['meter-downtime-events', meterId, from, to],
    queryFn: () => fetchMeterDowntimeEvents(meterId, from, to),
    enabled: !!from && !!to,
  });
}

export function useMeterAlarmEvents(meterId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['meter-alarm-events', meterId, from, to],
    queryFn: () => fetchMeterAlarmEvents(meterId, from, to),
    enabled: !!from && !!to,
  });
}

export function useMeterAlarmSummary(meterId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['meter-alarm-summary', meterId, from, to],
    queryFn: () => fetchMeterAlarmSummary(meterId, from, to),
    enabled: !!from && !!to,
    staleTime: 60_000,
  });
}
