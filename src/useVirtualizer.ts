import { useRef, useState } from "react";

interface IParams{
    itemCount: number;
    itemHeight: number;
    overscan?: number;
    containerHeight: number;
}
export function useVirtualizer({
    itemCount,
    itemHeight,
    overscan,
    containerHeight,
}: IParams){

    const [scrollTop, setScrollTop] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef<number | null>(null);

    const baseStartIndex = Math.floor(scrollTop / itemHeight);

    const visibleEndIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);

    const startIndex = Math.max(0, baseStartIndex - (overscan || 0))

    const endIndex = Math.min(
        itemCount -1,
        visibleEndIndex + (overscan || 0)
    )

    const offsetY = startIndex * itemHeight;

    const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
        setIsScrolling(true);

        if(scrollTimeout.current){
            clearTimeout(scrollTimeout.current)
        }
        scrollTimeout.current = setTimeout(() => {
            setIsScrolling(true)
        }, 100)
    }

    return {
        startIndex,
        endIndex,
        offsetY,
        totalHeight:  itemCount * itemHeight,
        onScroll,
        isScrolling,

        // needed for isVisible
        visibleStartIndex: baseStartIndex,
        visibleEndIndex
    }
}