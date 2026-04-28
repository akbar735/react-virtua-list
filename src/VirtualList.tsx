import React, { useImperativeHandle, useRef, useState } from 'react'
import { useVirtualizer } from './useVirtualizer';

export type ScrollAlign = 'start' | 'center' | 'end'
export type ScrollBehavior = 'smooth' | 'instant' | 'auto'
export type RenderItemType = (props: {
    index: number;
    style: React.CSSProperties;
    isScrolling: boolean;
    isVisible: boolean;
}) => React.ReactNode;

export type VirtualListRef = {
    scrollToIndex: (index: number, options?: { align?: ScrollAlign, behavior: ScrollBehavior }) => void
}

export interface IVirtuaListProps {
    height: number;
    itemCount: number;
    itemHeight?: number;
    overscan?: number;
    renderItem: RenderItemType,
    className?: string;
    style?: React.CSSProperties;
    innerClassName?: string;
    innerStyle?: React.CSSProperties;
    itemClassName?: string;
    itemStyle?: React.CSSProperties;
}

export const VirtualList = React.forwardRef<VirtualListRef, IVirtuaListProps>(
    function VirtualList(
        {
            height,
            itemCount,
            itemHeight,
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

        useImperativeHandle(ref, () => ({
            scrollToIndex: (index, options) => {
                if (!containerRef.current) return;
                if (index < 0 || index >= itemCount) return;

                const align = options?.align || 'start';

                let scrollTop = 0;

                if (itemHeight) {
                    // ✅ FIXED MODE
                    scrollTop = index * itemHeight;

                    if (align === 'center') {
                        scrollTop = index * itemHeight - height / 2 + itemHeight / 2;
                    }

                    if (align === 'end') {
                        scrollTop = index * itemHeight - height + itemHeight;
                    }
                } else if (getOffset) {
                    // 🔥 DYNAMIC MODE
                    const itemTop = getOffset(index);

                    let itemHeightDynamic = 0;

                    // estimate height if exact not known
                    const nextOffset = getOffset(index + 1);
                    itemHeightDynamic = nextOffset - itemTop || 50;

                    if (align === 'start') {
                        scrollTop = itemTop;
                    }

                    if (align === 'center') {
                        scrollTop = itemTop - height / 2 + itemHeightDynamic / 2;
                    }

                    if (align === 'end') {
                        scrollTop = itemTop - height + itemHeightDynamic;
                    }
                }

                // ✅ clamp AFTER alignment
                scrollTop = Math.max(
                    0,
                    Math.min(scrollTop, totalHeight - height)
                );

                containerRef.current.scrollTo({
                    top: scrollTop,
                    behavior: options?.behavior || 'auto'
                });
            }
        }));
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
            getOffset

        } = useVirtualizer({
            itemCount,
            itemHeight,
            overscan,
            containerHeight: height,
        })

        function MeasuredItem({
            index,
            children
        }: {
            index: number;
            children: React.ReactNode;
        }) {
            const ref = useRef<HTMLDivElement>(null);

            React.useEffect(() => {
                if (!ref.current || !setItemHeight) return;

                const el = ref.current;

                const observer = new ResizeObserver((entries) => {
                    for (let entry of entries) {
                        const height = entry.contentRect.height;
                        setItemHeight(index, height);
                    }
                });

                observer.observe(el);

                return () => observer.disconnect();
            }, []);

            return <div ref={ref}>{children}</div>;
        }

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
                    <MeasuredItem key={i} index={i}>
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