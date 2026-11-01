import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const AUTO_SLIDE_MS = 3000;

/**
 * Single-row card slider used for count cards on small screens.
 * Hidden scrollbar, smooth slide animation, auto-advances (looping) and
 * pauses while the user hovers or touches it. On xl screens the children
 * fall back to a regular 5-column grid and the slider controls are hidden.
 */
export default function CountCardSlider({ children, prevLabel, nextLabel }) {
  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setOverflowing(maxScroll > 1);
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= maxScroll - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    el.addEventListener("scroll", updateEdges, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateEdges);
    };
  }, [updateEdges, children]);

  const slide = useCallback((direction) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild;
    const step = card ? card.getBoundingClientRect().width + 12 : el.clientWidth * 0.8;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (direction > 0 && el.scrollLeft >= maxScroll - 1) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (direction < 0 && el.scrollLeft <= 1) {
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
    } else {
      el.scrollBy({ left: step * direction, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (paused || !overflowing) return undefined;
    const timer = setInterval(() => slide(1), AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, overflowing, slide]);

  // Round pink chevrons overlaid on the card edges so they take no space.
  const arrowClass =
    "xl:hidden absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-pink-100 text-pink-500 dark:bg-pink-500/20 dark:text-pink-300 shadow-sm hover:bg-pink-200 dark:hover:bg-pink-500/30 disabled:opacity-0 disabled:pointer-events-none transition-all";

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {overflowing && (
        <button
          type="button"
          aria-label={prevLabel}
          disabled={atStart}
          onClick={() => slide(-1)}
          className={`${arrowClass} left-0`}
        >
          <ChevronLeft size={20} />
        </button>
      )}

      <div
        ref={trackRef}
        className="no-scrollbar flex xl:grid xl:grid-cols-5 gap-3 overflow-x-auto xl:overflow-visible snap-x snap-mandatory scroll-smooth"
      >
        {children}
      </div>

      {overflowing && (
        <button
          type="button"
          aria-label={nextLabel}
          disabled={atEnd}
          onClick={() => slide(1)}
          className={`${arrowClass} right-0`}
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
