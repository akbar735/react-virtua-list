import React, { useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { useVirtualizer } from './useVirtualizer';

export type ScrollAlign = 'start' | 'center' | 'end'
export type ScrollBehavior = 'smooth' | 'instant' | 'auto'
export type ScrollToIndexOptions = {
    align?: ScrollAlign;
    behavior?: ScrollBehavior;
    /** Extra pixels to add to the final scroll position. */
    offset?: number;
}
export type RenderItemType = (props: {
    index: number;
    style: React.CSSProperties;
    isScrolling: boolean;
    isVisible: boolean;
}) => React.ReactNode;

export type VirtualListRef = {
    /**
     * Scroll to an item. Pass a number as the second argument for a pixel offset,
     * or an options object when combining an offset with alignment or behavior.
     */
    scrollToIndex: (index: number, options?: ScrollToIndexOptions | number) => void
}

export interface IVirtuaListProps {
    height: number;
    itemCount: number;
    itemHeight?: number;
    estimateHeight?: number;
    overscan?: number;
    renderItem: RenderItemType,
    className?: string;
    style?: React.CSSProperties;
    innerClassName?: string;
    innerStyle?: React.CSSProperties;
    itemClassName?: string;
    itemStyle?: React.CSSProperties;
}

type MeasuredItemProps = {
    index: number;
    onResize: (index: number, height: number) => void;
    onElement: (index: number, element: HTMLDivElement | null) => void;
    children: React.ReactNode;
};

type ScrollRequest = {
    index: number;
    align: ScrollAlign;
    offset: number;
    measurementVersion: number;
    waitForMeasurement: boolean;
};

function MeasuredItem({ index, onResize, onElement, children }: MeasuredItemProps) {
    const itemRef = useRef<HTMLDivElement>(null);
    const setItemRef = useCallback((element: HTMLDivElement | null) => {
        itemRef.current = element;
        onElement(index, element);
    }, [index, onElement]);

    useLayoutEffect(() => {
        const element = itemRef.current;
        if (!element) return;

        const reportSize = () => onResize(index, element.getBoundingClientRect().height);
        const observer = new ResizeObserver(reportSize);

        reportSize();
        observer.observe(element);

        return () => observer.disconnect();
    }, [index, onResize]);

    // Establish a block formatting context so vertical margins in a rendered row
    // are part of the measured height instead of becoming untracked spacing.
    return <div ref={setItemRef} style={{ display: 'flow-root' }}>{children}</div>;
}

export const VirtualList = React.forwardRef<VirtualListRef, IVirtuaListProps>(
    function VirtualList(
        {
            height,
            itemCount,
            itemHeight,
            estimateHeight,
            overscan,
            renderItem,
            className,
            style,
            innerClassName,
            innerStyle,
            itemClassName,
            itemStyle
        }, ref) {
        const containerRef = useRef<HTMLDivElement>(null);
        const itemElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());
        const pendingScrollRequestRef = useRef<ScrollRequest | null>(null);
        const {
            startIndex,
            endIndex,
            offsetY,
            totalHeight,
            onScroll,
            isScrolling,
            visibleStartIndex,
            visibleEndIndex,
            setItemHeight,
            getOffset,
            getItemHeight,
            isItemMeasured,
            getItemMeasurementVersion

        } = useVirtualizer({
            itemCount,
            itemHeight,
            estimateHeight,
            overscan,
            containerHeight: height,
            scrollElementRef: containerRef,
        })

        const getScrollTopForIndex = useCallback((index: number, align: ScrollAlign, offset: number) => {
            const currentItemHeight = typeof itemHeight === 'number'
                ? itemHeight
                : getItemHeight?.(index) ?? estimateHeight ?? 50;
            const itemTop = typeof itemHeight === 'number'
                ? index * itemHeight
                : getOffset?.(index) ?? 0;

            let scrollTop = itemTop;

            if (align === 'center') {
                scrollTop -= height / 2 - currentItemHeight / 2;
            } else if (align === 'end') {
                scrollTop -= height - currentItemHeight;
            }

            return Math.max(0, Math.min(scrollTop + offset, totalHeight - height));
        }, [estimateHeight, getItemHeight, getOffset, height, itemHeight, totalHeight]);

        const registerItemElement = useCallback((index: number, element: HTMLDivElement | null) => {
            if (element) {
                itemElementsRef.current.set(index, element);
            } else {
                itemElementsRef.current.delete(index);
            }
        }, []);

        const alignItemElement = useCallback((element: HTMLDivElement, align: ScrollAlign, offset: number) => {
            const container = containerRef.current;
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            const itemRect = element.getBoundingClientRect();
            const viewportTop = containerRect.top + container.clientTop;
            const viewportBottom = viewportTop + container.clientHeight;

            let adjustment = itemRect.top - viewportTop;
            if (align === 'center') {
                adjustment = itemRect.top + itemRect.height / 2 - (viewportTop + container.clientHeight / 2);
            } else if (align === 'end') {
                adjustment = itemRect.bottom - viewportBottom;
            }

            const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
            const scrollTop = Math.max(0, Math.min(container.scrollTop + adjustment + offset, maxScrollTop));
            container.scrollTo({ top: scrollTop, behavior: 'auto' });
        }, []);

        const scrollToIndex = useCallback((index: number, options?: ScrollToIndexOptions | number) => {
            if (!containerRef.current || index < 0 || index >= itemCount) return;

            const scrollOptions = typeof options === 'number' ? { offset: options } : options;
            const align = scrollOptions?.align ?? 'start';
            const requestedOffset = scrollOptions?.offset ?? 0;
            const offset = Number.isFinite(requestedOffset) ? requestedOffset : 0;
            const itemWasMeasured = isItemMeasured?.(index) ?? false;
            pendingScrollRequestRef.current = typeof itemHeight === 'number' ? null : {
                index,
                align,
                offset,
                measurementVersion: getItemMeasurementVersion?.(index) ?? 0,
                waitForMeasurement: !itemWasMeasured,
            };

            containerRef.current.scrollTo({
                top: getScrollTopForIndex(index, align, offset),
                behavior: scrollOptions?.behavior ?? 'auto'
            });
        }, [getItemMeasurementVersion, getScrollTopForIndex, isItemMeasured, itemCount, itemHeight]);

        useImperativeHandle(ref, () => ({ scrollToIndex }), [scrollToIndex]);

        useLayoutEffect(() => {
            const request = pendingScrollRequestRef.current;
            const element = request && itemElementsRef.current.get(request.index);
            if (!request || !element || typeof itemHeight === 'number') return;

            // The DOM rectangle is the source of truth while nearby dynamic rows
            // are still being measured; it avoids alignment errors from estimates.
            alignItemElement(element, request.align, request.offset);

            const measuredVersion = getItemMeasurementVersion?.(request.index) ?? 0;
            if (!request.waitForMeasurement || measuredVersion > request.measurementVersion) {
                pendingScrollRequestRef.current = null;
            }
        }, [alignItemElement, getItemMeasurementVersion, itemHeight]);

        const items = [];
        for (let i = startIndex; i <= endIndex; i++) {

            const isVisible = i >= visibleStartIndex && i <= visibleEndIndex;

            const content = (
                <div
                    className={itemClassName}
                    style={{
                        height: itemHeight ?? 'auto', // will be ignored in dynamic mode
                        width: '100%',
                        ...itemStyle
                    }}
                >
                    {renderItem({
                        index: i,
                        style: {
                            height: itemHeight ?? 'auto',
                            width: '100%'
                        },
                        isScrolling,
                        isVisible
                    })}
                </div>
            );

            // 🔥 Wrap only if dynamic mode
            items.push(
                setItemHeight ? (
                    <MeasuredItem
                        key={i}
                        index={i}
                        onResize={setItemHeight}
                        onElement={registerItemElement}
                    >
                        {content}
                    </MeasuredItem>
                ) : (
                    <React.Fragment key={i}>
                        {content}
                    </React.Fragment>
                )
            );
        }

        return (
            <div
                className={className}
                style={{
                    height: height,
                    overflowY: 'auto',
                    overflowAnchor: 'none',
                    ...style
                }}
                ref={containerRef}
                onScroll={onScroll}
            >
                <div
                    className={innerClassName}
                    style={{
                        height: totalHeight,
                        ...innerStyle
                    }}
                >
                    <div style={{ transform: `translateY(${offsetY}px)`, willChange: isScrolling ? 'transform' : undefined }}>
                        {items}
                    </div>
                </div>
            </div>
        )
    }
)
