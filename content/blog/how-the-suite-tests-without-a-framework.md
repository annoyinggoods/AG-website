---
title: How the suite tests without a framework
date: 2026-09-28
tags: testing, engineering, studio
standfirst: The tests read the same DOM the modules write, and they fail on the words the modules use.
---

The test suite is a folder of spec files that open a real browser and drive the real page.
There is no test framework, no mock library, and no virtual DOM, and the reason is the same reason the site has no framework at all.

## The tests read the page

Every assertion is about something a visitor could notice.
A class name that appears on a box, an attribute that appears on the root element, a status message that a screen reader would read.
That means the suite fails when the site breaks and stays quiet when the internals move around, which is the only kind of failure worth having.

## The contract is the data attribute

The modules talk to the markup through data attributes, so the tests can talk to the modules the same way.
Nothing in the suite reaches into a private function, and nothing in the site exposes a hook purely so a test can call it.

## What the suite refuses

The suite refuses a broken stylesheet, a page with two headings of the first level, a form that posts nowhere, and a bundle that grew without anybody deciding that it should.
A test that cannot fail is a comment, and a comment is not a test.
