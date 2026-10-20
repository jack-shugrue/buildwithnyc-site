import { Link } from '@nycopportunity/react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Text written in the CMS: paragraphs, **bold**, *italics*, links and
 * bulleted lists, drawn with the site's own styles. Headings, images and raw
 * HTML aren't allowed, so a post can't break the page's layout.
 */
export function Markdown({
  text,
  paragraphClass,
  listClass,
  inline = false,
}: {
  text: string;
  /** Class for each paragraph, e.g. "job-text". */
  paragraphClass?: string;
  /** Class for each bulleted list (nested lists get it too). */
  listClass?: string;
  /** One paragraph's words only, for text that sits inside its own element. */
  inline?: boolean;
}) {
  return (
    <ReactMarkdown
      allowedElements={['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'br']}
      unwrapDisallowed
      components={{
        p: ({ children }) =>
          inline ? <>{children}</> : <p className={paragraphClass}>{children}</p>,
        a: ({ href, children }) => <Link href={href ?? '#'}>{children as ReactNode}</Link>,
        ul: ({ children }) => <ul className={listClass}>{children}</ul>,
        ol: ({ children }) => <ol className={listClass}>{children}</ol>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
