# NSDG website

Website of the Nanoelectronics and Semiconductor Devices Group (NSDG), IIT Guwahati.
Live at **https://nsdg-iitg.github.io**.

The site is built by GitHub Pages with Jekyll. There is no build step to run: edit a file on GitHub, commit, and the site updates in a minute or two.

## Where things live

| To change | Edit |
|---|---|
| A member's page (bio, highlights, links, photo) | `_people/<name>.md` |
| A research area page | `_research/<area>.md` |
| Publications | `_data/publications.yml` |
| News | `_data/news.yml` |
| Funded projects | `_data/projects.yml` |
| M.Tech / B.Tech alumni and interns | `_data/alumni.yml` |
| Courses | `_data/teaching.yml` |
| Facilities, contact | `facilities.md`, `contact.html` |
| Colours and layout | `assets/css/style.css` |

## Common tasks

**Add a paper.** Add an entry at the top of the right section in `_data/publications.yml`. Put the member page names in `people:` and the research area names in `areas:`. The paper then appears on the Publications page, on each member's page and on the area page automatically.

**Add a photo.** Put a square photo (about 400×400 px, JPG) in `assets/img/people/`, then add `photo: /assets/img/people/<file>.jpg` to the member's file.

**Add a new member.** Copy an existing file in `_people/`, rename it (lowercase, hyphens, e.g. `firstname-lastname.md`) and edit the top section. Use `category: current` for current members and `category: alumni` for alumni.

**Add links.** In a member's file add, for example:

```yaml
links:
  scholar: "https://scholar.google.com/citations?user=..."
  orcid: "https://orcid.org/0000-0000-0000-0000"
  linkedin: "https://www.linkedin.com/in/..."
  github: "https://github.com/..."
```

**Figures.** Use your own figures (original plots or schematics). Figures copied from published papers are usually the publisher's copyright.

**Gallery photos.** Put the photo in `assets/img/gallery/` and a small copy with the same file name (about 720 px on the long side) in `assets/img/gallery/thumbs/`, then add it to `_data/gallery.yml`. The page shows the small copy and the viewer opens the full photo.

**Chemical formulas.** Type them plainly, for example `MAPbI3`. The site shows them with subscripts. To add a new formula, add it to the list in `_layouts/default.html`.

## Preview locally (optional)

```bash
gem install jekyll jekyll-seo-tag jekyll-sitemap kramdown-parser-gfm
jekyll serve
```

Then open http://localhost:4000.

## Papers from outside the group

Papers a member wrote before joining, or outside the group, go in that member's own file in
`_people/` under `other_publications:` (fields: `title`, `authors`, `venue`, `year`, and optional
`details` and `doi`). They are shown on the member's page under "Other publications" and are
not counted on the Publications page. Papers with the group stay in `_data/publications.yml`.

## Tools menu

The "Tools" menu in the header is built from `_data/tools.yml`. To add a tool, add an entry with
`name`, `url` and an optional `note`.

## Version 2 (this branch)

This branch holds a redesign made with the free Scrollcraft skill by Nate Herk
(https://github.com/nateherkai/scroll-craft, MIT licence). Content and data files are unchanged.

- `assets/scrollcraft/` is the skill's scroll engine, copied as it is. Do not edit it.
- `assets/css/v2.css` holds the new colours, typefaces and layout. It is loaded after `style.css`.
- `assets/js/device.js` draws the band diagram on the home page. `assets/js/home.js` starts the engine.
- `index.html` is the new home page.

The live site is built from `main`. Nothing here is published until this branch is merged.
