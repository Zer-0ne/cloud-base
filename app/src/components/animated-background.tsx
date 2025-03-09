'use client'
import { motion, useSpring, useMotionTemplate } from "framer-motion";
import { useEffect, useState } from "react";

// Enhanced complex geometric patterns
const complexPatterns = [
  // Hexagonal grid pattern
  `M0,30 L26,0 L78,0 L104,30 L78,60 L26,60 Z
   M26,0 L52,30 L26,60 M78,0 L52,30 L78,60`,

  // Complex circuit pattern
  `M10,50 Q30,0 50,50 T90,50 M10,50 H90
   M30,20 V80 M50,20 V80 M70,20 V80
   M30,50 H70 M10,20 Q50,0 90,20`,

  // Nested geometric pattern
  `M50,10 L90,30 L90,70 L50,90 L10,70 L10,30 Z
   M50,30 L70,40 L70,60 L50,70 L30,60 L30,40 Z
   M50,40 L60,45 L60,55 L50,60 L40,55 L40,45 Z`,

  // Advanced network pattern
  `M20,20 C40,60 60,0 80,40 S120,60 140,20
   M20,60 C40,100 60,40 80,80 S120,100 140,60
   M20,100 C40,140 60,80 80,120 S120,140 140,100`,

  // Circuit Board Pattern
  `M10,10 H90 V90 H10 Z
   M20,20 H80 V80 H20 Z
   M30,30 H70 V70 H30 Z
   M40,40 H60 V60 H40 Z
   M50,10 V90
   M10,50 H90`,

  // Network Nodes Pattern
  `M20,20 A10,10 0 1,0 40,20 A10,10 0 1,0 20,20
   M60,60 A10,10 0 1,0 80,60 A10,10 0 1,0 60,60
   M20,20 L60,60
   M40,20 L80,60`,

  // Hexagonal Mesh Pattern
  `M10,30 L20,10 L40,10 L50,30 L40,50 L20,50 Z
   M50,30 L60,10 L80,10 L90,30 L80,50 L60,50 Z
   M20,50 L40,50 L50,70 L40,90 L20,90 L10,70 Z`,

  // Digital Wave Pattern
  `M0,50 Q25,25 50,50 T100,50
   M0,70 Q25,45 50,70 T100,70
   M0,90 Q25,65 50,90 T100,90`,

  // Microchip Pattern
  `M20,20 H80 V80 H20 Z
   M30,30 H70 V70 H30 Z
   M50,10 V20
   M50,80 V90
   M10,50 H20
   M80,50 H90`,
  // DNA Helix Pattern
  `M10,10 C20,30 40,30 50,10
   M10,30 C20,50 40,50 50,30
   M10,50 C20,70 40,70 50,50
   M10,70 C20,90 40,90 50,70
   M30,10 L30,90
   M10,10 L10,90
   M50,10 L50,90`,

  // Circuit Board Pattern
  `M10,10 H90 V90 H10 Z
   M20,20 H80 V80 H20 Z
   M30,30 H70 V70 H30 Z
   M40,40 H60 V60 H40 Z
   M50,10 V90
   M10,50 H90`,

  // Network Nodes Pattern
  `M20,20 A10,10 0 1,0 40,20 A10,10 0 1,0 20,20
   M60,60 A10,10 0 1,0 80,60 A10,10 0 1,0 60,60
   M20,20 L60,60
   M40,20 L80,60`,

  // Hexagonal Mesh Pattern
  `M10,30 L20,10 L40,10 L50,30 L40,50 L20,50 Z
   M50,30 L60,10 L80,10 L90,30 L80,50 L60,50 Z
   M20,50 L40,50 L50,70 L40,90 L20,90 L10,70 Z`,

  // Digital Wave Pattern
  `M0,50 Q25,25 50,50 T100,50
   M0,70 Q25,45 50,70 T100,70
   M0,90 Q25,65 50,90 T100,90`,

  // Microchip Pattern
  `M20,20 H80 V80 H20 Z
   M30,30 H70 V70 H30 Z
   M50,10 V20
   M50,80 V90
   M10,50 H20
   M80,50 H90`,

  // Futuristic Grid Pattern
  `M10,10 H90 V90 H10 Z
   M20,20 H80 V80 H20 Z
   M30,30 H70 V70 H30 Z
   M40,40 H60 V60 H40 Z
   M50,10 V90
   M10,50 H90`,

  // Neural Network Pattern
  `M20,20 C40,60 60,0 80,40 S120,60 140,20
   M20,60 C40,100 60,40 80,80 S120,100 140,60
   M20,100 C40,140 60,80 80,120 S120,140 140,100`,

  // Quantum Circuit Pattern
  `M10,10 H90 M10,30 H90 M10,50 H90 M10,70 H90 M10,90 H90
   M20,10 V90 M40,10 V90 M60,10 V90 M80,10 V90
   M20,10 L80,90 M80,10 L20,90`,

  // Blockchain Chain Pattern
  `M10,10 H30 V30 H10 Z
   M30,10 H50 V30 H30 Z
   M50,10 H70 V30 H50 Z
   M70,10 H90 V30 H70 Z
   M10,30 H30 V50 H10 Z
   M30,30 H50 V50 H30 Z
   M50,30 H70 V50 H50 Z
   M70,30 H90 V50 H70 Z`
];

