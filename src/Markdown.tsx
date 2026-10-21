import { Link } from '@nycopportunity/react';
import { Fragment, type ReactNode } from 'react';
import type { RichNode, RichText } from './types.ts';

/**
 * Text written in the CMS: paragraphs, **bold**, *italics*, links and lists,
 * drawn with the site's own styles. The build has already turned the
 * Markdown into a small tree (scripts/rich-text.ts), so this only draws it.
 */
export function Markdown({
  text,
  paragraphClass,
  listClass,
  inline = false,
}: {
  text: RichText;
  /** Class for each paragraph, e.g. "job-text". */
  paragraphClass?: string;
  /** Class for each list (nested lists get it too). */
  listClass?: string;
  /** One paragraph's words only, for text that sits inside its own element. */
  inline?: boolean;
}) {
  const draw = (nodes: RichNode[]): ReactNode =>
    nodes.map((node, i) => {
      if (typeof node === 'string') return <Fragment key={i}>{node}</Fragment>;
      const children = draw(node.c);
      switch (node.t) {
        case 'p':
          return inline ? (
            <Fragment key={i}>{children}</Fragment>
          ) : (
            <p key={i} className={paragraphClass}>
              {children}
            </p>
          );
        case 'strong':
          return <strong key={i}>{children}</strong>;
        case 'em':
          return <em key={i}>{children}</em>;
        case 'a':
          return (
            <Link key={i} href={node.href ?? '#'}>
              {children}
            </Link>
          );
        case 'br':
          return <br key={i} />;
        case 'ul':
          return (
            <ul key={i} className={listClass}>
              {children}
            </ul>
          );
        case 'ol':
          return (
            <ol key={i} className={listClass}>
              {children}
            </ol>
          );
        case 'li':
          return <li key={i}>{children}</li>;
        default:
          return null;
      }
    });
  return <>{draw(text)}</>;
}
