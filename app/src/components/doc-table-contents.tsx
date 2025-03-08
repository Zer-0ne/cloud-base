"use client"

import { useState, useEffect } from 'react'
import { cn } from "@/lib/utils"

interface TableOfContentsProps {
  content: string
}

interface TocItem {
  id: string
  title: string
  level: number
}

export function DocTableOfContents({ content }: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const headings = content.match(/^#{1,6}\s+.+$/gm) || []
    const tocItems = headings?.map((heading) => {
      const level = heading.match(/^#+/)?.[0].length || 1
      const title = heading.replace(/^#+\s+/, '')
      const id = title.toLowerCase().replace(/[^\w]+/g, '-')
      return { id, title, level }
    })
    setToc(tocItems)
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

    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      observer.observe(heading)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <nav className="space-y-1">
      {toc?.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "block py-1 text-sm transition-colors hover:text-foreground",
            item.level === 1 ? "font-semibold" : "pl-4",
            item.level === 3 ? "pl-8" : "",
            activeId === item.id ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {item.title}
        </a>
      ))}
    </nav>
  )
}

