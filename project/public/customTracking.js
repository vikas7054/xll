// Custom Web Analytics Tracking Script
// This is the default template. It is served per-project from:
//   GET  /api/custom/:projectId/tracking.js        -> returns JS (for <script src>)
//   GET  /api/custom/:projectId/tracking-script   -> returns JSON { scriptContent, updatedAt }
//   PUT  /api/custom/:projectId/tracking-script   -> saves updated script
//   POST /api/custom/:projectId/tracking-script/reset -> resets to this default
//
// Usage on your site:
//   <script>window.ANALYTICS_PROJECT_ID = 'YOUR_PROJECT_ID';</script>
//   <script src="https://unpkg.com/rrweb@2.0.0-alpha.4/dist/rrweb.min.js"></script>
//   <script src="https://api1-orpin.vercel.app/api/custom/YOUR_PROJECT_ID/tracking.js" defer></script>
(function() {
  const API_URL = 'https://api1-orpin.vercel.app/api/custom';
  let events = [];
  let recording = false;
  let stopFn = null;
  let sendInterval = null;
  let projectId = null;

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
      screenResolution: window.screen.width + 'x' + window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      events: eventsToSend
    };

    try {
      await fetch(API_URL + '/' + getProjectId() + '/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
    } catch (error) {
      console.error('Failed to send session data:', error);
      events.unshift(...eventsToSend);
    }
  }

  function trackEvent(eventName, eventData) {
    if (!getProjectId()) {
      console.warn('Analytics: No project ID configured.');
      return;
    }

    var event = {
      timestamp: new Date().toISOString(),
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      eventName: eventName,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: window.screen.width + 'x' + window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language
    };
    if (eventData) Object.assign(event, eventData);

    fetch(API_URL + '/' + getProjectId() + '/events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(console.error);
  }

  function init(pId) {
    projectId = pId;

    if (document.readyState === 'complete') {
      startRecording();
    } else {
      window.addEventListener('load', startRecording);
    }

    trackEvent('pageview');

    document.addEventListener('click', function(e) {
      var target = e.target.closest('a, button');
      if (target) {
        trackEvent('click', {
          elementType: target.tagName.toLowerCase(),
          elementText: target.textContent ? target.textContent.trim() : '',
          elementId: target.id,
          elementClass: target.className,
          clickX: e.clientX,
          clickY: e.clientY
        });
      }
    });
  }

  if (window.ANALYTICS_PROJECT_ID) {
    if (document.readyState === 'complete') {
      init(window.ANALYTICS_PROJECT_ID);
    } else {
      window.addEventListener('load', function() { init(window.ANALYTICS_PROJECT_ID); });
    }
  }

  window.trackEvent = trackEvent;
  window.AnalyticsTracker = {
    init: init,
    trackEvent: trackEvent,
    getProjectId: getProjectId,
    getVisitorId: getVisitorId,
    getSessionId: getSessionId
  };
})();
