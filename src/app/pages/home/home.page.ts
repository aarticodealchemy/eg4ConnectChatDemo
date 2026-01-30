import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonDatetime,
  IonIcon,
  IonInput,
  IonItem,
  IonModal,
} from '@ionic/angular/standalone';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import moment from 'moment';
import { BaseChartDirective } from 'ng2-charts';

import { AnalyticsService } from 'src/app/services/analytics.service';
import { AppHeaderComponent } from '../../components/app-header/app-header.component';
import { CustomSegmentComponent } from '../../components/custom-segment/custom-segment.component';
import { UsageCardComponent } from '../../components/usage-card/usage-card.component';
import { GraphDataPoint, SegmentOption } from '../../models/app.model';
import { PeriodType } from 'src/app/core/app.enum';
import { PERIOD_OPTIONS, TAB_OPTIONS } from 'src/app/core/app.constant';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonIcon,
    IonModal,
    IonDatetime,
    IonItem,
    IonInput,
    BaseChartDirective,
    AppHeaderComponent,
    CustomSegmentComponent,
    UsageCardComponent,
  ],
})
export class HomePage {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly today = moment().toISOString();

  /* ---------------- Signals ---------------- */
  selectedTab = signal<string>('home');
  selectedPeriod = signal<PeriodType>(PeriodType.week);
  isAnimating = signal<boolean>(false);
  totalUsage = signal<number>(0);
  currentDateRange = signal<string>('');
  private inverterSN = signal<string>('');

  readonly tabOptions: SegmentOption[] = TAB_OPTIONS;
  readonly periodOptions: SegmentOption[] = PERIOD_OPTIONS;
  readonly PeriodType = PeriodType;

  readonly dateForm = this.fb.nonNullable.group({
    startDate: '',
    endDate: '',
  });

  private readonly formValues = toSignal(this.dateForm.valueChanges);

  /* ---------------- Chart Signals ---------------- */
  chartLabels = signal<string[]>([]);
  chartValues = signal<number[]>([]);
  lineChartData = computed<ChartConfiguration<'line'>['data']>(() => ({
    labels: this.chartLabels(),
    datasets: [this.createDataset(this.chartValues())],
  }));

