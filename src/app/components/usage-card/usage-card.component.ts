import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-usage-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usage-card.component.html',
  styleUrls: ['./usage-card.component.scss']
})
export class UsageCardComponent {
  totalUsage = input<number>(0);
}
