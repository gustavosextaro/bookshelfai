import React, { useState, useRef, useEffect } from 'react';
import { 
  motion, 
  useMotionValue, 
  useMotionTemplate, 
  useAnimationFrame 
} from "framer-motion";

/**
 * Helper component for the SVG grid pattern.
 */
const GridPattern = ({ offsetX, offsetY, size }) => {
  return (
    <svg className="infinite-grid-svg">
      <defs>
        <motion.pattern
          id="grid-pattern"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="grid-stroke"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
};

/**
 * The Infinite Grid Background Component
 * Displays a scrolling background grid that reveals an active layer on mouse hover.
 */
const InfiniteGridBackground = () => {
  const [gridSize, setGridSize] = useState(40);
  const containerRef = useRef(null);

  // Track mouse position with Motion Values for performance
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Listen to document-level mouse events to avoid being blocked by overlaying content
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Grid offsets for infinite scroll animation
  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  const speedX = 0.1; 
  const speedY = 0.1;

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get();
    const currentY = gridOffsetY.get();
    // Reset offset at pattern width to simulate infinity
    gridOffsetX.set((currentX + speedX) % gridSize);
    gridOffsetY.set((currentY + speedY) % gridSize);
  });

  // Create a dynamic radial mask for the "flashlight" effect
  const maskImage = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      className="infinite-grid-container"
    >
      {/* Layer 1: Subtle background grid (always visible) */}
      <div className="infinite-grid-layer infinite-grid-layer-subtle">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} size={gridSize} />
      </div>

      {/* Layer 2: Highlighted grid (revealed by mouse mask) */}
      <motion.div 
        className="infinite-grid-layer infinite-grid-layer-highlight"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} size={gridSize} />
      </motion.div>

      {/* Decorative Blur Spheres - REMOVED for Premium SaaS look */}
      {/* 
      <div className="infinite-grid-blur-spheres">
        <div className="blur-sphere blur-sphere-orange" />
        <div className="blur-sphere blur-sphere-primary" />
        <div className="blur-sphere blur-sphere-blue" />
      </div> 
      */}
    </div>
  );
};

export default InfiniteGridBackground;
