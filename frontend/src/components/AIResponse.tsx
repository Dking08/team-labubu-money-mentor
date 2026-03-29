"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import UIBlocks from "./UIBlocks";

interface AIResponseProps {
  text: string;
  blocks?: UIBlock[];
  className?: string;
}

export interface UIBlock {
  type: "stat_row" | "allocation_chart" | "action_card" | "comparison_table" | "timeline" | "alert" | "key_value";
  items?: any[];
  data?: any;
  title?: string;
  description?: string;
  cta?: string;
  variant?: string;
}

export default function AIResponse({ text, blocks, className }: AIResponseProps) {
  return (
    <div className={`ai-response ${className || ""}`}>
      {/* Dynamic UI blocks first (if present) */}
      {blocks && blocks.length > 0 && <UIBlocks blocks={blocks} />}

      {/* Rich markdown rendering */}
      <div className="ai-markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="ai-md-h1">{children}</h1>,
            h2: ({ children }) => <h2 className="ai-md-h2">{children}</h2>,
            h3: ({ children }) => <h3 className="ai-md-h3">{children}</h3>,
            h4: ({ children }) => <h4 className="ai-md-h4">{children}</h4>,
            p: ({ children }) => <p className="ai-md-p">{children}</p>,
            strong: ({ children }) => <strong className="ai-md-strong">{children}</strong>,
            em: ({ children }) => <em className="ai-md-em">{children}</em>,
            ul: ({ children }) => <ul className="ai-md-ul">{children}</ul>,
            ol: ({ children }) => <ol className="ai-md-ol">{children}</ol>,
            li: ({ children }) => <li className="ai-md-li">{children}</li>,
            blockquote: ({ children }) => <blockquote className="ai-md-blockquote">{children}</blockquote>,
            hr: () => <hr className="ai-md-hr" />,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="ai-md-link">{children}</a>
            ),
            table: ({ children }) => (
              <div className="ai-md-table-wrapper">
                <table className="ai-md-table">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="ai-md-thead">{children}</thead>,
            th: ({ children }) => <th className="ai-md-th">{children}</th>,
            td: ({ children }) => <td className="ai-md-td">{children}</td>,
            code: ({ className: codeClassName, children, ...props }) => {
              const match = /language-(\w+)/.exec(codeClassName || "");
              const content = String(children).replace(/\n$/, "");
              // @ts-ignore
              if (props.node?.tagName === "code" && props.node?.parent?.tagName === "pre") {
                return null; // Handled by pre
              }
              if (match) {
                return (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: "16px 0",
                      borderRadius: "12px",
                      fontSize: "13px",
                      background: "#1a1b26",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {content}
                  </SyntaxHighlighter>
                );
              }
              return <code className="ai-md-inline-code">{children}</code>;
            },
            pre: ({ children }) => {
              // Check if this pre contains a code with a language class
              // @ts-ignore
              const codeChild = children?.props;
              if (codeChild) {
                const match = /language-(\w+)/.exec(codeChild.className || "");
                if (match) {
                  return (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: "16px 0",
                        borderRadius: "12px",
                        fontSize: "13px",
                        background: "#1a1b26",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {String(codeChild.children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  );
                }
              }
              return <pre className="ai-md-pre">{children}</pre>;
            },
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
