import { CommonModule } from '@angular/common';
import { Component, effect, input, output, signal } from '@angular/core';
import {
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';

export interface SegmentOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-custom-segment',
  templateUrl: './custom-segment.component.html',
  styleUrls: ['./custom-segment.component.scss'],
  imports: [CommonModule, IonSegment, IonSegmentButton, IonLabel],
})
export class CustomSegmentComponent {
  label = input<string>('');
  value = input<string>('');
  valueChange = output<string>();
  disabled = input<boolean>(false);

  options = input.required<SegmentOption[]>();
  currentValue = signal<string>('');

  constructor() {
    effect(() => {
      const newValue = this.value();
      if (newValue !== this.currentValue()) {
        this.currentValue.set(newValue);
      }
    });
  }

  onSegmentChange(event: any) {
    const newValue = event.detail.value;
    this.currentValue.set(newValue);
    this.valueChange.emit(newValue);
  }
}
