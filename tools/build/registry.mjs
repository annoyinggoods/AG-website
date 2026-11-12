// The product registry: the products index is generated from this list, so the
// listing on the page can never drift away from the products that exist.
// A product is added by writing its page and adding one entry to the registry.

import fs from "node:fs";
import path from "node:path";

function fail(message) {
  console.error("REGISTRY BUILD ERROR: " + message);
  process.exit(1);
}

function readFile(target) {
  try {
    return fs.readFileSync(target, "utf8");
  } catch (err) {
    void err;
    return "";
  }
}

export function readProducts(root, tree, nodeByPath, contentDir, slugFor) {
  const raw = Array.isArray(tree.products) ? tree.products : [];
  const products = [];
  const seen = new Map();
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== "object") {
      fail("The product registry holds an entry that is not an object.");
    }
    const slug = String(item.slug || "");
    const title = String(item.title || "");
    const productPath = String(item.path || "");
    const tagline = String(item.tagline || "");
    const summary = String(item.summary || "");
    if (!slug || !title || !productPath) {
      fail("A product registry entry needs a slug, a title and a path.");
    }
    const owner = seen.get(productPath);
    if (owner) {
      fail("The products " + owner + " and " + slug + " would share the address " + productPath + ".");
    }
    seen.set(productPath, slug);
    const node = nodeByPath[productPath];
    if (!node) {
      fail("The product " + slug + " has no page at " + productPath + ". Add the page to the tree or remove the registry entry.");
    }
    const fragment = path.join(contentDir, slugFor(node) + ".html");
    if (!readFile(fragment).trim()) {
      fail("The product " + slug + " has no content fragment at " + path.relative(root, fragment) + ".");
    }
    const icon = String(item.icon || "");
    const iconWidth = Number(item.iconWidth || 0);
    const iconHeight = Number(item.iconHeight || 0);
    if (icon && (!iconWidth || !iconHeight)) {
      fail("The product " + slug + " declares an icon without its width and height.");
    }
    products.push({
      slug: slug,
      title: title,
      path: productPath,
      icon: icon,
      iconWidth: iconWidth,
      iconHeight: iconHeight,
      tagline: tagline,
      summary: summary,
      keywords: Array.isArray(item.keywords) ? item.keywords.map(String) : []
    });
  }
  return products;
}

// The generated listing on the products index page.
export function productsSectionHtml(products) {
  if (products.length === 0) {
    return "";
  }
  const parts = [
    '<section class="content-section" data-admin="content:content.css" id="product-list" aria-labelledby="product-list-heading">',
    '<h2 class="section-heading" id="product-list-heading">The products</h2>'
  ];
  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    parts.push('<article class="content-article entry-card product-card" data-admin="content:content.css" id="' + product.slug + '">');
    parts.push('<div class="product-card-body">');
    parts.push('<h3 class="article-heading"><a href="' + product.path + '">' + product.title + "</a></h3>");
    if (product.tagline) {
      parts.push('<p class="entry-standfirst">' + product.tagline + "</p>");
    }
    if (product.summary) {
      parts.push("<p>" + product.summary + "</p>");
    }
    parts.push('<p><a href="' + product.path + '">Open the ' + product.title + " page</a></p>");
    parts.push("</div>");
    if (product.icon) {
      parts.push('<img class="product-card-icon" src="' + product.icon + '" alt="" width="' + product.iconWidth + '" height="' + product.iconHeight + '" loading="lazy" decoding="async">');
    }
    parts.push("</article>");
  }
  parts.push("</section>");
  return parts.join("\n");
}
