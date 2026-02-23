import Link from "next/link";
import { getAllBlogPosts } from "@/lib/blogs";

export default function BlogListingPage() {
  const posts = getAllBlogPosts();

  return (
    <div className="p-4 md:p-8 pt-16" style={{ backgroundColor: "var(--color-background)" }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Zcash.me Blog</h1>
        <p className="mb-10" style={{ color: "var(--color-text-muted)" }}>
          Updates, guides, and news from the team.
        </p>

        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/${post.slug}`}>
              <article className="rounded-xl p-6 transition-colors" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border-light)" }}>
                <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>{post.title}</h2>
                <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
                  {post.date} &middot; {post.author}
                </p>
                <p style={{ color: "var(--color-text-secondary)" }}>{post.description}</p>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
