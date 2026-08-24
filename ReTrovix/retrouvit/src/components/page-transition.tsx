"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<"enter" | "idle" | "exit">("idle");
  const prevPathname = useRef(pathname);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If pathname changed, trigger exit then enter
    if (prevPathname.current !== pathname) {
      // Scroll to top smoothly on route change
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Start exit animation
      setTransitionStage("exit");

      // After exit animation, swap content and start enter
      timeoutRef.current = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionStage("enter");

        // After enter animation, go idle
        timeoutRef.current = setTimeout(() => {
          setTransitionStage("idle");
        }, 350);
      }, 200);

      prevPathname.current = pathname;
    } else {
      // Initial mount — just show content
      setDisplayChildren(children);
      setTransitionStage("enter");
      timeoutRef.current = setTimeout(() => {
        setTransitionStage("idle");
      }, 350);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname, children]);

  return (
    <div
      className={cn(
        "transition-opacity transition-transform duration-300 ease-out",
        transitionStage === "exit" && "opacity-0 translate-y-2",
        transitionStage === "enter" && "opacity-100 translate-y-0",
        transitionStage === "idle" && "opacity-100 translate-y-0",
        className
      )}
    >
      {displayChildren}
    </div>
  );
}
