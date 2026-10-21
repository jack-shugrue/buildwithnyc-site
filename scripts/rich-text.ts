/*
 * Turns Markdown from the CMS (paragraphs, **bold**, *italics*, links,
 * bulleted and numbered lists, line breaks) into a small tree the site
 * draws directly, at build time, so visitors don't download a Markdown
 * parser. Anything else (headings, images, raw HTML, code) keeps its words
 * as plain text, so a post can't break the page's layout.
 */
import { fromMarkdown } from 'mdast-util-from-markdown';
import type { RichNode, RichText } from '../src/types.ts';

type Md = { type: string; value?: string; url?: string; ordered?: boolean; spread?: boolean; children?: Md[] };

export function toRichText(markdown: string): RichText {
  return blocks((fromMarkdown(markdown) as Md).children ?? [], true);
}

/** Block-level nodes. In a tight list, a list item's paragraphs are unwrapped. */
function blocks(nodes: Md[], wrapParagraphs: boolean): RichNode[] {
  const out: RichNode[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case 'paragraph':
      case 'heading':
      case 'blockquote':
        if (node.type === 'blockquote') out.push(...blocks(node.children ?? [], wrapParagraphs));
        else if (wrapParagraphs) out.push({ t: 'p', c: inline(node.children ?? []) });
        else out.push(...inline(node.children ?? []));
        break;
      case 'list': {
        const loose =
          Boolean(node.spread) || (node.children ?? []).some((item) => Boolean(item.spread));
        out.push({
          t: node.ordered ? 'ol' : 'ul',
          c: (node.children ?? []).map((item) => ({ t: 'li', c: blocks(item.children ?? [], loose) })),
        });
        break;
      }
      case 'code':
        if (node.value) out.push(wrapParagraphs ? { t: 'p', c: [node.value] } : node.value);
        break;
      default:
        // Thematic breaks, raw HTML, images on their own: nothing to show.
        break;
    }
  }
  return out;
}

function inline(nodes: Md[]): RichNode[] {
  const out: RichNode[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
      case 'inlineCode':
        if (node.value) out.push(node.value);
        break;
      case 'strong':
        out.push({ t: 'strong', c: inline(node.children ?? []) });
        break;
      case 'emphasis':
        out.push({ t: 'em', c: inline(node.children ?? []) });
        break;
      case 'link':
        out.push({ t: 'a', href: node.url ?? '#', c: inline(node.children ?? []) });
        break;
      case 'break':
        out.push({ t: 'br', c: [] });
        break;
      default:
        // Images, raw HTML, strikethrough: keep any words, drop the rest.
        if (node.children) out.push(...inline(node.children));
        break;
    }
  }
  return out;
}
