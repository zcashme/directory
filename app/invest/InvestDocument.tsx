"use client";

import { useState } from "react";
import type { InvestDetail, InvestDocument as InvestDocumentData } from "@/lib/invest/document";
import Button from "@/ui/common/buttons/Button";

type InvestDocumentProps = {
  document: InvestDocumentData;
};

function InlineSocialIcon({ platform }: { platform: "github" | "linkedin" | "x" }) {
  const paths = {
    github: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.464-1.178-1.132-1.49-1.132-1.49-.927-.634.07-.622.07-.622 1.025.072 1.564 1.032 1.564 1.032.91 1.56 2.384 1.088 2.96.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
    linkedin: "M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.94v5.666H9.356V8.999h3.414v1.561h.048c.475-.9 1.637-1.849 3.37-1.849 3.602 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 110-4.124 2.062 2.062 0 010 4.124zm1.777 13.019H3.56V8.999h3.554v11.453zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  };
  const label = platform === "x" ? "X" : platform[0].toUpperCase() + platform.slice(1);

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={paths[platform]} />
      <title>{label}</title>
    </svg>
  );
}

function estimateReadMinutes(content: string): number {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 220));
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\))/g).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) {
      const href = link[2];
      if (href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:")) {
        const platform = link[1].toLowerCase();
        if (platform === "github" || platform === "linkedin" || platform === "x") {
          return (
            <a key={key} className="invest-social-link" href={href} target="_blank" rel="noreferrer" aria-label={platform === "x" ? "X profile" : `${platform} profile`}>
              <InlineSocialIcon platform={platform} />
            </a>
          );
        }
        return <a key={key} href={href} target="_blank" rel="noreferrer">{link[1]}</a>;
      }
    }

    return <span key={key}>{part}</span>;
  });
}

export function MarkdownBody({ markdown }: { markdown: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let index = 0;
  let currentHeading = "";

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line === "---") {
      blocks.push(<hr key={`rule-${index}`} />);
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = `h${heading[1].length}` as "h1" | "h2" | "h3";
      currentHeading = heading[2].trim().toLowerCase();
      blocks.push(<Tag key={`heading-${index}`}>{renderInline(heading[2], `heading-${index}`)}</Tag>);
      index += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: React.ReactNode[] = [];
      const hasChecklistMarker = line.startsWith("- [ ] ");
      const isMilestoneSection = currentHeading === "near-term milestones" || currentHeading === "3-month proof points";
      const isChecklist = hasChecklistMarker || isMilestoneSection;
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        const item = lines[index].trim();
        const itemText = item.startsWith("- [ ] ") ? item.slice(6) : item.slice(2);
        items.push(
          <li key={`item-${index}`} className={isChecklist ? "invest-checklist-item" : undefined}>
            {isChecklist ? <input type="checkbox" checked={false} readOnly aria-hidden="true" tabIndex={-1} /> : null}
            {renderInline(itemText, `item-${index}`)}
          </li>
        );
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`} className={isChecklist ? "invest-checklist" : undefined}>{items}</ul>);
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push(<blockquote key={`quote-${index}`}>{renderInline(line.slice(2), `quote-${index}`)}</blockquote>);
      index += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s+|^- |^> |^---$/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderInline(paragraph.join(" "), `paragraph-${index}`)}</p>);
  }

  return <div className="invest-markdown">{blocks}</div>;
}

export default function InvestDocument({ document }: InvestDocumentProps) {
  const [activeDetail, setActiveDetail] = useState<InvestDetail | null>(null);
  const mainBriefReadMinutes = estimateReadMinutes(document.bodyMarkdown);
  const supportingDetailReadMinutes = estimateReadMinutes(document.details.map((detail) => detail.bodyMarkdown).join(" "));

  function scrollTo(id: string) {
    const target = window.document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="invest-shell" id="invest-page-top">
      <div className="invest-actions">
        <span>CONFIDENTIAL</span>
      </div>
      <article className="invest-paper">
        <header className="invest-document-header">
          <p className="invest-eyebrow">ZcashMe, Inc. / Investor Brief</p>
          <h1>{document.title}</h1>
          {document.subtitle ? <p className="invest-subtitle">{document.subtitle}</p> : null}
          <p className="invest-read-time">
            {mainBriefReadMinutes} minute{mainBriefReadMinutes === 1 ? "" : "s"} brief + {supportingDetailReadMinutes} minute{supportingDetailReadMinutes === 1 ? "" : "s"} details
          </p>
        </header>
        <MarkdownBody markdown={document.bodyMarkdown} />
        <div className="invest-top-action" id="invest-brief-end">
          <Button type="button" variant="ghost" size="xs" className="invest-top-button" onClick={() => scrollTo("invest-page-top")}>
            ^ Top
          </Button>
        </div>
        {document.details.length ? (
          <section className="invest-details" id="invest-supporting-detail" aria-label="Supporting information">
            <p className="invest-eyebrow">Supporting detail</p>
            <div className="invest-detail-actions">
              {document.details.map((detail) => (
                <Button
                  key={detail.title}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={activeDetail?.title === detail.title ? "invest-detail-trigger is-active" : "invest-detail-trigger"}
                  aria-controls={`invest-detail-${detail.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  aria-expanded={activeDetail?.title === detail.title}
                  onClick={() => setActiveDetail(activeDetail?.title === detail.title ? null : detail)}
                >
                  {detail.title}
                </Button>
              ))}
            </div>
            <div className="invest-detail-panels">
              {document.details.map((detail) => {
                const isActive = activeDetail?.title === detail.title;
                return (
                  <div
                    key={detail.title}
                    id={`invest-detail-${detail.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    className={`invest-detail-panel${isActive ? " is-open" : ""}`}
                    aria-hidden={!isActive}
                  >
                    <div className="invest-detail-panel-inner" inert={!isActive}>
                      <h2 className="invest-detail-title">{detail.title}</h2>
                      <MarkdownBody markdown={detail.bodyMarkdown} />
                    </div>
                  </div>
                );
              })}
            </div>
            {activeDetail ? (
              <div className="invest-top-action">
                <Button type="button" variant="ghost" size="xs" className="invest-top-button" onClick={() => scrollTo("invest-brief-end")}>
                  ^ More
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}
        <footer className="invest-document-footer">
          <div className="invest-document-footer-meta">
            <span>Confidential</span>
            <a
              className="invest-investment-link"
              href="https://stack.angellist.com/s/3ckp9gznrw"
              target="_blank"
              rel="noreferrer"
            >
              Direct Investment Link
            </a>
            <span>Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(document.updatedAt))}</span>
          </div>
        </footer>
      </article>
    </main>
  );
}
