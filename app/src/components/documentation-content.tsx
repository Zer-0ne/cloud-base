'use client'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import Image from 'next/image'
import { DocSectionNav } from './doc-section-nav'
import { DocTableOfContents } from './doc-table-contents'


const documentationMarkdown = `
# Cloud Storage Application Documentation

## Overview

This documentation provides an overview of the Cloud Storage Application, its features, and how to use them.

## Features

1. **Dashboard**
   - View usage analytics
   - Check drive usage
   - Manage API keys
   - Upload files
   - View recent activity

2. **File Management**
   - Browse files and folders
   - Upload, download, and delete files
   - Create new folders

3. **API Key Management**
   - Generate new API keys
   - View and manage existing keys
   - Set storage allocations for keys

4. **Analytics**
   - View usage trends
   - Analyze storage distribution
   - Monitor user growth

5. **Admin Panel**
   - Manage users
   - Monitor system logs
   - Configure system settings
   - Moderate content

## Getting Started

1. Log in to your account
2. Navigate through the sidebar to access different features
3. Use the dashboard for a quick overview of your account

## API Usage

To use the API, follow these steps:

1. Generate an API key in the API Key Management section
2. Use the key in your API requests
3. Monitor your usage in the Analytics section

\`\`\`javascript
// Example API usage
const response = await fetch('https://api.cloudstorageapp.com/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fileName: 'example.txt',
    content: 'Hello, World!',
  }),
});
\`\`\`

## File Types Supported

| File Type | Maximum Size | Supported Formats |
|-----------|--------------|-------------------|
| Images    | 20 MB        | JPG, PNG, GIF     |
| Documents | 50 MB        | PDF, DOCX, TXT    |
| Videos    | 100 MB       | MP4, AVI, MOV     |
| Audio     | 30 MB        | MP3, WAV, AAC     |

## User Interface

![Cloud Storage Dashboard](/placeholder.svg?height=300&width=500)

## Support

For additional help, please contact our support team at support@cloudstorageapp.com.

---

*Thank you for using our Cloud Storage Application!*
`


// Custom Components with correct typing

const CustomH1 = ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
    <h1 className="text-4xl font-bold mb-6 pb-2 border-b border-gray-300 dark:border-gray-700" {...props}>
        {children}
    </h1>
)

const CustomH2 = ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
    <h2 className="text-3xl font-semibold mt-8 mb-4" {...props}>
        {children}
    </h2>
)

const CustomH3 = ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
    <h3 className="text-2xl font-medium mt-6 mb-3" {...props}>
        {children}
    </h3>
)

const CustomH4 = ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
    <h4 className="text-xl font-medium mt-4 mb-2" {...props}>
        {children}
    </h4>
)

const CustomH5 = ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
    <h5 className="text-lg font-medium mt-3 mb-2" {...props}>
        {children}
    </h5>
)

const CustomH6 = ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
    <h6 className="text-base font-medium mt-2 mb-1" {...props}>
        {children}
    </h6>
)

const CustomP = ({ children, ...props }: React.HTMLProps<HTMLParagraphElement>) => (
    <p className="mb-4 leading-relaxed" {...props}>
        {children}
    </p>
)

const CustomUl = ({ children, ...props }: React.HTMLProps<HTMLUListElement>) => (
    <ul className="list-disc pl-6 mb-4 space-y-2" {...props}>
        {children}
    </ul>
)

const CustomOl = ({ children, ...props }: React.HTMLProps<HTMLOListElement>) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2" {...props as any}>
        {children}
    </ol>
)

const CustomLi = ({ children, ...props }: React.HTMLProps<HTMLLIElement>) => (
    <li className="mb-1" {...props}>
        {children}
    </li>
)

const CustomBlockquote = ({ children, ...props }: React.HTMLProps<HTMLElement>) => (
    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 italic bg-gray-100 dark:bg-gray-800 rounded" {...props as any}>
        {children}
    </blockquote>
)

const CustomCode = ({ inline, className, children, ...props }: any & { inline: boolean, className?: string }) => {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match ? (
        <SyntaxHighlighter style={tomorrow} language={match[1]} PreTag="div" className="rounded-md mb-4" {...props}>
            {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
    ) : (
        <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-sm" {...props}>
            {children}
        </code>
    )
}

const CustomA = ({ href, children, ...props }: React.HTMLProps<HTMLAnchorElement> & { href?: string }) => (
    <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
        {children}
    </a>
)

const CustomImg = ({ src, alt, ...props }: any & { src?: string, alt?: string }) => (
    <div className="my-4">
        <Image
            src={src || ''}
            alt={alt || ''}
            width={500}
            height={300}
            layout="responsive"
            className="rounded-lg"
            {...props}
        />
    </div>
)

const CustomTable = ({ children, ...props }: React.HTMLProps<HTMLTableElement>) => (
    <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700" {...props}>
            {children}
        </table>
    </div>
)

const CustomThead = ({ children, ...props }: React.HTMLProps<HTMLTableSectionElement>) => (
    <thead className="bg-gray-50 dark:bg-gray-800" {...props}>{children}</thead>
)

const CustomTh = ({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) => (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" {...props}>
        {children}
    </th>
)

const CustomTr = ({ children, ...props }: React.HTMLProps<HTMLTableRowElement>) => (
    <tr {...props}>{children}</tr>
)

const CustomTd = ({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" {...props}>
        {children}
    </td>
)

const CustomHr = ({ ...props }: React.HTMLProps<HTMLElement>) => (
    <hr className="my-8 border-t border-gray-300 dark:border-gray-700" {...props as any} />
)

const CustomStrong = ({ children, ...props }: React.HTMLProps<HTMLElement>) => (
    <strong className="font-semibold" {...props}>{children}</strong>
)

const CustomEm = ({ children, ...props }: React.HTMLProps<HTMLElement>) => (
    <em className="italic" {...props}>{children}</em>
)

export function DocumentationContent() {
    const [content, setContent] = useState('')

    useEffect(() => {
        setContent(documentationMarkdown)
    }, [])

    return (
        <div className="flex justify-between">
      <div className="w-64 pr-8 hidden lg:block">
        <div className="sticky top-20">
          <DocTableOfContents content={content} />
        </div>
      </div>
      <div className="flex-grow max-w-3xl mx-auto">
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              h1: CustomH1,
              h2: CustomH2,
              h3: CustomH3,
              h4: CustomH4,
              h5: CustomH5,
              h6: CustomH6,
              p: CustomP,
              ul: CustomUl,
              ol: CustomOl,
              li: CustomLi,
              blockquote: CustomBlockquote,
              code: CustomCode,
              a: CustomA,
              img: CustomImg,
              table: CustomTable,
              thead: CustomThead,
              th: CustomTh,
              tr: CustomTr,
              td: CustomTd,
              hr: CustomHr,
              strong: CustomStrong,
              em: CustomEm,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
      <div className="w-64 pl-8 hidden xl:block">
        <div className="sticky top-20">
          <DocSectionNav content={content} />
        </div>
      </div>
    </div>
    )
}