  readonly lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#2d3748',
        borderColor: '#4a5568',
        borderWidth: 1,
        displayColors: false,
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 0 },
        bodyFont: { size: 14, weight: 600 },
        bodyColor: '#fff',
        callbacks: {
          label: (ctx: any) => `${ctx.parsed.y} kWh`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(100,120,140,.3)',
          drawTicks: false,
          borderDash: [5, 5],
        } as any,
        ticks: {
          color: '#9ca3af',
          font: { size: 12 },
          autoSkip: true,
          maxTicksLimit: 24,
        },
        border: { display: false },
      },
      y: { display: false, beginAtZero: true },
    },
  };

  /* ---------------- Derived (Computed) ---------------- */
  private readonly dates = computed(() => {
    // Explicitly track formValues to ensure reactivity
    this.formValues(); 
    const { startDate, endDate } = this.dateForm.getRawValue();
    return {
      start: moment(startDate),
      end: moment(endDate),
    };
  });

  /* ---------------- Constructor Logic via effect ---------------- */
  constructor() {
    this.inverterSN.set('MOCK_INVERTER_SN'); // or real SN from storage

    // tab from query params
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['tab']) {
          this.selectedTab.set(params['tab']);
        }
      });

    // Initial date range
    this.setDateRange(PeriodType.week);

    // Automatic API call when dependencies change
    effect(() => {
      const { start, end } = this.dates();
      const period = this.selectedPeriod();
      const tab = this.selectedTab();
      const inverter = this.inverterSN();

      if (!start.isValid() || !end.isValid() || !inverter) return;
      this.fetchGraphData(start, end, period, tab);
    });
  }

  /* ---------------- Date Logic ---------------- */
  setDateRange(period: PeriodType) {
    this.selectedPeriod.set(period);

    const today = moment();
    const ranges: Record<PeriodType, [moment.Moment, moment.Moment]> = {
      day: [today.clone().startOf('day'), today.clone().endOf('day')],
      week: [today.clone().subtract(7, 'days'), today],
      month: [today.clone().startOf('month'), today.clone().endOf('month')],
      custom: [today, today],
    };

    const [start, end] = ranges[period];
    this.updateFormDates(start, end);
  }

  private updateFormDates(start: moment.Moment, end: moment.Moment) {
    this.dateForm.patchValue({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    this.updateDateRangeDisplay();
  }

  navigatePeriod(dir: 'previous' | 'next') {
    const { start, end } = this.dates();
    if (!start.isValid() || !end.isValid()) return;

    const step = dir === 'next' ? 1 : -1;
    let newStart = start.clone();
    let newEnd = end.clone();

    switch (this.selectedPeriod()) {
      case PeriodType.day:
        newStart.add(step, 'day');
        newEnd = newStart.clone().endOf('day');
        break;
      case PeriodType.week:
        newStart.add(step * 7, 'days');
        newEnd.add(step * 7, 'days');
        break;
      case PeriodType.month:
        newStart.add(step, 'month').startOf('month');
        newEnd = newStart.clone().endOf('month');
        break;
      default:
        const diff = end.diff(start, 'days');
        newStart =
          dir === 'next' ? end.clone() : start.clone().subtract(diff, 'days');
        newEnd = newStart.clone().add(diff, 'days');
    }

    this.updateFormDates(newStart, newEnd);
  }

  previousPeriod() {
    this.navigatePeriod('previous');
  }

  nextPeriod() {
    this.navigatePeriod('next');
  }

  /* ---------------- UI Events ---------------- */
  onTabChange(tab: string) {
    this.selectedTab.set(tab);
    this.isAnimating.set(true);
    setTimeout(() => this.isAnimating.set(false), 300);
  }

  onPeriodChange(period: string) {
    const selected = period as PeriodType;
    this.selectedPeriod.set(selected);

    if (selected !== PeriodType.custom) {
      this.setDateRange(selected);
    }
  }

  startDateChange() {
    const { start, end } = this.dates();
    if (start.isAfter(end)) {
      this.dateForm.patchValue({ endDate: start.toISOString() });
    }
    this.updateDateRangeDisplay();
  }

  endDateChange() {
    const { start, end } = this.dates();
    if (end.isBefore(start)) {
      this.dateForm.patchValue({ startDate: end.toISOString() });
    }
    this.updateDateRangeDisplay();
  }

  /* ---------------- Display ---------------- */

  private updateDateRangeDisplay() {
    const { start, end } = this.dates();
    if (!start.isValid() || !end.isValid()) return;

    this.currentDateRange.set(
      this.selectedPeriod() === PeriodType.month
        ? start.format('MMMM YYYY')
        : this.formatRange(start, end)
    );
  }

  private formatRange(start: moment.Moment, end: moment.Moment) {
    return start.isSame(end, 'month')
      ? `${start.format('MMM D')} - ${end.format('D')}`
      : `${start.format('MMM D')} - ${end.format('MMM D')}`;
  }

  /* ---------------- API ---------------- */
  private fetchGraphData(
    start: moment.Moment,
    end: moment.Moment,
    period: PeriodType,
    tab: string
  ) {
    const params: any = { timeScale: period };

    if (period === PeriodType.custom) {
      params.startDate = start.valueOf();
      params.endDate = end.valueOf();
    }

    this.analyticsService
      .getSimpleGraphData(this.inverterSN(), params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.processGraphData(data, tab),
        error: () => this.resetChart(),
      });
  }

  private processGraphData(data: GraphDataPoint[], tab: string) {
    if (!data?.length) {
      this.resetChart();
      return;
    }

    let total = 0;
    const labels: string[] = [];
    const values: number[] = [];

    data.forEach((point) => {
      const date = moment(point.dateTime);

      labels.push(
        point.scale === 'HOUR'
          ? date.format('HH:mm')
          : point.scale === 'MONTH'
          ? date.format('MMM YYYY')
          : date.format('MMM D')
      );

      const value =
        tab === 'grid'
          ? point.gridImported
          : tab === 'solar'
          ? point.solarToHome + point.solarToBattery + point.solarExported
          : tab === 'battery'
          ? point.batteryToHome
          : point.batteryToHome +
            point.solarToHome +
            point.gridToHome +
            point.generatorToHome;

      values.push(value);
      total += value;
    });

    this.chartLabels.set([...labels]);
    this.chartValues.set([...values]);
    this.totalUsage.set(Math.round(total * 10) / 10);
  }

  private resetChart() {
    this.chartLabels.set([]);
    this.chartValues.set([]);
    this.totalUsage.set(0);
  }

  /* ---------------- Dataset ---------------- */

  private createDataset(data: number[]) {
    return {
      data,
      borderColor: '#f59e0b',
      backgroundColor: (ctx: any) => {
        const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 340);
        g.addColorStop(0, 'rgba(245,158,11,.3)');
        g.addColorStop(1, 'rgba(245,158,11,0)');
        return g;
      },
      fill: true,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBackgroundColor: '#f59e0b',
      pointBorderColor: '#1e2736',
      pointBorderWidth: 2,
      borderWidth: 3,
    };
  }
}
