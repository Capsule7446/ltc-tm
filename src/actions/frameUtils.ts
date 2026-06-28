export interface PageWindow extends Window {
  moj_warning_stop?: () => void;
  moj_time_obj?: unknown;
}

declare const unsafeWindow: PageWindow | undefined;

export type FrameRoot = Document | PageWindow;

export function getRootWindows(): PageWindow[] {
  const roots = [window as PageWindow];

  if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) {
    roots.unshift(unsafeWindow as PageWindow);
  }

  return roots;
}

export function getFrameDocumentByName(name: string, root: FrameRoot = window as PageWindow): Document | null {
  const rootDocument = 'document' in root ? root.document : root;
  const frames = rootDocument.querySelectorAll<HTMLIFrameElement | HTMLFrameElement>('iframe, frame');

  for (const frame of frames) {
    try {
      if (frame.name === name) {
        return frame.contentWindow?.document ?? null;
      }

      if (frame.contentWindow) {
        const childDocument = getFrameDocumentByName(name, frame.contentWindow as PageWindow);

        if (childDocument) {
          return childDocument;
        }
      }
    } catch {
      // Ignore cross-origin frames.
    }
  }

  return null;
}

export function getPathTreeDocument(rootWindow: PageWindow): Document | null {
  const catalogDocument = getFrameDocumentByName('s_catalog', rootWindow);

  return catalogDocument ? getFrameDocumentByName('pathtree', catalogDocument) : null;
}

export function getMainDocument(rootWindow: PageWindow): Document | null {
  return getFrameDocumentByName('s_main', rootWindow);
}

export function findMainVideo(rootWindow: PageWindow): HTMLMediaElement | null {
  const mainDocument = getMainDocument(rootWindow);

  return (
    mainDocument?.querySelector<HTMLMediaElement>('video.fp-engine') ??
    mainDocument?.querySelector<HTMLMediaElement>('#video video') ??
    mainDocument?.querySelector<HTMLMediaElement>('video') ??
    null
  );
}

export function findFirstRootWindow<T>(finder: (rootWindow: PageWindow) => T | null): T | null {
  for (const rootWindow of getRootWindows()) {
    const result = finder(rootWindow);

    if (result) {
      return result;
    }
  }

  return null;
}
