AGRr! handover — Untitled page
==============================

Site name       : Untitled page
Public address  : (not set — the site has no public address yet)
Host folder     : (not set — the folder the provider requires is yours to say)

WHAT THE APPLICATION WROTE
------------------------

.htaccess — It routes a form's action to the site's handler, and it is what makes the site compress, cache and answer 404s the way its author expected.
  You can delete this file without breaking the site.

sitemap.xml — not written.
  The site has no public address, so no sitemap was written: a sitemap names the site's real address, and the application will not invent one. Set the public address in the export panel and export again.

robots.txt — It allows the public pages and keeps the search engines out of the files that answer the site's forms.
  You can delete this file without breaking the site.

404.html — It is the page a mistyped address lands on, built from the site's own tokens so it looks like the site rather than like the host.
  You can delete this file without breaking the site.

ag-theme.js — It applies the visitor's saved theme before the page first paints, so a themed site never flashes the wrong colours.
  You can delete this file without breaking the site.

README.txt — It names what the site is, where it lives, and what is still to do on the host.
  You can delete this file without breaking the site.

The placed records declare these files as well, and the export writes them beside the ones above:
menu-tree.json — It is a file a placed record declares, and the export writes it beside the site’s own files.

The site’s pages reference these project images, and the export writes them beside the site’s own files:
assets/images/web-words-dark.webp — It is a project image the site’s pages reference, and the export writes it beside the site’s own files.
assets/images/grrr.png — It is a project image the site’s pages reference, and the export writes it beside the site’s own files.
assets/images/editor.webp — It is a project image the site’s pages reference, and the export writes it beside the site’s own files.
assets/images/desktop-live.webp — It is a project image the site’s pages reference, and the export writes it beside the site’s own files.
assets/images/web-words-light.webp — It is a project image the site’s pages reference, and the export writes it beside the site’s own files.
assets/images/bg-light.webp — It is a project image the site’s pages reference, and the export writes it beside the site’s own files.
assets/images/bg-dark.webp — It is a project image the site’s pages reference, and the export writes it beside the site’s own files.

WHAT IS STILL TO DO ON THE HOST
-----------------------------
[ ] 1. Point the domain at the folder the site's files are in.
    A shared host binds a domain to a folder rather than to the hosting root, so the domain has to be pointed at the folder above. The application cannot check that it is: the binding is the provider's own setting, and nothing here can read it back.
[ ] 2. Upload the site's files to the host.
    The export writes the files into a folder on this machine; the deploy panel uploads them. Either way the files have to arrive in the folder the domain points at, or the domain has to point at the folder they are in.

This application does not control the deployment. It wrote the files and, when you deploy, it uploads them; what your hosting provider does with them — the PHP version, the domain, the database, the mail settings — is something you set on the host yourself, and nothing here can check it for you.
