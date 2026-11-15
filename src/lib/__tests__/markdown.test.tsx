import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/Markdown";
import { parseMarkdown, stripHtml } from "@/lib/markdown";

const render = (source: string) => renderToStaticMarkup(<Markdown source={source} />);

describe("Markdown sanitising", () => {
  it("strips script tags together with their contents", () => {
    const html = render("Hello <script>alert('xss')</script> world");
    expect(html).not.toContain("script");
    expect(html).not.toContain("alert");
    expect(html).toContain("Hello");
    expect(html).toContain("world");
  });

  it("strips raw HTML tags and event handlers", () => {
    const html = render('<img src=x onerror="alert(1)"> <b>bold</b> <iframe src="https://evil.example"></iframe> <a href="javascript:alert(1)">x</a>');
    expect(html).not.toMatch(/<img|<b>|<iframe|onerror|javascript:/i);
    expect(html).toContain("bold");
  });

  it("handles nested and unclosed tags", () => {
    expect(stripHtml("<scr<script>ipt>alert(1)</scr</script>ipt>")).not.toMatch(/<\/?script/i);
    expect(render("text <script src=https://evil.example/x.js")).not.toContain("<script");
    expect(render("<!-- hidden --><style>body{display:none}</style>shown")).toBe(
      '<div class="prose-liftoff "><p>shown</p></div>',
    );
  });

  it("never turns non-https links into links", () => {
    const html = render("[click](javascript:alert(1)) [http](http://example.com) [ok](https://example.com)");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain('href="http://');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it("escapes angle brackets that survive as text", () => {
    const html = render("1 < 2 and 3 > 2");
    expect(html).toContain("1 &lt; 2 and 3 &gt; 2");
  });

  it("renders the supported formatting", () => {
    const html = render("# Title\n\nSome **bold** and *italic* and `code`.\n\n- one\n- two\n\n1. first\n2. second\n\n> quoted");
    expect(html).toContain("<h3>Title</h3>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<ol><li>first</li><li>second</li></ol>");
    expect(html).toContain("<blockquote>quoted</blockquote>");
  });

  it("produces a plain data tree", () => {
    expect(parseMarkdown("hello")).toEqual([{ type: "paragraph", children: [{ type: "text", value: "hello" }] }]);
  });
});
