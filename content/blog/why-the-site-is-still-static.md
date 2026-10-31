---
title: Why the site is still static
date: 2026-10-12
tags: design, performance, studio
standfirst: A folder with an index file inside it is still the cheapest way to publish a page that lasts.
---

Every page on this site is a folder with an index file inside it, and every one of them was written by hand.
That is not nostalgia and it is not stubbornness, it is the cheapest way to publish a page that still works in ten years.

## What a static page actually costs

A static page costs one file on disk and one request over the wire.
It costs nothing to serve, nothing to keep alive, and nothing to patch.
The build that assembles it is a script anybody can read, so the site never depends on a service that can be switched off, priced up or bought out.

The cost sits in the writing instead.
A page has to exist before it can be linked, and a link to a page that does not exist yet is a broken promise.
We would rather keep that promise honest than ship a router that hides it.

## The folder is the address

An address that ends in a slash is a complete name.
There is nothing to negotiate with the server, and a link written by hand works exactly as written.
A flat file has two names, one with a slash and one without, and the server decides whether they are the same page, which is a small decision with a long tail.

Caches treat the two names differently, relative links break in one of them, and every copy of the site somewhere that forgot the slash produces a redirect that did not have to exist.

## What we give up

We give up the things that only a running program can do.
There is no per visitor content, no database behind the page, and no live count of anything.
The site does not need any of them, so the site does not pay for them.

The one place a program runs is the demo, and it runs in the browser, on the machine of the visitor, with the text they brought with them.
That is the whole point of the arrangement, and it is also why the studio privacy page can be short.
