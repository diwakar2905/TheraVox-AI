/**
 * PostHog Analytics Client-Side Tracker for TheraVox AI
 */

interface EventProperties {
  [key: string]: unknown;
}

interface PostHogClient {
  capture: (event: string, properties?: EventProperties) => void;
  identify: (userId: string, properties?: EventProperties) => void;
}

function getPostHog(): PostHogClient | undefined {
  return (window as Window & { posthog?: PostHogClient }).posthog;
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
    console.info(`[Analytics] PostHog configured (${this.apiHost}).`);
  }

  track(event: string, properties?: EventProperties) {
    console.info(`[Analytics Event] ${event}`, properties || '');
    const posthog = getPostHog();
    if (this.isInitialized && posthog) {
      posthog.capture(event, properties);
    }
  }

  identify(userId: string, userProperties?: EventProperties) {
    const posthog = getPostHog();
    if (this.isInitialized && posthog) {
      posthog.identify(userId, userProperties);
    }
  }
}

export const analytics = new PostHogAnalytics();
