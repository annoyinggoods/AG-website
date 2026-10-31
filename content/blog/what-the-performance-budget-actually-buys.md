---
title: What the performance budget actually buys
date: 2026-10-05
tags: performance, testing, engineering
standfirst: A number on a budget line is a promise about a visitor, not a number about a file.
---

The home page carries a transfer budget of seven hundred and fifty kilobytes, and the number is written into the test suite.
It is not there to make the file smaller.
It is there to make the argument about what a visitor waits for into something a machine can settle.

## The budget is a promise

A budget says what the studio is willing to spend of a visitor's time.
When the budget is in the suite, the conversation stops being about taste and starts being about a limit that was agreed in advance.
Nobody has to win the argument about whether one more plate of hero art is worth two hundred kilobytes, because the suite already answered it.

## What is measured and how

The measurement uses the resource timing API rather than the content length header.
The local test server does not send that header, so a test that trusted it would have measured nothing at all and still passed.
The suite therefore sums the bytes the browser says it transferred and counts the requests it made.

## The heavy art waits

The spider plates are more than a megabyte of art and they are fetched when the weaving starts, not with the page.
The art of the other theme is fetched when the visitor touches the theme control, because most visitors never switch and the page was paying for both themes at once.

Nothing about that is clever.
It is a page that asks for what it needs and waits for the rest, and a budget that makes the asking stay honest.
