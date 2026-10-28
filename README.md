# Codex Portfolio

Shimizu Kaito portfolio site.

## Local update form

Run this command to open the local WORKS update form:

```bash
node scripts/work-form-server.mjs
```

Then open:

```text
http://127.0.0.1:4180/
```

GitHub Pages serves the static files only. The local form is for generating and updating files before committing.

## Homepage styles

The Japanese and English homepages inline only their required CSS to avoid a
render-blocking stylesheet request. `styles.css` remains the source of truth
and is used directly by the other pages. After editing shared styles or homepage
markup, regenerate both inline blocks:

```bash
python3 scripts/build-home-styles.py
```

The generator retains responsive rules and dynamic `dark` / `sketch-frame`
classes. Add any new dynamically created homepage classes to its retained set.
