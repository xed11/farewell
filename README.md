# Farewell for Jessica

Mobile-first digital farewell card.

## Where to put your files

| File | Path |
|------|------|
| Jessica’s photo | `images/jessica.jpg` |
| Group photos | `images/group-1.jpg`, `group-2.jpg`, `group-3.jpg`, … *(no limit)* |
| Music (mp3) | `audio/jessica.mp3` |

### Group photos — add anytime
Name them in order:

- `group-1.jpg`
- `group-2.jpg`
- `group-3.jpg`
- `group-4.jpg`
- …and so on

Refresh the page — new photos appear automatically.  
Also works with `.jpeg`, `.png`, or `.webp`.

Optional captions go in `messages.js` → `FAREWELL_PHOTO_CAPTIONS`.

### Messages (swipe deck)
Edit `messages.js` — add objects to `FAREWELL_MESSAGES`:

```js
{ name: "Ana", lang: "pt", text: "Sua mensagem aqui..." }
```

## Preview locally

```bash
cd ~/Documents/Codex/farewell
python3 -m http.server 5173
```

Then open on your phone (same Wi‑Fi): `http://YOUR-MAC-IP:5173`  
Or on this Mac: http://localhost:5173
