import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={`oig-skeleton${className ? ` ${className}` : ""}`} aria-hidden="true" />
);
