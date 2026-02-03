"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";

export function BorderBeam({
  duration = 6,
  lightColor = "#f5c542",
  borderWidth = 2,
  beamSize = 80,
  className,
  ...props
}) {
  const containerRef = useRef(null);
  const pathRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Get actual path length after render
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [dimensions]);

  const { width, height } = dimensions;
  const radius = height / 2;

  // Create SVG path for pill shape - start from top-left, go clockwise
  const pillPath = width && height
    ? `M ${radius},0
       L ${width - radius},0
       A ${radius},${radius} 0 0 1 ${width},${radius}
       A ${radius},${radius} 0 0 1 ${width - radius},${height}
       L ${radius},${height}
       A ${radius},${radius} 0 0 1 0,${radius}
       A ${radius},${radius} 0 0 1 ${radius},0`
    : "";

  // Calculate dash for beam effect
  const dashLength = beamSize;
  const gapLength = pathLength - dashLength;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 rounded-[inherit] pointer-events-none",
        className
      )}
      style={{ overflow: "visible" }}
      {...props}
    >
      <svg
        className="absolute w-full h-full"
        style={{
          overflow: "visible",
          left: 0,
          top: 0,
        }}
        viewBox={width && height ? `0 0 ${width} ${height}` : undefined}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Gradient for the beam */}
          <linearGradient id="beam-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
            <stop offset="0%" stopColor={lightColor} stopOpacity="0" />
            <stop offset="25%" stopColor={lightColor} stopOpacity="0.5" />
            <stop offset="50%" stopColor={lightColor} stopOpacity="1" />
            <stop offset="75%" stopColor={lightColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={lightColor} stopOpacity="0" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="beam-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Static subtle border */}
        <path
          d={pillPath}
          fill="none"
          stroke={`${lightColor}30`}
          strokeWidth={borderWidth}
        />

        {/* Hidden path to measure length */}
        <path
          ref={pathRef}
          d={pillPath}
          fill="none"
          stroke="transparent"
          strokeWidth={0}
        />

        {/* Animated beam using stroke-dashoffset */}
        {pathLength > 0 && (
          <motion.path
            d={pillPath}
            fill="none"
            stroke={lightColor}
            strokeWidth={borderWidth + 1}
            strokeLinecap="round"
            filter="url(#beam-glow)"
            strokeDasharray={`${dashLength} ${gapLength}`}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -pathLength }}
            transition={{
              duration: duration,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </svg>
    </div>
  );
}

export default BorderBeam;
