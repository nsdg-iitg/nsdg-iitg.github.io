# Website chat assistant

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
