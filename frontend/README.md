# RideShare Frontend

A clean, Apple-style iOS prototype for a ride-sharing app built with Next.js 14, TypeScript, Tailwind CSS, and Shadcn UI.

## Features

- **Driver View**: Input fields for start/end locations, "Go Online" button with loading state, and live request alerts
- **Rider View**: Input fields for pickup and destination, "Find Pool" button with skeleton loader
- **Map Component**: Interactive map using Mapbox GL with polyline route rendering and pickup/dropoff markers
- **Apple-Style Design**: Clean, minimal design with rounded-3xl buttons, generous whitespace, and Inter font

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Mapbox account and access token (for map functionality)

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Add your Mapbox token to `.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── layout.tsx    # Root layout with Inter font
│   │   ├── page.tsx      # Main page with tabs
│   │   └── globals.css   # Global styles and Tailwind
│   ├── components/
│   │   ├── ui/           # Shadcn UI components
│   │   ├── DriverView.tsx
│   │   ├── RiderView.tsx
│   │   └── Map.tsx       # Map component with polyline support
│   └── lib/
│       ├── utils.ts      # Utility functions
│       └── polyline.ts   # Polyline decoder
├── components.json       # Shadcn UI configuration
├── tailwind.config.ts    # Tailwind configuration
└── package.json
```

## Components

### DriverView
- Start/End location inputs
- "Go Online" button with loading state
- Map preview when online
- Live request sheet with match alerts showing detour time

### RiderView
- Pickup and destination inputs
- "Find Pool" button
- Skeleton loader during search
- Results card with map and ride details

### Map
- Renders polyline routes in blue
- Shows pickup/dropoff as white circles with black borders
- Uses Mapbox GL for rendering

## Design System

- **Buttons**: `rounded-3xl` with `shadow-sm`
- **Cards**: `rounded-3xl` with `shadow-sm`
- **Spacing**: Generous whitespace throughout
- **Font**: Inter (with SF Pro fallback)
- **Layout**: Centered, mobile-first (`max-w-md mx-auto`)

## Tech Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **Shadcn UI**: Accessible component library
- **Lucide Icons**: Icon library
- **Mapbox GL**: Map rendering
- **React Map GL**: React bindings for Mapbox

## Notes

- The Map component requires a Mapbox access token. Get one at [mapbox.com](https://www.mapbox.com)
- The polyline decoder supports Google's encoded polyline format
- All components are client-side rendered for interactivity

