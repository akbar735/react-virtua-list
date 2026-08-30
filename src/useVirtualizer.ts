import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

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
    getItemHeight?: (index: number) => number;
    isItemMeasured?: (index: number) => boolean;
    getItemMeasurementVersion?: (index: number) => number;
};

interface IParams {
    itemCount: number;
    itemHeight?: number;
    estimateHeight?: number;
    overscan?: number;
    containerHeight: number;
    scrollElementRef?: RefObject<HTMLDivElement | null>;
}

function findStartIndex(offsets: number[], itemCount: number, scrollTop: number) {
    let low = 0;
    let high = itemCount - 1;

    while (low <= high) {
        const mid = (low + high) >> 1;

        if (offsets[mid] <= scrollTop) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return Math.max(0, low - 1);
}

export function useVirtualizer({
    itemCount,
    itemHeight,
    overscan,
    containerHeight,
    estimateHeight,
    scrollElementRef,
}: IParams): VirtualizerResult {
    const [scrollTop, setScrollTop] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const [, setMeasurementVersion] = useState(0);

    const scrollTopRef = useRef(0);
    const scrollTimeoutRef = useRef<number | null>(null);
    const scrollRafRef = useRef<number | null>(null);
    const measurementRafRef = useRef<number | null>(null);
    const measurementVersionRef = useRef(0);
    const heightsRef = useRef<Map<number, number>>(new Map());
    const offsetsRef = useRef<number[]>([]);
    const pendingMeasurementsRef = useRef<Map<number, number>>(new Map());
    const measuredIndexesRef = useRef<Set<number>>(new Set());
    const pendingMeasuredIndexesRef = useRef<Set<number>>(new Set());
    const itemMeasurementVersionsRef = useRef<Map<number, number>>(new Map());
    const configRef = useRef({ itemCount, estimateHeight: estimateHeight ?? 50 });

    const isFixed = typeof itemHeight === "number";
    const overscanCount = overscan ?? 0;
    const estimate = estimateHeight ?? 50;
    configRef.current = { itemCount, estimateHeight: estimate };

    const rebuildOffsets = useCallback(() => {
        const { itemCount: count, estimateHeight: currentEstimate } = configRef.current;
        const offsets = new Array<number>(count);
        let sum = 0;

        for (let index = 0; index < count; index++) {
            offsets[index] = sum;
            sum += heightsRef.current.get(index) ?? currentEstimate;
        }

        offsetsRef.current = offsets;
    }, []);

    const getTotalHeight = useCallback(() => {
        const { itemCount: count, estimateHeight: currentEstimate } = configRef.current;
        if (count === 0) return 0;

        return (offsetsRef.current[count - 1] ?? 0) +
            (heightsRef.current.get(count - 1) ?? currentEstimate);
    }, []);

    const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        scrollTopRef.current = event.currentTarget.scrollTop;

        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = requestAnimationFrame(() => {
            scrollRafRef.current = null;
            setScrollTop(scrollTopRef.current);
        });

        setIsScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = window.setTimeout(() => setIsScrolling(false), 100);
    }, []);

    const flushMeasurements = useCallback(() => {
        measurementRafRef.current = null;

        const pendingMeasurements = pendingMeasurementsRef.current;
        const pendingMeasuredIndexes = pendingMeasuredIndexesRef.current;
        if (pendingMeasurements.size === 0 && pendingMeasuredIndexes.size === 0) return;

        const nextMeasurementVersion = measurementVersionRef.current + 1;
        measurementVersionRef.current = nextMeasurementVersion;
        for (const index of pendingMeasuredIndexes) {
            itemMeasurementVersionsRef.current.set(index, nextMeasurementVersion);
        }
        pendingMeasuredIndexes.clear();

        if (pendingMeasurements.size === 0) {
            setMeasurementVersion(version => version + 1);
            return;
        }

        const { itemCount: count } = configRef.current;
        const currentScrollTop = scrollElementRef?.current?.scrollTop ?? scrollTopRef.current;
        const anchorIndex = count > 0
            ? findStartIndex(offsetsRef.current, count, currentScrollTop)
            : 0;
        const anchorOffset = offsetsRef.current[anchorIndex] ?? 0;
        const offsetWithinAnchor = currentScrollTop - anchorOffset;

        for (const [index, size] of pendingMeasurements) {
            heightsRef.current.set(index, size);
        }
        pendingMeasurements.clear();
        rebuildOffsets();

        // Keep the top visible row fixed while measured rows replace estimates.
        const nextScrollTop = Math.max(
            0,
            Math.min(
                (offsetsRef.current[anchorIndex] ?? 0) + offsetWithinAnchor,
                Math.max(0, getTotalHeight() - containerHeight)
            )
        );

        if (scrollElementRef?.current) {
            scrollElementRef.current.scrollTop = nextScrollTop;
        }
        scrollTopRef.current = nextScrollTop;
        setScrollTop(nextScrollTop);
        setMeasurementVersion(version => version + 1);
    }, [containerHeight, getTotalHeight, rebuildOffsets, scrollElementRef]);

    const setItemHeight = useCallback((index: number, size: number) => {
        if (!Number.isFinite(size) || size < 0) return;

        const wasMeasured = measuredIndexesRef.current.has(index);
        measuredIndexesRef.current.add(index);
        const existingSize = pendingMeasurementsRef.current.get(index)
            ?? heightsRef.current.get(index)
            ?? configRef.current.estimateHeight;
        if (existingSize === size) {
            if (!wasMeasured) {
                pendingMeasuredIndexesRef.current.add(index);
                if (!measurementRafRef.current) {
                    measurementRafRef.current = requestAnimationFrame(flushMeasurements);
                }
            }
            return;
        }

        pendingMeasuredIndexesRef.current.add(index);
        const measuredSize = heightsRef.current.get(index) ?? configRef.current.estimateHeight;
        if (measuredSize === size) {
            pendingMeasurementsRef.current.delete(index);
        } else {
            pendingMeasurementsRef.current.set(index, size);
        }

        if (!measurementRafRef.current) {
            measurementRafRef.current = requestAnimationFrame(flushMeasurements);
        }
    }, [flushMeasurements]);

    useEffect(() => {
        rebuildOffsets();
        setMeasurementVersion(version => version + 1);
    }, [estimate, itemCount, rebuildOffsets]);

    useEffect(() => () => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        if (measurementRafRef.current) cancelAnimationFrame(measurementRafRef.current);
    }, []);

    // Keep offsets correct during the render in which the list size changes.
    if (offsetsRef.current.length !== itemCount) {
        rebuildOffsets();
    }

    if (itemCount === 0) {
        return {
            startIndex: 0,
            endIndex: -1,
            offsetY: 0,
            totalHeight: 0,
            onScroll,
            isScrolling,
            visibleStartIndex: 0,
            visibleEndIndex: -1,
            setItemHeight: isFixed ? undefined : setItemHeight,
            getOffset: isFixed ? undefined : () => 0,
            getItemHeight: isFixed ? undefined : () => estimate,
            isItemMeasured: isFixed ? undefined : () => false,
            getItemMeasurementVersion: isFixed ? undefined : () => 0,
        };
    }

    if (isFixed) {
        const baseStartIndex = Math.floor(scrollTop / itemHeight);
        const visibleEndIndex = Math.min(
            itemCount - 1,
            Math.floor((scrollTop + containerHeight) / itemHeight)
        );
        const startIndex = Math.max(0, baseStartIndex - overscanCount);
        const endIndex = Math.min(itemCount - 1, visibleEndIndex + overscanCount);

        return {
            startIndex,
            endIndex,
            offsetY: startIndex * itemHeight,
            totalHeight: itemCount * itemHeight,
            onScroll,
            isScrolling,
            visibleStartIndex: baseStartIndex,
            visibleEndIndex,
        };
    }

    const startIndex = findStartIndex(offsetsRef.current, itemCount, scrollTop);
    let nextIndex = startIndex;
    let nextOffset = offsetsRef.current[startIndex] ?? 0;

    while (nextIndex < itemCount && nextOffset < scrollTop + containerHeight) {
        nextOffset += heightsRef.current.get(nextIndex) ?? estimate;
        nextIndex++;
    }

    const visibleEndIndex = Math.max(startIndex, nextIndex - 1);
    const finalStart = Math.max(0, startIndex - overscanCount);
    const finalEnd = Math.min(itemCount - 1, visibleEndIndex + overscanCount);

    return {
        startIndex: finalStart,
        endIndex: finalEnd,
        offsetY: offsetsRef.current[finalStart] ?? 0,
        totalHeight: getTotalHeight(),
        onScroll,
        isScrolling,
        visibleStartIndex: startIndex,
        visibleEndIndex,
        setItemHeight,
        getOffset: index => offsetsRef.current[index] ?? 0,
        getItemHeight: index => heightsRef.current.get(index) ?? estimate,
        isItemMeasured: index => measuredIndexesRef.current.has(index),
        getItemMeasurementVersion: index => itemMeasurementVersionsRef.current.get(index) ?? 0,
    };
}
