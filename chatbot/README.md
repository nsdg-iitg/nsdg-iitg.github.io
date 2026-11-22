# Website worker: chat assistant and private edit links

`worker.js` is a small relay that runs on Cloudflare Workers (free plan). It keeps the
Gemini API key out of the public website. For each question it reads the website text
from `search.json` and asks Gemini to answer from that text only.

## Setup
1. Get a Gemini API key at https://aistudio.google.com/apikey.
2. In the Cloudflare dashboard, create a Worker (Start with Hello World), open **Edit code**,
   replace everything with the contents of `worker.js`, and press **Deploy**.
3. In the Worker's **Settings > Variables and Secrets**, add a **Secret** named
   `GEMINI_API_KEY` with the key as its value.
4. Copy the Worker address (it ends in `.workers.dev`) into `chat_endpoint:` in `_config.yml`.

The chat button appears on the site only when `chat_endpoint` is set. The Worker only
answers requests that come from the website address (`SITE_URL`, default
https://nsdg-iitg.github.io). Limits per visitor and per day are at the top of `worker.js`.

## Fermi device assistant

The Fermi tool has a **Describe device** button. The visitor writes a device in plain
words, and the Worker asks Gemini to turn it into a list of layers. Gemini may only pick
materials from the list that Fermi sends, and it never supplies material parameters. Fermi
checks every layer again before loading it. It uses the same `GEMINI_API_KEY` and the same
limits per visitor and per day as the chat. No extra setting is needed, but the Worker
code must be updated: open **Edit code**, replace everything with the current `worker.js`,
and press **Deploy**.

## Private edit links

The same Worker lets members propose changes to their own page from a private link, with
no GitHub account. Each change is filed as a pull request and goes live only when the
administrator merges it.

Extra setup:
1. While signed in to GitHub as the owner of this repository, create a fine-grained token
   at https://github.com/settings/personal-access-tokens/new. Give it access to this
   repository only, with **Contents** and **Pull requests** set to "Read and write".
2. In the Worker's **Settings > Variables and Secrets**, add:
   - Secret `GITHUB_TOKEN`: the token from step 1
   - Secret `EDIT_SECRET`: a long password of your choice (letters and digits only). It is the administrator key.
   - Text `APPROVER` (optional): the GitHub user name that should be asked to review each change
3. Open `https://nsdg-iitg.github.io/edit/?who=admin&key=<EDIT_SECRET>`. This page lists a
   private link for every member, and has forms to add a news item or a publication.

The same admin page also lists a private link for each research page
(`/edit/?area=<page>&key=...`). Such a link can change the title, summary, home page card
text, methods, page text and the people listed on that page, edit or remove figure captions,
and add a new figure (saved in `assets/img/figures/`). It cannot change any other file.

A member link can change only that member's file in `_people/` and their photo. Changing
`EDIT_SECRET` cancels all links at once. To cancel the links without a new password, delete
the `EDIT_SECRET` secret.
