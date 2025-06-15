# Auralynk

Live astrology & tarot sessions with real people. Built with React, Tailwind, Supabase, and Stripe.

To fix 404 errors on refresh when using React Router, place the following firebase.json in the project root and deploy:

```
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```
