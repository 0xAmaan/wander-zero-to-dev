"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshWrapperProps {
  children: React.ReactNode;
  intervalMs?: number;
}

export const AutoRefreshWrapper = ({
  children,
  intervalMs = 10000, // Default: 10 seconds
}: AutoRefreshWrapperProps) => {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return <>{children}</>;
};
