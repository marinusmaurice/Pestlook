# Pestlook UI — Web Frontend

Vanilla JavaScript SPA for the Pestlook Field Intelligence Platform.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later (includes `npm`)

---

## Setup

Install dependencies (only needed once, or after a `git clone`):

```bash
cd Pestlook.UI.Web
npm install
```

---

## Rebuilding the CSS

The stylesheet at `css/styles.css` is compiled from `css/input.css` using **Tailwind CSS v3**.  
You must rebuild it whenever you:

- Change custom CSS in `css/input.css`
- Add new Tailwind utility classes to any `.js` or `.html` file
- Pull changes that modified either of the above

### One-time build (minified, for production)

```bash
npm run build
```

### Watch mode (rebuilds automatically on save, for development)

```bash
npm run dev
```

Leave the `npm run dev` terminal running while you work. Every time you save a `.js` or `.html` file, `css/styles.css` will be regenerated automatically.

---

## File Structure

```
Pestlook.UI.Web/
├── css/
│   ├── input.css       ← Edit this file to add custom CSS or Tailwind directives
│   └── styles.css      ← Auto-generated — do not edit directly
├── js/
│   ├── app.js
│   ├── api/            ← API service modules
│   ├── components/     ← Sidebar, topbar, modal, toast, tag
│   ├── pages/          ← One file per page/route
│   └── utils/          ← Router, storage, helpers
├── index.html
├── package.json
└── tailwind.config.js
```

> **Note:** Never edit `css/styles.css` directly — your changes will be overwritten the next time the build runs.

---

## Running Locally

This is a static SPA — no build server is required. Simply open `index.html` in a browser or serve it with any static file server, for example:

```bash
npx serve .
```

Make sure the **Pestlook WebAPI** is running on `http://localhost:5000` (or update the base URL in `js/api/client.js`) before navigating to authenticated pages.
