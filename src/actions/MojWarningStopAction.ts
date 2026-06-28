import type { Action } from './Action';
import {
  findFirstRootWindow,
  findMainVideo,
  getFrameDocumentByName,
  getPathTreeDocument,
  getRootWindows,
  type PageWindow,
} from './frameUtils';

const STOP_INTERVAL_MS = 15 * 1000;

interface MojWarningStopTarget {
  pageWindow: PageWindow;
  stop: () => void;
}

interface VideoStatus {
  found: boolean;
  playing: boolean;
  targetTagName?: string;
  targetConstructor?: string;
  targetSrc?: string | null;
  targetClassName?: string;
  mediaFound?: boolean;
  mediaTagName?: string;
  mediaSrc?: string;
  paused?: boolean;
  ended?: boolean;
  readyState?: number;
  currentTime?: number;
  duration?: number;
}

interface VideoTarget {
  targetElement: Element;
  mediaElement: HTMLMediaElement | null;
}

function findMojWarningStop(rootWindow: PageWindow): MojWarningStopTarget | null {
  const pathtreeDocument = getPathTreeDocument(rootWindow);
  const pathtreeWindow = pathtreeDocument?.defaultView as PageWindow | null;

  if (typeof pathtreeWindow?.moj_warning_stop === 'function') {
    return {
      pageWindow: pathtreeWindow,
      stop: pathtreeWindow.moj_warning_stop.bind(pathtreeWindow),
    };
  }

  return null;
}

function isMediaElement(element: Element): element is HTMLMediaElement {
  return element.tagName === 'VIDEO' || element.tagName === 'AUDIO';
}

function getFrameDocumentFromElement(element: Element): Document | null {
  if (element.tagName === 'IFRAME' || element.tagName === 'FRAME') {
    try {
      return (element as HTMLIFrameElement | HTMLFrameElement).contentWindow?.document ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

function findMediaElement(targetElement: Element): HTMLMediaElement | null {
  if (isMediaElement(targetElement)) {
    return targetElement;
  }

  const nestedMedia = targetElement.querySelector<HTMLMediaElement>('video, audio');

  if (nestedMedia) {
    return nestedMedia;
  }

  const frameDocument = getFrameDocumentFromElement(targetElement);

  return frameDocument?.querySelector<HTMLMediaElement>('video, audio') ?? null;
}

function findCurrentVideo(rootWindow: PageWindow): VideoTarget | null {
  const mainDocument = getFrameDocumentByName('s_main', rootWindow);
  const targetElement =
    mainDocument?.querySelector('video.fp-engine') ??
    mainDocument?.querySelector('#video video') ??
    mainDocument?.querySelector('video') ??
    mainDocument?.querySelector('#video');

  if (!targetElement) {
    return null;
  }

  return {
    targetElement,
    mediaElement: findMediaElement(targetElement),
  };
}

function getCurrentVideoStatus(): VideoStatus {
  for (const pageWindow of getRootWindows()) {
    const mediaElement = findMainVideo(pageWindow);
    const videoTarget = mediaElement
      ? {
          targetElement: mediaElement,
          mediaElement,
        }
      : findCurrentVideo(pageWindow);

    if (videoTarget) {
      const mediaElement = videoTarget.mediaElement;
      const targetElement = videoTarget.targetElement;
      const playerElement = targetElement.closest('#video') ?? targetElement;
      const playerClassList = Array.from(playerElement.classList);
      const playerClassName = playerClassList.join(' ');
      const classPlaying = playerClassList.includes('is-playing');
      const classPaused = playerClassList.includes('is-paused');

      if (!mediaElement) {
        return {
          found: true,
          playing: classPlaying && !classPaused,
          targetTagName: targetElement.tagName,
          targetConstructor: targetElement.constructor.name,
          targetSrc: targetElement.getAttribute('src'),
          targetClassName: playerClassName,
          mediaFound: false,
        };
      }

      const mediaPlaying = !mediaElement.paused && !mediaElement.ended && mediaElement.readyState >= 2;

      return {
        found: true,
        playing: mediaPlaying || (classPlaying && !classPaused),
        targetTagName: targetElement.tagName,
        targetConstructor: targetElement.constructor.name,
        targetSrc: targetElement.getAttribute('src'),
        targetClassName: playerClassName,
        mediaFound: true,
        mediaTagName: mediaElement.tagName,
        mediaSrc: mediaElement.currentSrc || mediaElement.getAttribute('src') || '',
        paused: mediaElement.paused,
        ended: mediaElement.ended,
        readyState: mediaElement.readyState,
        currentTime: mediaElement.currentTime,
        duration: mediaElement.duration,
      };
    }
  }

  return {
    found: false,
    playing: false,
  };
}

async function waitForMojWarningStop(maxAttempts = 20, intervalMs = 250): Promise<MojWarningStopTarget> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const target = findFirstRootWindow(findMojWarningStop);

    if (target) {
      return target;
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, intervalMs);
    });
  }

  throw new Error('moj_warning_stop is not available on this page');
}

async function runMojWarningStop() {
  const videoStatus = getCurrentVideoStatus();
  console.log('[Paul.LTC] 影片狀態', videoStatus);

  if (!videoStatus.playing) {
    return;
  }

  const target = await waitForMojWarningStop();
  target.stop();
  console.log('[Paul.LTC] 清除成功', target.pageWindow.moj_time_obj);
}

function startMojWarningStopTimer(intervalMs = STOP_INTERVAL_MS) {
  console.log('[Paul.LTC] 啟動影片檢測定時任務', {
    intervalMs,
  });

  void runMojWarningStop().catch((error) => {
    console.warn('[Paul.LTC] moj_warning_stop failed', error);
  });

  window.setInterval(() => {
    void runMojWarningStop().catch((error) => {
      console.warn('[Paul.LTC] moj_warning_stop failed', error);
    });
  }, intervalMs);
}

export const mojWarningStopAction: Action = {
  name: 'Stop MOJ Warning',
  match: /^https:\/\/www\.ltc-learning\.org\/.*$/,
  run() {
    startMojWarningStopTimer();
  },
};
