import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export function MarkdownView({ content, className = "" }: MarkdownViewProps) {
  if (!content) return null;

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-inherit">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[0.9em] font-mono">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/60 pl-3 my-1.5 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-inherit hover:opacity-80 transition-opacity font-semibold"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-2 text-inherit">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2 text-inherit">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-bold mb-1 mt-1 text-inherit">{children}</h3>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