export function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const smoothX = useSpring(0, { stiffness: 20, damping: 40 });
  const smoothY = useSpring(0, { stiffness: 20, damping: 40 });

  // Create dynamic color springs
  const r1 = useSpring(64, { stiffness: 50, damping: 20 });
  const g1 = useSpring(128, { stiffness: 50, damping: 20 });
  const b1 = useSpring(255, { stiffness: 50, damping: 20 });

  const r2 = useSpring(128, { stiffness: 50, damping: 20 });
  const g2 = useSpring(64, { stiffness: 50, damping: 20 });
  const b2 = useSpring(255, { stiffness: 50, damping: 20 });

  const r3 = useSpring(64, { stiffness: 50, damping: 20 });
  const g3 = useSpring(255, { stiffness: 50, damping: 20 });
  const b3 = useSpring(255, { stiffness: 50, damping: 20 });

  // Create dynamic RGBA strings
  const color1 = useMotionTemplate`rgba(${r1}, ${g1}, ${b1}, 0.2)`;
  const color2 = useMotionTemplate`rgba(${r2}, ${g2}, ${b2}, 0.2)`;
  const color3 = useMotionTemplate`rgba(${r3}, ${g3}, ${b3}, 0.2)`;

  useEffect(() => {

    setIsMounted(true);

    if (typeof window !== 'undefined') {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
      const handleResize = () => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        });
      };

      const handleMouseMove = (e: MouseEvent) => {
        requestAnimationFrame(() => {
          const x = e.clientX / window.innerWidth;
          const y = e.clientY / window.innerHeight;
          smoothX.set(x);
          smoothY.set(y);
          setMousePosition({ x, y });
        });
      };

      // Animate colors
      const colorAnimation = setInterval(() => {
        // Color 1 animation
        r1.set(Math.random() * 128 + 64);
        g1.set(Math.random() * 128 + 64);
        b1.set(Math.random() * 128 + 128);

        // Color 2 animation
        r2.set(Math.random() * 128 + 64);
        g2.set(Math.random() * 128 + 64);
        b2.set(Math.random() * 128 + 128);

        // Color 3 animation
        r3.set(Math.random() * 128 + 64);
        g3.set(Math.random() * 128 + 64);
        b3.set(Math.random() * 128 + 128);
      }, 4000);

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        clearInterval(colorAnimation);
      };
    }
  }, []);

  // Don't render anything on server side
  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black to-black opacity-90" />

      {/* Dynamic background gradients with smaller gradient radius */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(circle at 50% 50%, ${color1} 0%, transparent 30%),
            radial-gradient(circle at 30% 70%, ${color2} 0%, transparent 30%),
            radial-gradient(circle at 70% 30%, ${color3} 0%, transparent 30%)
          `
        }}
      />

      {/* Dynamic cursor follow effect with smaller gradient radius */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: useMotionTemplate`radial-gradient(circle at ${smoothX.get() * 100}% ${smoothY.get() * 100}%, ${color1} 0%, transparent 30%)`
        }}
        transition={{
          type: "spring",
          stiffness: 20,
          damping: 40
        }}
      />

      {/* Enhanced grid with complex patterns */}
      <div className="absolute inset-0" style={{ opacity: 0.3 }}>
        <svg className="w-full h-full">
          <defs>
            <pattern
              id="complexGrid"
              width="200"
              height="200"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 200 0 L 0 0 0 200"
                fill="none"
                stroke="rgba(128,128,255,0.2)"
                strokeWidth="0.5"
              />
              <circle cx="100" cy="100" r="4" fill="rgba(64,255,255,0.2)" />
              <path
                d="M 100 100 L 100 0 M 100 100 L 200 100"
                stroke="rgba(64,255,255,0.2)"
                strokeWidth="0.5"
                strokeDasharray="8 8"
              />
              <path
                d="M 50 50 L 150 50 L 150 150 L 50 150 Z"
                fill="none"
                stroke="rgba(128,128,255,0.15)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#complexGrid)" />
        </svg>
      </div>

      {/* Complex animated geometric patterns */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
        >
          <motion.svg
            width="400"
            height="400"
            viewBox="0 0 150 150"
            animate={{
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
              ],
              rotate: [0, 360],
              opacity: [0.1, 0.4],
              scale: [0.7, 1.3],
            }}
            transition={{
              duration: Math.random() * 40 + 50,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          >
            <g>
              <path
                d={complexPatterns[i % complexPatterns.length]}
                fill="none"
                stroke={i % 2 ? "rgba(64,255,255,0.2)" : "rgba(128,128,255,0.2)"}
                strokeWidth="1.5"
              />
              {[...Array(6)].map((_, j) => (
                <circle
                  key={j}
                  cx={25 + j * 20}
                  cy={25 + j * 20}
                  r="2"
                  fill={i % 2 ? "rgba(64,255,255,0.2)" : "rgba(128,128,255,0.2)"}
                />
              ))}
            </g>
          </motion.svg>
        </motion.div>
      ))}

      {/* Enhanced particles (if you want them even smaller, adjust the random size range) */}
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full"
          style={{
            width: `${Math.random() * 4 + 1}px`,
            height: `${Math.random() * 4 + 1}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: useMotionTemplate`rgba(${r1}, ${g1}, ${b1}, 0.6)`
          }}
          animate={{
            opacity: [0.2, 0.7],
            scale: [1, 2.8],
          }}
          transition={{
            duration: Math.random() * 5 + 4,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
