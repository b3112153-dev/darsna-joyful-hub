import { useCallback, useEffect, useRef, useState } from "react";

const NEAR_BOTTOM = 180;

/**
 * Keeps a chat list pinned to the latest message:
 * - instant jump to the bottom on first load / conversation change (and after images load)
 * - follows new messages only when the user is already near the bottom
 * - always scrolls after the user sends a message (markSent)
 * - shows a floating "new message" button instead of yanking a user who is reading older messages
 * When listRef is null the window is scrolled instead (for page-level lists like topic comments).
 */
export function useChatScroll(
  listRef: React.RefObject<HTMLDivElement | null> | null,
  count: number,
  ready: boolean,
  resetKey: string,
) {
  const [showNew, setShowNew] = useState(false);
  const nearBottom = useRef(true);
  const initialDone = useRef(false);
  const sentByMe = useRef(false);
  const prevCount = useRef(0);

  const target = useCallback((): HTMLElement | null => listRef?.current ?? (document.scrollingElement as HTMLElement | null), [listRef]);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = target();
    if (!el) return;
    if (listRef?.current) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    else window.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, [listRef, target]);

  useEffect(() => {
    initialDone.current = false;
    prevCount.current = 0;
    nearBottom.current = true;
    setShowNew(false);
  }, [resetKey]);

  useEffect(() => {
    const el = target();
    if (!el) return;
    const onScroll = () => {
      nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
      if (nearBottom.current) setShowNew(false);
    };
    const root: HTMLElement | Window = listRef?.current ?? window;
    root.addEventListener("scroll", onScroll, { passive: true } as AddEventListenerOptions);
    return () => root.removeEventListener("scroll", onScroll);
  }, [listRef, target, resetKey]);

  useEffect(() => {
    if (!ready || count === 0) return undefined;
    const el = target();
    if (!el) return undefined;
    if (!initialDone.current) {
      initialDone.current = true;
      prevCount.current = count;
      nearBottom.current = true;
      requestAnimationFrame(() => {
        scrollToBottom(false);
        requestAnimationFrame(() => scrollToBottom(false));
      });
      // images inside messages grow the list after loading; keep pinned while near the bottom
      const onLoad = (event: Event) => {
        if ((event.target as HTMLElement | null)?.tagName === "IMG" && nearBottom.current) scrollToBottom(false);
      };
      el.addEventListener("load", onLoad, true);
      const stop = setTimeout(() => el.removeEventListener("load", onLoad, true), 10_000);
      return () => { clearTimeout(stop); el.removeEventListener("load", onLoad, true); };
    }
    if (count === prevCount.current) return undefined;
    const grew = count > prevCount.current;
    prevCount.current = count;
    if (!grew) return undefined;
    // loading older pages happens at the top of the list: never scroll, never show the button
    if (listRef?.current && el.scrollTop < 200) return undefined;
    if (sentByMe.current) {
      sentByMe.current = false;
      requestAnimationFrame(() => scrollToBottom(true));
    } else if (nearBottom.current) {
      requestAnimationFrame(() => scrollToBottom(true));
    } else {
      setShowNew(true);
      return undefined;
    }
    // message content (avatars, images) can grow right after the scroll; correct once it settles
    const settle = setTimeout(() => { if (nearBottom.current) scrollToBottom(false); }, 450);
    return () => clearTimeout(settle);
  }, [ready, count, listRef, target, scrollToBottom]);

  const markSent = useCallback(() => { sentByMe.current = true; nearBottom.current = true; }, []);
  const jumpToNew = useCallback(() => { setShowNew(false); nearBottom.current = true; scrollToBottom(true); }, [scrollToBottom]);
  return { showNew, markSent, jumpToNew };
}
