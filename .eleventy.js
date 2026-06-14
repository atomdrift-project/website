module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/.well-known");
  eleventyConfig.addPassthroughCopy("src/_redirects");

  eleventyConfig.addFilter("dateDisplay", function(date) {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  eleventyConfig.addFilter("dateYM", function(date) {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${year}/${month}`;
  });

  eleventyConfig.addFilter("slugStripDate", function(slug) {
    if (!slug) return "";
    return slug.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  });

  // Pull the first <img> src out of rendered post content, for listing thumbnails.
  eleventyConfig.addFilter("firstImage", function(content) {
    if (!content) return "";
    const m = content.match(/<img\b[^>]*\bsrc="([^"]+)"/i);
    return m ? m[1] : "";
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts"
    }
  };
};
