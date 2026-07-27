# Cheer Me Up

Cheer Me Up is a cheerful mood-tracking wellness app that gives users small, positive breaks during a difficult day. Users can log a mood, receive mood-boosting content, save favorites, and view recent mood trends.

## Features

- Five-level mood check-in with an optional note
- Quote, advice, cat fact, and dog image content
- Saved favorites
- Mood history and Chart.js visualization
- LocalStorage support with no setup required
- Optional Supabase storage with anonymous authentication
- Responsive, accessible interface

## Technologies

- HTML
- CSS
- JavaScript
- Chart.js
- Supabase
- Public REST APIs

## Run locally

No build step is required.

1. Download or clone the repository.
2. Open the project folder in VS Code.
3. Start a local server. The VS Code Live Server extension works well.
4. Open the local URL in your browser.

The app works immediately using LocalStorage.

## Optional Supabase setup

1. Create a Supabase project.
2. Open the SQL Editor and run `supabase-schema.sql`.
3. In Supabase, enable anonymous sign-ins under **Authentication > Providers**.
4. Copy `config.example.js` to `config.js`.
5. Add your Supabase project URL and public anon key to `config.js`.

Only use the public anon key in browser code. Never add a service-role key or another private secret.

## GitHub Pages

1. Push the project to GitHub.
2. Open the repository's **Settings**.
3. Select **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/root` folder.

## Project structure

```text
cheer-me-up/
├── assets/
│   └── favicon.svg
├── .gitignore
├── README.md
├── app.js
├── config.example.js
├── config.js
├── index.html
├── styles.css
└── supabase-schema.sql
```

## Portfolio description

A mood-tracking wellness app that pulls from quote, advice, cat fact, and dog image APIs, with saved favorites and chart-based mood visualization.
