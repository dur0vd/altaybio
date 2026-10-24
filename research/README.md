# Source snapshot

Source: http://altaybio.ru — HTTP used because the HTTPS endpoint returned an upstream error during migration.

Snapshot taken 24 October 2026. The crawl follows all informational links and pagination reachable from the root homepage and five primary sections: about, members, actions (news), anonce (announcements), and contacts. Administrator, authentication, search, print, feed, and edit routes are excluded. This is a complete snapshot of that publicly linked content, not an export of the source database or unlinked/private records.

Results: 157 successful HTML pages; 139 articles (29 member profiles, 96 news articles, 10 announcements, 3 main informational pages, and the distinct root homepage); 18 listing/pagination pages; 421 original images and linked files downloaded. No HTTP or asset errors; no unvisited URLs remain in the crawl queue. The root homepage and its lead image were added with targeted requests after the initial crawl without repeating the complete crawl. Its historic statement about 36 organizations is preserved verbatim as source content; 29 organizations have profiles in the source directory.

`dist/data/source.json` preserves article HTML, plain text, source URL, title, category, image originals and local paths, and links. Article HTML is sanitized by removing scripts, event attributes, inline styling, embedded forms, and iframes. Joomla email cloaking is decoded from string literals without executing remote JavaScript. Internal article URLs remain absolute for application routing. Images and linked source files are stored locally under `dist/assets/source`.

Original HTML responses are in `research/raw`. `research/crawl-report.json` records coverage and failures. `research/asset-manifest.json` maps original assets to local files. Raw pages may contain the original site's tracking scripts; these are archival only and are never included as executable site pages.

The source does not expose machine-readable publication dates, so `date` is null. Joomla numeric article IDs are preserved as `source_id`, allowing descending source order without invented publication dates. Historic statements and entity names in preserved articles reflect the source and have not been independently refreshed.

To reproduce, install `scripts/requirements.txt` and run `python scripts/crawl_source.py`. The crawler uses four concurrent requests, bounded retries, and a 5000-page ceiling. Running again replaces the JSON snapshot and reuses already downloaded local assets.
