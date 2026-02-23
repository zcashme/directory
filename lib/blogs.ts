import matter from "gray-matter";

/** Strip inline HTML tags that break MDX (e.g. <img style="...">) */
function stripHtml(md: string): string {
  return md.replace(/<[^>]+>/g, "");
}

const REPO = "zcashme/blog";
const BRANCH = "main";
const CONTENT_PATH = ""; // md files at repo root; change if nested e.g. "posts"

const BASE_RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  author: string;
  description: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

async function fetchFileList(): Promise<string[]> {
  const url = CONTENT_PATH
    ? `${API_BASE}/${CONTENT_PATH}?ref=${BRANCH}`
    : `${API_BASE}?ref=${BRANCH}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];

  const items: { name: string }[] = await res.json();
  return items
    .filter((f) => f.name.endsWith(".md") && f.name !== "README.md")
    .map((f) => f.name);
}

async function fetchMarkdown(filename: string): Promise<string | null> {
  const filePath = CONTENT_PATH ? `${CONTENT_PATH}/${filename}` : filename;
  const res = await fetch(`${BASE_RAW}/${filePath}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.text();
}

export async function getAllBlogPosts(): Promise<BlogPostMeta[]> {
  const files = await fetchFileList();

  const posts = await Promise.all(
    files.map(async (filename) => {
      const slug = filename.replace(/\.md$/, "");
      const raw = await fetchMarkdown(filename);
      if (!raw) return null;

      const { data } = matter(raw);
      return {
        slug,
        title: data.title ?? slug.replace(/-/g, " "),
        date: data.date ?? "",
        author: data.author ?? "",
        description: data.description ?? "",
      };
    })
  );

  return posts
    .filter((p): p is BlogPostMeta => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getBlogPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  const raw = await fetchMarkdown(`${slug}.md`);
  if (!raw) return null;

  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? "",
    author: data.author ?? "",
    description: data.description ?? "",
    content: stripHtml(content),
  };
}

export async function getAllBlogSlugs(): Promise<string[]> {
  const files = await fetchFileList();
  return files.map((f) => f.replace(/\.md$/, ""));
}
