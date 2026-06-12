# GOBLINAJEDREZ CazaPiezas

Juego estático listo para publicar en GitHub Pages y embeber en cualquier web con iframe.

Las piezas SVG incluidas vienen de `lichess-org/lila/public/piece/cburnett`.

## Publicar

Sube esta carpeta completa (`index.html`, `styles.css`, `game.js` y `assets/`) a tu repo de GitHub Pages.

## Iframe

```html
<iframe
  src="https://TU_USUARIO.github.io/TU_REPO/goblinsnake/"
  title="GOBLINAJEDREZ CazaPiezas"
  width="100%"
  height="820"
  loading="lazy"
  style="border:0;max-width:860px;aspect-ratio:1/1.16;"
  allow="gamepad">
</iframe>
```

Si lo publicas en la raiz del repo, cambia el `src` a:

```html
https://TU_USUARIO.github.io/TU_REPO/
```
