import { useRef, useState, useCallback, useEffect } from "react";
type VirtualizerResult = {
    startIndex: number;
    endIndex: number;
    offsetY: number;
    totalHeight: number;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    isScrolling: boolean;
    visibleStartIndex: number;
    visibleEndIndex: number;
    setItemHeight?: (index: number, size: number) => void;
    getOffset?: (index: number) => number;
};
interface IParams {
    itemCount: number;
    // Fixed mode
    itemHeight?: number;
    // Dynamic mode
    estimateHeight?: number;
    overscan?: number;
    containerHeight: number;
}

export function useVirtualizer({
    itemCount,
    itemHeight,
    overscan,
    containerHeight,
    estimateHeight
}: IParams): VirtualizerResult {
    const [scrollTop, setScrollTop] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);

    const scrollTimeout = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const pendingRef = useRef(false);
    const overscanCount = overscan ?? 0;
    const isFixed = typeof itemHeight === "number";
    const estimate = estimateHeight ?? 50;

    // 🧠 Edge case: empty list
    if (itemCount === 0) {
        return {
            startIndex: 0,
            endIndex: -1,
            offsetY: 0,
            totalHeight: 0,
            onScroll: () => { },
            isScrolling: false,
            visibleStartIndex: 0,
            visibleEndIndex: -1,
        };
    }



    const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const nextScrollTop = e.currentTarget.scrollTop;

        // Throttle using RAF
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
            setScrollTop(nextScrollTop);
        });

        // Scrolling state
        setIsScrolling(true);

        if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
        }

        scrollTimeout.current = window.setTimeout(() => {
            setIsScrolling(false);
        }, 100);
    }, []);

    // 🧹 Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    if (isFixed) {
        const baseStartIndex = Math.floor(scrollTop / itemHeight);

        const visibleEndIndex = Math.min(
            itemCount - 1,
            Math.floor((scrollTop + containerHeight) / itemHeight)
        );

        const startIndex = Math.max(0, baseStartIndex - overscanCount);

        const endIndex = Math.min(
            itemCount - 1,
            visibleEndIndex + overscanCount
        );

        const offsetY = startIndex * itemHeight;
        return {
            startIndex,
            endIndex,
            offsetY,
            totalHeight: itemCount * itemHeight,
            onScroll,
            isScrolling,

            // visibility tracking
            visibleStartIndex: baseStartIndex,
            visibleEndIndex,
        };
    }

    // 🔥 Dynamic mode
    const heightsRef = useRef<Map<number, number>>(new Map());
    const offsetsRef = useRef<number[]>([]);

    // force re-render
    const [, forceUpdate] = useState({});

    const rebuildOffsets = () => {
        const offsets = new Array(itemCount);

        let sum = 0;

        for (let i = 0; i < itemCount; i++) {
            offsets[i] = sum;
            sum += heightsRef.current.get(i) ?? estimate;
        }

        offsetsRef.current = offsets;
    };

    const setItemHeight = (index: number, size: number) => {
        const current = heightsRef.current.get(index);

        if (current !== size) {
            heightsRef.current.set(index, size);

            if (!pendingRef.current) {
                pendingRef.current = true;

                requestAnimationFrame(() => {
                    rebuildOffsets();
                    forceUpdate({});
                    pendingRef.current = false;
                });
            }
        }
    };

    useEffect(() => {
        rebuildOffsets();
    }, [itemCount]);

    if (offsetsRef.current.length === 0) {
        rebuildOffsets();
    }
    
    const findStartIndex = (scrollTop: number) => {
        let low = 0;
        let high = itemCount - 1;
        const offsets = offsetsRef.current;

        while (low <= high) {
            const mid = (low + high) >> 1;

            if (offsets[mid] < scrollTop) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return Math.max(0, low - 1);
    };

    const startIndex = findStartIndex(scrollTop);

    let endIndex = startIndex;
    let offset = offsetsRef.current[startIndex] ?? 0;

    while (
        endIndex < itemCount &&
        offset < scrollTop + containerHeight
    ) {
        offset += heightsRef.current.get(endIndex) ?? estimate;
        endIndex++;
    }

    const finalStart = Math.max(0, startIndex - overscanCount);
    const finalEnd = Math.min(itemCount - 1, endIndex + overscanCount);

    const offsetY = offsetsRef.current[finalStart] ?? 0;

    const totalHeight =
        (offsetsRef.current[itemCount - 1] ?? 0) +
        (heightsRef.current.get(itemCount - 1) ?? estimate);

    const visibleStartIndex = startIndex;
    const visibleEndIndex = endIndex;


    const getOffset = (index: number) => {
        return offsetsRef.current[index] ?? 0;
    };

    return {
        startIndex: finalStart,
        endIndex: finalEnd,
        offsetY,
        totalHeight,
        onScroll,
        isScrolling,
        visibleStartIndex,
        visibleEndIndex,
        setItemHeight,
        getOffset
    };
}