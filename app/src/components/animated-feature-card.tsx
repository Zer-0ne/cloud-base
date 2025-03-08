import type React from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"

interface AnimatedFeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

export function AnimatedFeatureCard({ icon, title, description }: AnimatedFeatureCardProps) {
  return (
    // Outer container with fade-in and infinite pulse animation.
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: [1, 1.02, 1] // Pulsing animation
      }}
      transition={{
        duration: 0.5,
        scale: { duration: 2, repeat: Infinity, repeatType: "mirror" }
      }}
    >
      {/* Wrapper for creative hover on the card */}
      <motion.div
        whileHover={{ scale: 1.05, rotate: 2 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card className="h-full backdrop-blur-md bg-black/30 border">
          <CardContent className="flex flex-col items-center p-6 text-center">
            {/* Icon with creative hover effect and infinite slow rotation */}
            <motion.div
              className="mb-4 text-white"
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              // animate={{ rotate: [0, 60, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {icon}
            </motion.div>
            <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-300">{description}</p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
