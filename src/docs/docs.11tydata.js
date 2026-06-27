// Directory data for every Markdown file under src/docs/.
//
// Source path drives the public URL so the docs sit *under* each tool:
//   src/docs/stng/getting-started.md  ->  /stng/getting-started/
//   src/docs/filefacts/index.md       ->  /filefacts/   (a tool's overview)
//
// The existing /stng/, /cleave/, /scan/ overview pages are hand-built .njk and
// keep their own URLs; only filefacts ships its overview as Markdown here.
module.exports = {
  layout: "docs.njk",
  tags: ["docs"],
  eleventyComputed: {
    // Tool name = the folder under src/docs/ (parts: ["", "docs", <tool>, <slug>]).
    tool: (data) => data.page.filePathStem.split("/")[2],
    permalink: (data) => {
      const [, , tool, slug] = data.page.filePathStem.split("/");
      return slug === "index" ? `/${tool}/` : `/${tool}/${slug}/`;
    },
  },
};
