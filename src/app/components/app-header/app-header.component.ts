import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonTitle } from "@ionic/angular/standalone";

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonTitle],
})
export class AppHeaderComponent {
  addToolbarBottomPadding = input<boolean>(false);
  title = input<string>('');
  innerHtmlTitle = input<string>('');
  defaultHref = input<string>('/');
  selectedInverter = input<string>('');
  showBackButton = input<boolean>(true);
  showCustomBackButton = input<boolean>(false);
  showEditButton = input<boolean>(false);
  editButtonText = input<string>('buttons.edit');
  showSaveButton = input<boolean>(false);
  isSaveButtonDisabled = input<boolean>(false);
  showDeleteButton = input<boolean>(false);
  deleteClick = output<Event>();
  editClick = output<Event>();
  saveClick = output<Event>();
  backClick = output<Event>();

  hasMultipleEndButtons = computed(() => {
    let buttonCount = 0;
    if (this.showEditButton()) buttonCount++;
    if (this.showSaveButton()) buttonCount++;
    if (this.selectedInverter()) buttonCount++;
    return buttonCount > 1;
  });
}

