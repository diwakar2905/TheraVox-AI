/**
 * PostHog Analytics Client-Side Tracker for TheraVox AI
 */

interface EventProperties {
  [key: string]: any;
}

class PostHogAnalytics {
  private apiKey: string;
  private apiHost: string;
  private isInitialized: boolean = false;

  constructor() {
    this.apiKey = import.meta.env.VITE_POSTHOG_API_KEY || '';
    this.apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
    this.init();
  }

  private init() {
    if (!this.apiKey) {
      console.info('[Analytics] VITE_POSTHOG_API_KEY not configured. Client telemetry running in local mode.');
      return;
    }
    // Dynamic posthog-js load or local tracking
    this.isInitialized = true;
  }

  track(event: string, properties?: EventProperties) {
    console.info(`[Analytics Event] ${event}`, properties || '');
    if (this.isInitialized && (window as any).posthog) {
      (window as any).posthog.capture(event, properties);
    }
  }

  identify(userId: string, userProperties?: EventProperties) {
    if (this.isInitialized && (window as any).posthog) {
      (window as any).posthog.identify(userId, userProperties);
    }
  }
}

export const analytics = new PostHogAnalytics();
