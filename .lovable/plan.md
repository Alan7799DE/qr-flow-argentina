

## Problema encontrado

El login con Google funciona correctamente a nivel de autenticación (los logs muestran status 200), pero hay un **bug de redirección** que impide que el usuario llegue al dashboard después de autenticarse.

### Causa raíz

En `AuthDialog.tsx` línea 103, el redirect path se guarda con `sessionStorage`:
```
sessionStorage.setItem("oauth_redirect", "/dashboard");
```

Pero en `App.tsx` línea 41, se lee desde `localStorage`:
```
const redirectPath = localStorage.getItem("oauth_redirect");
```

`sessionStorage` y `localStorage` son APIs distintas. El dato se escribe en una y se busca en otra, por lo tanto nunca se encuentra y el usuario queda atrapado en la landing page después del login con Google.

### Plan de corrección

1. **En `AuthDialog.tsx`**: Cambiar `sessionStorage.setItem` por `localStorage.setItem` en la función `handleGoogleSignIn` para que sea consistente con lo que lee `OAuthRedirectHandler` en `App.tsx`.

Esto es un cambio de una sola línea que resuelve el problema de redirección post-login con Google.

