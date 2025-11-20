# BrewIQ - Real-Time Trivia Platform

## Project Overview

BrewIQ is a comprehensive real-time trivia platform designed for bars and entertainment venues, featuring AI-powered content generation, live gameplay, and marketing automation.

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation & Development

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd bar-trivia-maestro

# Step 3: Install dependencies
npm install

# Step 4: Set up environment variables
# Copy .env.example to .env and fill in your Supabase credentials
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Step 5: Start the development server
npm run dev
```

The app will be available at `http://localhost:8080` (or the port shown in your terminal).

### Testing in Incognito Mode

To test multiple user roles simultaneously:

1. Start the dev server with `npm run dev`
2. Open multiple incognito/private browser windows
3. Navigate to the local URL in each window
4. Sign in with different user accounts (admin, host, player) in each window

## Technologies Used

This project is built with:

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI framework
- **shadcn-ui** - Component library
- **Tailwind CSS** - Utility-first CSS
- **Supabase** - Backend as a Service (Database, Auth, Realtime)

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── admin/       # Admin dashboard components
│   ├── player/      # Player-facing components
│   └── ui/          # shadcn-ui components
├── pages/           # Page components
├── contexts/        # React contexts (Auth, etc.)
├── hooks/           # Custom React hooks
├── integrations/    # External service integrations (Supabase)
└── lib/             # Utility functions
```

## Deployment

Build the project for production:

```sh
npm run build
```

The built files will be in the `dist/` directory and can be deployed to any static hosting service.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request
