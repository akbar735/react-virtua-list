import React,{ useImperativeHandle, useRef, useState } from 'react'
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
    scrollToIndex : (index: number, options?: {align?: ScrollAlign, behavior: ScrollBehavior}) => void
}

export interface IVirtuaListProps{
    height: number;
    itemCount: number;
    itemHeight: number;
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
    }, ref){
        const containerRef = useRef<HTMLDivElement>(null);

        useImperativeHandle(ref, () => ({
            scrollToIndex: (index, options) => {
                if(!containerRef.current) return;
                if (index < 0 || index >= itemCount) return;

                const align = options?.align || 'start'

                let scrollTop = index * itemHeight;

                scrollTop = Math.max(
  0,
                    Math.min(scrollTop, totalHeight - height)
                );

                if(align === 'center'){
                    scrollTop = index * itemHeight - (height / 2) + (itemHeight / 2)

                }
                if(align === 'end'){
                    scrollTop = index * itemHeight - height + itemHeight
                }
                containerRef.current.scrollTo({
                    top: scrollTop,
                    behavior: options?.behavior || 'auto'
                })
            }
        }))
        const {
            startIndex, 
            endIndex, 
            offsetY, 
            totalHeight, 
            onScroll,
            isScrolling,
            visibleStartIndex,
            visibleEndIndex,
        } = useVirtualizer({
            itemCount,
            itemHeight,
            overscan,
            containerHeight: height,
        })

        const items = [];
        for(let i = startIndex; i <= endIndex; i++){

            const isVisible = i >= visibleStartIndex && i <= visibleEndIndex
            items.push(
                <div 
                    key={i}
                    className={itemClassName} 
                    style={{
                        height: itemHeight, 
                        width:'100%',
                        ...itemStyle
                    }}
                >
                    {renderItem({
                        index: i,
                        style: {
                            height: itemHeight,
                            width: '100%'
                        },
                        isScrolling,
                        isVisible
                    })}
                </div>
            )
        }
        
        return (
            <div 
                className={className}
                style={{
                    height:height, 
                    overflowY:'auto',
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
                    <div style={{transform: `translateY(${offsetY}px)`, willChange:'transform'}}>
                        {items}
                    </div>
                </div>
            </div>
        )
}
) 