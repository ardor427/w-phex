# W-PHEX

API 662 / 667 / 810을 welded plate heat exchanger 기준으로 읽고 정리한 정적 노트입니다. 원문 검색, 챗봇, API 키는 사용하지 않습니다.

## Local

Open `docs/index.html` in a browser, or:

```bash
python3 -m http.server 8000 --directory docs
```

## Render

Dashboard settings that match this repo:

- **Build Command:** `mkdir -p build && cp -R docs/. build/`
- **Publish Directory:** `build`

The first deploy failed because the dashboard had an empty build command and looked for `build/`, which did not exist yet. `build/` is now in git as a copy of `docs/`, so an empty build command still works. If you change `docs/`, either run the copy command or keep the Build Command above so Render recreates `build/`.

GitHub Pages serves `docs/` from `main`: https://ardor427.github.io/w-phex/
