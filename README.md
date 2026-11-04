# 🎂 BakeMe Pastelería — Sitio web

Página web de **BakeMe**, una pastelería de pasteles personalizados. Es la cara pública del proyecto BakeMe (app de pedidos en Python/Tkinter + MySQL) que desarrollé en el Bachillerato en Desarrollo de Software del INFRAMEN.

## ✨ Qué incluye
- Portada con escena animada 3D (`escena.js`, Three.js)
- Catálogo de pasteles por ocasión (quinceaños, bodas, bautizos, infantiles…)
- Sección "Tú decides cada detalle" para pasteles a la medida
- Proceso de pedido en 4 pasos y seguimiento del pedido
- Diseño responsive, optimizado para celular

## ⚡ Rendimiento
- Imágenes en **WebP** con respaldo JPG y tamaños 330 / 660 px (`srcset`)
- Caché configurada en `netlify.toml` (fotos 1 semana, `escena.js` versionado con `?v=N`)

## 🛠️ Tecnologías
HTML5 · CSS3 · JavaScript · Three.js · Netlify

## 📁 Estructura
```
index.html     Página principal
escena.js      Escena 3D animada
fotos/         Imágenes del catálogo (WebP + JPG)
netlify.toml   Build y caché para Netlify
```

## 🚀 Ver en local
Abre `index.html` en el navegador, o:
```bash
npx serve .
```

---
👤 **Rodrigo Felipe Campos Villalta** · Bachiller en Desarrollo de Software (INFRAMEN, 2026)
