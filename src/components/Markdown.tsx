import type { ReactNode } from "react";
import { parseMarkdown, type Block, type Inline } from "@/lib/markdown";

/**
 * Renders untrusted Markdown as React elements. No HTML string is injected:
 * raw HTML is stripped by the parser and everything else is plain text.
 */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return <div className={`prose-liftoff ${className ?? ""}`}>{blocks.map(renderBlock)}</div>;
}

function renderBlock(block: Block, key: number): ReactNode {
  switch (block.type) {
    case "heading":
      return block.level === 3 ? (
        <h3 key={key}>{renderInline(block.children)}</h3>
      ) : (
        <h4 key={key}>{renderInline(block.children)}</h4>
      );
    case "paragraph":
      return <p key={key}>{renderInline(block.children)}</p>;
    case "quote":
      return <blockquote key={key}>{renderInline(block.children)}</blockquote>;
    case "list": {
      const items = block.items.map((item, index) => <li key={index}>{renderInline(item)}</li>);
      return block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
    }
  }
}

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, key) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "break":
        return <br key={key} />;
      case "code":
        return <code key={key}>{node.value}</code>;
      case "strong":
        return <strong key={key}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={key}>{renderInline(node.children)}</em>;
      case "link":
        return (
          <a key={key} href={node.href} target="_blank" rel="noopener noreferrer nofollow">
            {renderInline(node.children)}
          </a>
        );
    }
  });
}
