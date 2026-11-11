# Security policy

## What this repository is

A static site (`site/`) and a demo panel (`site/demo/`) that runs on fictional data inside the page. There is no server,
no account, no form and no user data. The code that handles real data is a different repository,
[jobbot](https://github.com/gonzalo-rosas-rojas/jobbot).

## Reporting a problem

Use the **Security** tab of this repository, then **Report a vulnerability**. If that option is not available, open an
issue that says you have a security report and asks for a private channel, and leave the details out of it.

## Limits worth knowing

- The Content-Security-Policy is delivered in a `<meta>` tag in `site/index.html`, because GitHub Pages does not let a
  repository set response headers. A `<meta>` policy cannot declare `frame-ancestors`, so this site cannot forbid other
  pages from framing it, and it cannot set headers such as `X-Content-Type-Options` or `Referrer-Policy` either.
- `site/demo/index.html` is a generated build of the panel, copied in as it is (`scripts/build-demo.py`); its inline
  scripts are pinned by hash in its own policy.
- The GitHub Actions the workflows use are pinned to commit SHAs, and Dependabot proposes updates to them weekly.
