import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface MarkdownTextProps {
  text: string;
}

// Renders the constrained Markdown subset stored in Stop.description /
// Place.note (ROADMAP.md Milestone O). react-markdown never renders raw
// HTML by construction (no rehype-raw plugin here) — there is no
// sanitization step to get right or skip. remark-breaks makes a single
// Enter a real line break rather than requiring a blank line between
// paragraphs, matching what typing Enter in the editor actually looks like.
export function MarkdownText({ text }: MarkdownTextProps) {
  return (
    <div className="markdown-text">
      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{text}</ReactMarkdown>
    </div>
  );
}
