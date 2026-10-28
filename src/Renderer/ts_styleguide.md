## Coding Style Guide for Typescript

This is the style guide for typescript code in the Renderer code base. In
general, we follow the same style guide as web-client project, which is itself
based on the
[airbnb style guide](https://github.com/iamturns/eslint-config-airbnb-typescript).

However, we do have a few differences, notably:

### Line length

The line-length is strictly limited to **120** characters.

### Indentation

We support 2-spaces for indentation (not enforced).

### Parameter re-assigment

Parameter re-assignment is allowed. (We use that extensively with three.js).
However, avoid side-effects (see Finally below).

### Enums

It's ok to use enums in typescript. However, be aware that they are not all they're supoosed
to be; typescript enums have limitations and are not strongly typed. For the
curious minds, see this
[blog post](https://dev.to/dvddpl/whats-the-problem-with-typescript-enums-2okj).

If you decide to use enums as a type in a public API, make sure that the API implementation
verifies the value of the enum parameters, since the type alone offers no such guarantee.

## Google Style Guide

Where neither airbnb nor our exceptions specify a style, we apply the
[Google Typescript Style Guide](https://google.github.io/styleguide/jsguide.html).
(This will be enforced through code reviews only, for now.)

Notably:

1. [**Classes**](https://google.github.io/styleguide/jsguide.html#jsdoc-class-comments):
   Classes, interfaces and records must be documented with a description
   and any template parameters, implemented interfaces, visibility, or other appropriate
   tags. The class description should provide the reader with enough information to know
   how and when to use the class, as well as any additional considerations necessary
   to correctly use the class.
1. [**Methods**](https://google.github.io/styleguide/jsguide.html#jsdoc-method-and-function-comments):
   All public functions/methods must be documented. Method descriptions
   begin with a verb phrase that describes what the method does. This phrase is not an
   imperative sentence, but instead is written in the third person, as if there is an implied
   This method ... before it. (It is not necessary to use jsdoc comment. Just regular comments
   will do.)
1. [**Braces**](https://google.github.io/styleguide/jsguide.html#formatting-braces):
   Use braces for all control structures. The only exception is for an if-statement with no else
   that fits on a single line.
1. [**For loops**](https://google.github.io/styleguide/jsguide.html#features-for-loops):
   The for-in control structure is flagged as an error. It is prone to errors if not used
   correctly. Prefer for-of when possible. You may override eslint and use for-in on dict-style
   objects.

## Finally

In addition, strongly consider these recommendations:

1. **No side effects**: If a function or method returns something, it must not modify
   the input parameter(s) in any way. That is because such side effects make the code
   tricky to read and understand.
