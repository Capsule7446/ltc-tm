import type { Action } from './Action';
import { findFirstRootWindow, findMainVideo, getPathTreeDocument, type PageWindow } from './frameUtils';

const CHECK_INTERVAL_MS = 60 * 1000;
const VIDEO_WAIT_ATTEMPTS = 30;
const VIDEO_WAIT_INTERVAL_MS = 500;
const PLAYBACK_RATE = 2;

interface DisplayPanelItem {
  index: number;
  id: string;
  read: boolean;
  selected: boolean;
  title: string;
  href: string;
  element: HTMLLIElement;
}

interface NextVideoItem {
  mode: 'unread' | 'loop';
  item: DisplayPanelItem;
}

function getDisplayPanelReadStatus(doc: Document): DisplayPanelItem[] {
  return [...doc.querySelectorAll<HTMLLIElement>('#displayPanel li')].map((li, index) => {
    const icon = li.querySelector('.icon-node');
    const link = li.querySelector('a');
    const titleEl = link?.querySelector('div');

    return {
      index,
      id: li.id,
      read: icon ? icon.classList.contains('node-finish') : false,
      selected: li.classList.contains('selected'),
      title: titleEl?.textContent?.trim() ?? '',
      href: link?.getAttribute('href') ?? '',
      element: li,
    };
  });
}

function summarizeItem(item: DisplayPanelItem) {
  return {
    index: item.index,
    id: item.id,
    title: item.title,
    href: item.href,
  };
}

function getNextLoopItem(items: DisplayPanelItem[]): DisplayPanelItem | null {
  if (items.length === 0) {
    return null;
  }

  const selectedIndex = items.findIndex((item) => item.selected);

  if (selectedIndex < 0) {
    return items[0];
  }

  return items[(selectedIndex + 1) % items.length];
}

function getNextVideoItem(): NextVideoItem | null {
  return findFirstRootWindow((rootWindow) => {
    const pathTreeDocument = getPathTreeDocument(rootWindow);

    if (!pathTreeDocument) {
      console.warn('[Paul.LTC] 未找到 pathtree document');
      return null;
    }

    const items = getDisplayPanelReadStatus(pathTreeDocument);
    const unreadItems = items.filter((item) => !item.read);
    const selectedItem = items.find((item) => item.selected) ?? null;
    const firstUnread = unreadItems[0] ?? null;
    const loopItem = firstUnread ? null : getNextLoopItem(items);

    console.log('[Paul.LTC] pathTree 狀態', {
      total: items.length,
      unread: unreadItems.length,
      selected: selectedItem ? summarizeItem(selectedItem) : null,
      firstUnread: firstUnread ? summarizeItem(firstUnread) : null,
      loopNext: loopItem ? summarizeItem(loopItem) : null,
    });

    if (firstUnread) {
      return {
        mode: 'unread',
        item: firstUnread,
      };
    }

    if (loopItem) {
      console.log('[Paul.LTC] 所有影片已播放，進入循環播放模式');
      return {
        mode: 'loop',
        item: loopItem,
      };
    }

    return null;
  });
}

function openPathTreeItem(item: DisplayPanelItem) {
  const link = item.element.querySelector<HTMLAnchorElement>('a');
  const clickTarget = (link ?? item.element) as HTMLElement;
  const eventView = clickTarget.ownerDocument.defaultView ?? window;

  for (const eventName of ['mousedown', 'mouseup', 'click']) {
    clickTarget.dispatchEvent(
      new MouseEvent(eventName, {
        bubbles: true,
        cancelable: true,
        view: eventView,
      }),
    );
  }

  clickTarget.click();
  console.log('[Paul.LTC] 已點擊 pathTree 節點', {
    id: item.id,
    title: item.title,
    href: item.href,
    targetTagName: clickTarget.tagName,
  });
}

function getVideoKey(video: HTMLMediaElement): string {
  return video.currentSrc || video.getAttribute('src') || '';
}

async function delay(ms: number) {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function emitVideoEvent(video: HTMLMediaElement, eventName: string) {
  video.dispatchEvent(
    new Event(eventName, {
      bubbles: true,
      cancelable: true,
    }),
  );
}

function getCurrentVideo(): HTMLMediaElement | null {
  return findFirstRootWindow((rootWindow: PageWindow) => findMainVideo(rootWindow));
}

async function waitForCurrentVideo(previousVideoKey = '', maxAttempts = VIDEO_WAIT_ATTEMPTS): Promise<HTMLMediaElement | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const video = getCurrentVideo();

    if (video && (!previousVideoKey || getVideoKey(video) !== previousVideoKey || attempt > 6)) {
      return video;
    }

    await delay(VIDEO_WAIT_INTERVAL_MS);
  }

  return null;
}

async function playVideo(video: HTMLMediaElement) {
  try {
    video.load();
    video.playbackRate = PLAYBACK_RATE;
    emitVideoEvent(video, 'ratechange');
    emitVideoEvent(video, 'mouseover');
    emitVideoEvent(video, 'mousedown');
    emitVideoEvent(video, 'mouseup');
    emitVideoEvent(video, 'click');
    await video.play();
    console.log('[Paul.LTC] 開始播放影片', {
      src: getVideoKey(video),
      currentTime: video.currentTime,
      duration: video.duration,
      paused: video.paused,
      playbackRate: video.playbackRate,
      readyState: video.readyState,
    });
  } catch (error) {
    console.warn('[Paul.LTC] 自動播放失敗，可能被瀏覽器阻擋或播放器未就緒', {
      error,
      src: getVideoKey(video),
      paused: video.paused,
      playbackRate: video.playbackRate,
      readyState: video.readyState,
    });
  }
}

function isVideoActive(video: HTMLMediaElement): boolean {
  return !video.paused && !video.ended;
}

let switching = false;

async function openAndPlayFirstUnreadVideo() {
  if (switching) {
    return;
  }

  const currentVideo = getCurrentVideo();

  if (currentVideo && isVideoActive(currentVideo)) {
    console.log('[Paul.LTC] 目前影片播放中，略過切換', {
      src: getVideoKey(currentVideo),
      currentTime: currentVideo.currentTime,
      duration: currentVideo.duration,
    });
    return;
  }

  const previousVideoKey = currentVideo ? getVideoKey(currentVideo) : '';
  const nextVideoItem = getNextVideoItem();

  if (!nextVideoItem) {
    console.log('[Paul.LTC] 沒有可播放影片');
    return;
  }

  const { item, mode } = nextVideoItem;
  switching = true;
  console.log('[Paul.LTC] 打開影片', {
    mode,
    index: item.index,
    id: item.id,
    title: item.title,
  });

  try {
    openPathTreeItem(item);
    await delay(1000);
    const video = await waitForCurrentVideo(previousVideoKey);

    if (!video) {
      console.warn('[Paul.LTC] 未找到 s_main 影片');
      return;
    }

    video.onended = () => {
      console.log('[Paul.LTC] 影片播放結束');
      void openAndPlayFirstUnreadVideo();
    };

    await playVideo(video);
  } finally {
    switching = false;
  }
}

function startAutoPlayLoop() {
  console.log('[Paul.LTC] 啟動自動播放未完成影片');

  void openAndPlayFirstUnreadVideo();
  window.setInterval(() => {
    void openAndPlayFirstUnreadVideo();
  }, CHECK_INTERVAL_MS);
}

export const autoPlayNextVideoAction: Action = {
  name: 'Auto Play Next Unread Video',
  match: /^https:\/\/www\.ltc-learning\.org\/.*$/,
  run() {
    startAutoPlayLoop();
  },
};
