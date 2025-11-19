## Conventional Commits Guide for Humans & LLMs

This guide outlines the rules for writing commit messages that conform to the Conventional Commits specification.

### 1\. Structure

A commit message **MUST** be structured with a header, followed by an optional body and one or more optional footers.

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 2\. Header (Required)

The header is a single line and **MUST** contain three parts:

#### A. Type (Required)

  * **MUST** be a noun (e.g., `feat`, `fix`, `docs`).
  * Use **`feat`** for new features.
  * Use **`fix`** for bug fixes.
  * (Optional) Use other types like `docs`, `style`, `refactor`, etc.

#### B. Scope (Optional)

  * **MAY** be provided to add contextual information.
  * **MUST** be a noun enclosed in parentheses immediately following the type (e.g., `(api)`, `(parser)`).

#### C. Description (Required)

  * **MUST** immediately follow the required colon and space (` :  `).
  * **MUST** be a short, imperative summary of the code change.

**Examples of Valid Headers:**

```
fix: prevent race condition in parser
feat(auth): add multi-factor authentication support
docs: update README with installation instructions
```

### 3\. Body (Optional)

  * **MAY** be provided to add contextual information about the change.
  * **MUST** begin one blank line after the description.
  * **SHOULD** use the imperative, present tense ("change" not "changed" or "changes").

### 4\. Footers (Optional)

  * **MAY** be provided one blank line after the body (or one blank line after the description if no body is present).
  * **MUST** consist of a token followed by a separator (` :  ` or `  # `), followed by a value.
  * Common tokens include `Refs`, `Closes`, `Reviewed-by`.
  * **MUST** use `BREAKING CHANGE:` as a token for signaling breaking changes in the footer.

**Example Footer:**

```
Refs: #123
Reviewed-by: J. Smith
```

### 5\. Breaking Changes (Required Signaling)

Breaking changes **MUST** be signaled using **one of two** ways:

#### A. The Exclamation Mark (`!`) in the Header

  * Append a **`!`** immediately before the colon (`:`) in the header.
  * This signifies a major, breaking change.
  * **Example:** `feat(api)!: remove deprecated v1 endpoint`

#### B. The `BREAKING CHANGE` Footer

  * Include a `BREAKING CHANGE:` footer with a description of the change.
  * **Example Footer:** `BREAKING CHANGE: All configuration files must now be explicitly imported.`

**Full Commit Examples:**

**1. Simple Bug Fix (PATCH release):**

```
fix(parser): correct array parsing issue

The parser was failing when multiple spaces were contained within a string. This commit updates the regex to correctly handle repeated whitespace.
```

**2. New Feature with Scope (MINOR release):**

```
feat(lang): add Polish language option
```

**3. Breaking Change using Exclamation Mark (MAJOR release):**

```
feat!: restructure theme object
BREAKING CHANGE: The `color` property has been renamed to `themeColor` and must be updated in all dependent components.
```

**4. Commit with Body and Footers:**

```
refactor: simplify request handling logic

Introduce a request id and a reference to the latest request.
Dismiss incoming responses other than from the latest request to prevent racing.

Refs: #456
Reviewed-by: team-lead
```