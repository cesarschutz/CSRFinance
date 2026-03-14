import { Component, Input, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { CurrencyBrlPipe } from '../../pipes/currency-brl.pipe';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, CurrencyBrlPipe],
  template: `
    <div class="donut-wrapper">
      <div class="donut-container">
        <canvas baseChart
          [type]="'doughnut'"
          [data]="chartData"
          [options]="chartOptions">
        </canvas>
        <div class="donut-center">
          <span class="donut-center-label">{{ centerLabel }}</span>
          <span class="donut-center-value money">{{ total | currencyBrl }}</span>
        </div>
      </div>
      @if (showLegend) {
        <div class="donut-legend">
          @for (segment of segments; track segment.label) {
            <div class="legend-item">
              <span class="legend-color" [style.background]="segment.color"></span>
              <span class="legend-label">{{ segment.label }}</span>
              <span class="legend-value money">{{ segment.value | currencyBrl }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './donut-chart.component.scss',
})
export class DonutChartComponent implements OnChanges {
  @Input() segments: DonutSegment[] = [];
  @Input() centerLabel = 'Total';
  @Input() showLegend = true;

  total = 0;

  chartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

    chartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(18, 18, 30, 0.95)',
        borderColor: 'rgba(108, 92, 231, 0.2)',
        borderWidth: 1,
        titleColor: '#EEEEF4',
        bodyColor: '#5C5D72',
        boxPadding: 4,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed;
            const formatted = new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(value);
            return `${ctx.label}: ${formatted}`;
          },
        },
      },
    },
  };

  ngOnChanges(): void {
    this.total = this.segments.reduce((sum, s) => sum + s.value, 0);
    this.chartData = {
      labels: this.segments.map(s => s.label),
      datasets: [{
        data: this.segments.map(s => s.value),
        backgroundColor: this.segments.map(s => s.color),
        borderWidth: 0,
        hoverOffset: 4,
      }],
    };
  }
}
