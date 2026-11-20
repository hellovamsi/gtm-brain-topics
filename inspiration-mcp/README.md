# Audience inspiration map

[From-scratch guide for Codex chats](CODEX-HANDOFF.md)

1. Describe your target audience and enter your own LinkedIn profile.
2. Enter what you are building or doing.
3. Research posts by audience members. Open a topic on the map to inspect the dated posts, excerpts and audience-fit evidence behind it. The horizontal axis estimates topic novelty relative to your stated focus. The vertical axis estimates whether the featured excerpt offers a variation, a different lens or a fresh take. Author and post counts appear in the topic detail.
4. Pick the interests you want to explore.
5. Export the selected topics and their sources as Markdown.

## Run locally

Use Node.js 24 or newer. From this directory, install dependencies and start the development server.

```sh
npm ci
npm run dev
```

For a local preview, open the development server’s root URL in your browser and run `show-inspiration-map`.

Connect an MCP Apps-compatible local host to the server's HTTP endpoint at `/mcp`. Ask the host to open the audience inspiration map. For a production build, run `npm run build` followed by `npm start`.

With the server running, check the protocol in a second terminal. Substitute the endpoint printed by the server if the port differs.

```sh
node scripts/smoke.mjs http://localhost:3000/mcp
```

## Research inputs

Open `show-inspiration-map` with `{}`. The app uses `research-audience` to find interests in English posts by members of the audience. Enter your own LinkedIn profile. The app discovers audience authors automatically and excludes your posts. A matching project audience can use its research-candidate sample. Without matching project profiles, the app looks for direct evidence of membership in an author’s professional headline or self-description. The research can return an empty map with an explanation when audience membership or posts are missing.

To use zero credits, open **Existing evidence** and choose **Build map from evidence**. To add imported posts, paste a JSON object containing a `posts` array there before building the map. Each post needs a LinkedIn post permalink (`url`), its author's LinkedIn profile URL (`author`), an ISO timestamp (`postedAt`), the English post text (`text`) and `language: "en"`. An optional `headline` can help establish audience fit. The number of authors and posts records how widely a topic appears in the available evidence. A single post can support a useful idea.

Export the selected topic titles, summaries and dated source links as Markdown.

For spending limits, the native approval dialog and the zero-credit evidence path, see [live research](LIVE-RESEARCH.md).
