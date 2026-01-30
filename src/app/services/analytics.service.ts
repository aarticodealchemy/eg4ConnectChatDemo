import { Injectable } from '@angular/core';
import moment from 'moment';
import { Observable, of } from 'rxjs';
import { GraphScale, MomentUnit } from '../core/app.type';
import { GraphDataPoint, SimpleGraphParams } from '../models/app.model';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  
  getSimpleGraphData(
    inverterSN: string,
    params: {
      timeScale: 'day' | 'week' | 'month' | 'custom';
      startDate?: number;
      endDate?: number;
    }
  ): Observable<GraphDataPoint[]> {
    if (!inverterSN) {
      throw new Error('No inverter serial number available');
    }

    const { start, iterations, graphScale, unit } = this.resolveScale(
      params.timeScale,
      params.startDate,
      params.endDate
    );

    const data: GraphDataPoint[] = [];

    for (let i = 0; i < iterations; i++) {
      const current = start.clone().add(i, unit);
      data.push(this.buildDataPoint(current, graphScale, inverterSN));
    }

    return of(data);
  }

  /* ---------------- Scale Resolver ---------------- */

  private resolveScale(
    timeScale?: 'day' | 'week' | 'month' | 'custom',
    customStart?: number,
    customEnd?: number
  ) {
    const now = moment();

    const scaleMap: Record<
      'day' | 'week' | 'month',
      {
        start: moment.Moment;
        iterations: number;
        graphScale: GraphScale;
        unit: MomentUnit;
      }
    > = {
      day: {
        start: now.clone().startOf('day'),
        iterations: 24,
        graphScale: 'HOUR',
        unit: 'hour',
      },
      week: {
        start: now.clone().subtract(6, 'days').startOf('day'),
        iterations: 7,
        graphScale: 'DAY',
        unit: 'day',
      },
      month: {
        start: now.clone().subtract(29, 'days').startOf('day'),
        iterations: 30,
        graphScale: 'DAY',
        unit: 'day',
      },
    };

    if (timeScale === 'custom' && customStart && customEnd) {
      const start = moment(customStart).startOf('day');
      const end = moment(customEnd).startOf('day');
      const dayDiff = end.diff(start, 'days');

      if (dayDiff === 0) {
        // Single day: Hourly resolution
        return {
          start,
          iterations: 24,
          graphScale: 'HOUR' as GraphScale,
          unit: 'hour' as MomentUnit,
        };
      }

      const iterations = dayDiff + 1;
      return {
        start,
        iterations,
        graphScale: 'DAY' as GraphScale,
        unit: 'day' as MomentUnit,
      };
    }

    if (timeScale === 'day' || timeScale === 'week' || timeScale === 'month') {
      return scaleMap[timeScale];
    }

    return scaleMap.week;
  }

  /* ---------------- Data Point Builder ---------------- */

  private buildDataPoint(
    current: moment.Moment,
    scale: GraphScale,
    serialNumber: string
  ): GraphDataPoint {
    const hour = current.hour();

    /* ---------- Solar Production ---------- */
    const solarStrength = Math.max(0, Math.sin(((hour - 6) * Math.PI) / 12));

    const solarBase = 50 + Math.random() * 10;
    const solarTotal = solarStrength * solarBase;

    const solarToHome = solarTotal * 0.4;
    const solarToBattery = solarTotal * 0.4;
    const solarExported = solarTotal * 0.2;

    /* ---------- Usage Pattern ---------- */
    const isMorningPeak = hour >= 7 && hour <= 9;
    const isEveningPeak = hour >= 18 && hour <= 21;

    const usageBase =
      15 +
      (isMorningPeak ? 20 : 0) +
      (isEveningPeak ? 30 : 0) +
      Math.random() * 10;

    const batteryToHome = hour < 6 || hour > 18 ? usageBase * 0.8 : 0;

    const gridToHome = Math.max(0, usageBase - solarToHome - batteryToHome);

    const gridImported = gridToHome + (hour > 22 || hour < 5 ? 10 : 0);

    /* ---------- Result ---------- */
    return {
      dateTime: current.toISOString(),
      scale,
      serialNumber,

      batteryToHome: this.round(batteryToHome),
      solarToBattery: this.round(solarToBattery),
      gridToBattery: hour > 22 || hour < 5 ? 5 : 0,
      genToBattery: 0,

      solarToHome: this.round(solarToHome),
      gridToHome: this.round(gridToHome),
      generatorToHome: 0,

      gridImported: this.round(gridImported),
      batteryExported: 0,
      solarExported: this.round(solarExported),
    };
  }

  /* ---------------- Utils ---------------- */

  private round(value: number, precision = 2) {
    return Number(value.toFixed(precision));
  }
}
