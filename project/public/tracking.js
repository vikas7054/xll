// Web Analytics Tracking Script
// Usage: Initialize with window.AnalyticsTracker.init(projectId) or set window.ANALYTICS_PROJECT_ID before loading
(function() {
  const API_URL = 'https://api1-orpin.vercel.app/api';
  let events = [];
  let recording = false;
  let stopFn = null;
  let sendInterval = null;
  let projectId = null;
  let mousePositions = [];

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getProjectId() {
    if (projectId) return projectId;
    if (window.ANALYTICS_PROJECT_ID) {
      projectId = window.ANALYTICS_PROJECT_ID;
    }
    return projectId;
  }

  function getVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
      visitorId = generateId();
      localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
  }

  function getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = generateId();
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  function startRecording() {
    if (recording || typeof rrweb === 'undefined' || !getProjectId()) return;

    stopFn = rrweb.record({
      emit(event) {
        events.push(event);
        if (events.length >= 10) {
          sendEvents();
        }
      },
      recordCanvas: true,
      recordAfter: 'DOMContentLoaded',
      maskAllInputs: false,
      maskTextSelector: '[data-mask]',
      slimDOMOptions: {
        script: true,
        comment: true,
        headFavicon: true,
        headWhitespace: true,
      },
      sampling: {
        canvas: 10,
        input: 'last',
        scroll: 150,
        media: 500
      },
      dataURLOptions: {
        type: 'image/webp',
        quality: 0.8
      },
      // Capture the viewport dimensions at the start
      inlineStylesheet: true
    });

    recording = true;

    if (sendInterval) clearInterval(sendInterval);
    sendInterval = setInterval(sendEvents, 5000);

    window.addEventListener('beforeunload', () => {
      if (sendInterval) clearInterval(sendInterval);
      sendEvents();
    });
  }

  async function sendEvents() {
    if (events.length === 0 || !getProjectId()) return;

    const eventsToSend = events.splice(0, events.length);
    const sessionData = {
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      events: eventsToSend
    };

    try {
      await fetch(`${API_URL}/${getProjectId()}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
    } catch (error) {
      console.error('Failed to send session data:', error);
      events.unshift(...eventsToSend);
    }
  }

  function trackEvent(eventName, eventData = {}) {
    if (!getProjectId()) {
      console.warn('Analytics: No project ID configured. Set window.ANALYTICS_PROJECT_ID before loading script.');
      return;
    }

    const event = {
      timestamp: new Date().toISOString(),
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      eventName,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language,
      ...eventData
    };

    fetch(`${API_URL}/${getProjectId()}/events/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }).catch(console.error);
  }

  function init(pId) {
    projectId = pId;

    // Wait for rrweb to load before starting recording
    if (document.readyState === 'complete') {
      startRecording();
    } else {
      window.addEventListener('load', startRecording);
    }

    // Track pageview on init
    trackEvent('pageview');

    // Track clicks
    document.addEventListener('click', function(e) {
      const target = e.target.closest('a, button');
      if (target) {
        trackEvent('click', {
          elementType: target.tagName.toLowerCase(),
          elementText: target.textContent?.trim(),
          elementId: target.id,
          elementClass: target.className,
          clickX: e.clientX,
          clickY: e.clientY
        });
      }
    });
  }

  // Auto-initialize if project ID is set
  if (window.ANALYTICS_PROJECT_ID) {
    if (document.readyState === 'complete') {
      init(window.ANALYTICS_PROJECT_ID);
    } else {
      window.addEventListener('load', () => init(window.ANALYTICS_PROJECT_ID));
    }
  }

  // Expose tracking function and init globally
  window.trackEvent = trackEvent;
  window.AnalyticsTracker = {
    init,
    trackEvent,
    getProjectId,
    getVisitorId,
    getSessionId
  };
})();