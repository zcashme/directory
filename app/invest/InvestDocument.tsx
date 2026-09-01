"use client";

import { useState } from "react";
import type { InvestDetail, InvestDocument as InvestDocumentData } from "@/lib/invest/document";
import Button from "@/ui/common/buttons/Button";

type InvestDocumentProps = {
  document: InvestDocumentData;
};

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
    window.document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="invest-shell" id="invest-page-top">
      <div className="invest-actions">
        <span>CONFIDENTIAL</span>
        <a
          className="invest-investment-link"
          href="https://stack.angellist.com/s/3ckp9gznrw"
          target="_blank"
          rel="noreferrer"
        >
          Direct Investment Link
        </a>
      </div>
      <article className="invest-paper">
        <header className="invest-document-header">
          <p className="invest-eyebrow">ZcashMe, Inc. / Investor Brief</p>
          <h1>{document.title}</h1>
          {document.subtitle ? <p className="invest-subtitle">{document.subtitle}</p> : null}
          <p className="invest-read-time">~{mainBriefReadMinutes} min main brief <span aria-hidden="true">·</span> +~{supportingDetailReadMinutes} min supporting detail</p>
        </header>
        <MarkdownBody markdown={document.bodyMarkdown} />
        <div className="invest-top-action">
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
                <Button type="button" variant="ghost" size="xs" className="invest-top-button" onClick={() => scrollTo("invest-supporting-detail")}>
                  ^ Top
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}
        <footer className="invest-document-footer">
          <div className="invest-document-footer-meta">
            <span>Confidential</span>
            <span>Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(document.updatedAt))}</span>
          </div>
          <a
            className="invest-investment-link"
            href="https://stack.angellist.com/s/3ckp9gznrw"
            target="_blank"
            rel="noreferrer"
          >
            Direct Investment Link
          </a>
        </footer>
      </article>
    </main>
  );
}
