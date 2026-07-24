# Educational Lecture Platform

A full-stack web application for browsing and watching educational lectures, built with React.js and Node.js.

## Features

- 📚 Browse multiple educational lectures across different categories
- 🔍 Search functionality to find lectures by title, description, or instructor
- 🏷️ Filter lectures by category (Mathematics, Physics, History, Programming, Chemistry)
- 🎥 Video player for watching lectures (with placeholder YouTube videos)
- 📱 Fully responsive design for mobile and desktop
- 🎨 Modern, clean UI with smooth animations

## Tech Stack

**Frontend:**
- React.js 18
- React Router for navigation
- CSS3 for styling

**Backend:**
- Node.js
- Express.js
- PostgreSQL (via `pg`)
- CORS enabled

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm
- PostgreSQL

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create the database and configure the connection:
```bash
createdb tmr_lectures
cp .env.example .env   # then edit DATABASE_URL if needed
```

4. Run the migration and seed the initial lecture data:
```bash
npm run db:migrate
npm run db:seed
```

5. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5001`

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000` and automatically open in your browser.

### Admin Setup

A separate app for researchers to review participant preferences and watch history, sharing the same backend and Postgres database as the participant frontend.

1. Open a new terminal and navigate to the admin directory:
```bash
cd admin
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The admin app will run on `http://localhost:3001`. Log in with a username that has `is_admin = true` in the `users` table (the migration seeds one by default: `admin`).



## Mobile App (Sleep Cue)

The Sleep Cue mobile application is a companion app for participants in the Educational Videos study. It provides a mobile interface for accessing lectures, listening to recommended Spotify playlists, and supporting the sleep cue intervention. The app communicates with the same Express backend and PostgreSQL database used by the web application.

### 1. Navigate to the mobile directory

```bash
cd mobile
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the Expo development server

```bash
npx expo start
```

### 4. Launch the app

- Scan the QR code using the **Expo Go** app.
- Or press **a** for Android, **w** for web, or **i** for iOS (macOS only).
- Copy paste the link (Web: http://localhost:8081) on browser

The app connects to the existing backend APIs, so ensure the backend server is running before using the mobile application.


## API Endpoints

- `GET /api/lectures` - Get all lectures (supports `?category=` query parameter)
- `GET /api/lectures/:id` - Get a specific lecture by ID
- `GET /api/categories` - Get all available categories
- `POST /api/auth/login` / `POST /api/auth/register` - Username-based login/registration
- `PUT /api/users/:id/preferences` - Save a user's lecture preferences
- `POST /api/users/:id/watched` - Record that a user watched a lecture
- `GET /api/admin/users` - List all users with preferences and watch history (requires `x-user-id` header of an admin user)

## Project Structure

```
tmr-project/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── data/
│   │   └── lectures.js
│   └── db/
│       ├── index.js
│       ├── migrate.js
│       └── seed.js
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── index.js
│       ├── components/
│       │   ├── LectureList.js
│       │   ├── LectureCard.js
│       │   └── LecturePlayer.js
│       └── styles/
│           └── App.css
└── README.md
```

## Usage

1. Start both the backend and frontend servers as described in the installation section
2. Browse available lectures on the home page
3. Use the search bar to find specific lectures
4. Filter by category using the category buttons
5. Click on any lecture card to watch the video and see detailed information
6. Use the back button to return to the lecture list

## Future Enhancements

- User authentication and profiles
- Progress tracking
- Bookmarking lectures
- Comments and ratings
- Upload actual video files
- Lecture recommendations
- Quiz functionality
