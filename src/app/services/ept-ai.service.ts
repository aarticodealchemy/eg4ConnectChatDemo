import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    eptAIConfig: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class EptAiService {
  private scriptLoaded = false;
  private outsideClickAttached = false;

  /** Initialize Ept AI (lazy, only once) */
  private async init(): Promise<void> {
    if (this.scriptLoaded) return;

    window.eptAIConfig = {
      // accessToken: await this.getAccessToken(),
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9JjbGllbnRfaWQiOiJjY2M3YjQ0YS02Y2Q1LTRjYjUtYjQ4YS00YjY4YjQ0YjQ0YjQiLCJpYXQiOjE3NjQ0MzM4NzUsImV4cCI6MTc2NDQzNzQ3NX0',
      botName: environment.eptAI.botName,
      initiallyHidden: true,
      openonload: false,
      showMaximizeButton: false,
      showLauncher: false,

      darkMode: true,
    };

    const script = document.createElement('script');
    script.id = 'ept-ai-loader';
    script.src = 'https://assets.ept.ai/chatbot/loader.js';
    script.async = true;

    script.onload = () => {
      this.attachOutsideClickHandler();
    };

    document.body.appendChild(script);
    this.scriptLoaded = true;
  }

  /** Open chatbot (called from FAB) */
  async show(): Promise<void> {
    await this.init();
    window.eptAIConfig?.show?.();
  }

  /** Hide chatbot */
  hide(): void {
    window.eptAIConfig?.hide?.();
  }

  /** Close chatbot when user taps outside it */
  private attachOutsideClickHandler(): void {
    if (this.outsideClickAttached) return;

    document.addEventListener('click', (event) => {
      const chatbot = document.querySelector('ept-chatbot');
      if (!chatbot) return;

      if (!chatbot.contains(event.target as Node)) {
        window.eptAIConfig?.hide?.();
      }
    });

    this.outsideClickAttached = true;
  }

  /** Fetch access token from backend */
  private async getAccessToken(): Promise<string> {
    const response = await fetch(
      `${environment.eptAI.tokenEndpoint}?client_id=${environment.eptAI.clientId}`
    );

    if (!response.ok) {
      console.error('EPT AI: Failed to fetch access token');
      return '';
    }

    const data = await response.json();
    return data.access_token;
  }
}
