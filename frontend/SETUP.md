# Quick Setup Guide

## 1. Install Dependencies

```bash
cd frontend
npm install
```

## 2. Get Mapbox Token

1. Sign up at [mapbox.com](https://www.mapbox.com)
2. Go to your account page
3. Copy your default public token
4. Add it to `.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

## 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Features to Test

### Driver View
- Enter start and end locations
- Click "Go Online" (shows loading state)
- After going online, a match alert will appear after 3 seconds
- The alert shows "Detour: +4 mins" in a green badge

### Rider View
- Enter pickup and destination
- Click "Find Pool" (shows skeleton loader)
- After 3 seconds, results appear with map

## Notes

- The map requires a Mapbox token to render
- All interactions are simulated with timeouts
- The polyline decoder supports Google's encoded polyline format
- Design follows Apple's iOS style with rounded-3xl buttons and generous whitespace

