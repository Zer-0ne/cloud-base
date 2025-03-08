"use client"

import { useState, useEffect } from 'react'
import { cn } from "@/lib/utils"

interface SectionNavProps {
  content: string
}

interface NavItem {
  id: string
  title: string
  level: number
}

export function DocSectionNav({ content }: SectionNavProps) {
  const [navItems, setNavItems] = useState<NavItem[]>([])
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const headings = content.match(/^#{2,3}\s+.+$/gm) || []
    const items = headings?.map((heading) => {
      const level = heading.match(/^#+/)?.[0].length || 2
      const title = heading.replace(/^#+\s+/, '')
      const id = title.toLowerCase().replace(/[^\w]+/g, '-')
      return { id, title, level }
    })
    setNavItems(items)
  }, [content])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '0px 0px -80% 0px' }
    )

    document.querySelectorAll('h2, h3').forEach((heading) => {
      observer.observe(heading)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <nav className="space-y-1">
      <p className="font-medium mb-4">On this page</p>
      {navItems?.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "block py-1 text-sm transition-colors hover:text-foreground",
            item.level === 2 ? "pl-0" : "pl-4",
            activeId === item.id ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {item.title}
        </a>
      ))}
    </nav>
  )
}

