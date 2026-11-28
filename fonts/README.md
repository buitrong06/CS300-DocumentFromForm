# Renderer fonts

Files placed here are mounted read-only into the `renderer` service of `docker-compose.yml`.
They are ignored by Git: do not commit licensed fonts.

Without Times New Roman the service substitutes Liberation Serif. It has matching character
widths, but it is not the typeface required by Decree 30/2020/ND-CP. Copy the Times New Roman
`.ttf` files (regular, bold, italic, bold italic) that your machine is licensed to use into this
folder, then restart the service:

```bash
docker compose up -d --force-recreate renderer
```

Check which fonts a rendered file embeds with `pdffonts output.pdf`. Use the same font files on
every machine that must produce the same layout.
