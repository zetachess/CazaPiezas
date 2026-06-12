# GOBLINAJEDREZ CazaPiezas

Juego estático listo para publicar en GitHub Pages y embeber en cualquier web con iframe.

Las piezas SVG incluidas vienen de `lichess-org/lila/public/piece/cburnett`.

## Publicar

Sube esta carpeta completa (`index.html`, `styles.css`, `game.js` y `assets/`) a tu repo de GitHub Pages.

## Iframe

Iframe recomendado:

```html
<iframe
  style="max-width:100%;width:100%;height:min(520px,90vh)"
  src="https://TU_USUARIO.github.io/TU_REPO/goblinsnake/"
  title="GOBLINAJEDREZ CazaPiezas"
  width="500"
  height="520"
  frameborder="0"
  allow="autoplay; gamepad"
  allowfullscreen>
</iframe>
```

Iframe compacto tipo Wordwall:

```html
<iframe style="max-width:100%" src="https://TU_USUARIO.github.io/TU_REPO/goblinsnake/" width="500" height="380" frameborder="0" allow="autoplay; gamepad" allowfullscreen></iframe>
```

Si lo publicas en la raiz del repo, cambia el `src` a:

```html
https://TU_USUARIO.github.io/TU_REPO/
```
