# W-PHEX

API 662 / 667 / 810을 welded plate heat exchanger 기준으로 읽고 정리한 정적 노트입니다. 원문 검색, 챗봇, API 키는 사용하지 않습니다.

## Local

Open `docs/index.html` in a browser, or:

```bash
python3 -m http.server 8000 --directory docs
```

## Render

Do **not** copy `docs/` into `build/`. Render often runs the build from a subdirectory, so that command fails with `cannot stat 'docs/.'`.

Set these three fields and save:

- **Root Directory:** empty (clear it if it is `docs` or `build`)
- **Build Command:** `true`
- **Publish Directory:** `docs`

If Root Directory is already `docs` and you want to leave it: Build Command `true`, Publish Directory `.`

Live: https://w-phex.onrender.com  
GitHub Pages: https://ardor427.github.io/w-phex/
