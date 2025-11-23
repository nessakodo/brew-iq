# BrewIQ Real Time Trivia Demo

## Overview

BrewIQ is a real time bar trivia platform designed around three distinct user experiences:

1. **Player View**  
2. **Host View**  
3. **Admin View**

This repository supports the **demo build** described in the BrewIQ Demo Guide.  
All UI flows and screenshots shown there are **representative**, while full system functionality is still being implemented according to the project timeline and client feedback.

---

## Demo Walkthrough Reference

See the Demo Guide (BrewIQ Bar Trivia Demo Guide + User Stories) for detailed explanations of:

- Player onboarding  
- Question card interaction  
- Loading states between questions  
- Host event setup  
- Host live controls and leaderboard  
- Admin content generation  
- Admin trivia library  
- Admin account management  

---

## Screenshots

Add finalized screenshots to the sections below.

### **Player View**

**Figure 1. Player Join Screen**  
`![Player Join Screen](src/assets/player-game-code.png)`

**Figure 2. In Game Question Card**  
`![Player Question Card](src/assets/player-question.png)`

**Figure 3. Inter Question Loading Screen**  
`![Loading Screen](src/assets/loading.png)`

---

### **Host View**

**Figure 4. Event Overview (Pre Game)**  
`![Host Event Overview](src/assets/host-dashboard.png)`

**Figure 5. Game Code Countdown (Pre Game)**  
`![Host Game Code](src/assets/game-code.png)`

**Figure 6. Host Live Question + Leaderboard**  
`![Host Live](src/assets/host-question.png)`

---

### **Admin View**

**Figure 7. AI Trivia Generator**  
`![AI Trivia Generator](src/assets/ai-trivia-generator.png)`

**Figure 8. Trivia Library**  
`![Trivia Library](src/assets/presets.png)`

**Figure 9. User Management Panel**  
`![User Management Panel](src/assets/admin-dash.png)`

---

## Getting Started

### **Requirements**

- Node.js + npm  
- Git  

---

### **Install and Run**

```sh
git clone https://github.com/nessakodo/brew-iq.git
cd brew-iq
npm install
npm run dev
````

The app will run at the port shown in your terminal (usually `http://localhost:5173/`).

---

## Testing Player View

To test the player interface in a multi user environment:

1. Run the dev server

   ```sh
   npm run dev
   ```
2. Open multiple browser windows (or incognito sessions)
3. Navigate to the local URL in each window
4. Enter the same join code on each Player Join Screen
5. Observe synced question progression once the host advances the game

**Note: Some host and admin flows may be partially stubbed during demo phase.**


---

## Project Structure

```text
src/
  components/
    player/     # Player facing UI
    host/       # Host controls
    admin/      # Admin dashboard
    ui/         # Shared UI components
  pages/
  contexts/
  hooks/
  integrations/
  lib/
```
