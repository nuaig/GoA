# GoA: Gamification of Algorithms

An immersive **3D dungeon-themed exploration game** where players solve interactive algorithm challenges to unlock the treasure chamber. Designed to help students learn complex algorithms through engaging visuals, real-time feedback, and intelligent gameplay.

**🔗 Live at:** [https://gamification-7j06.onrender.com/](https://gamification-7j06.onrender.com/)

## 📋 Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Screenshots / Demo](#screenshots--demo)
- [Technology Stack](#technology-stack)
- [Installation & Setup](#installation--setup)
- [License](#license)
- [Connect with Me](#connect-with-me)

## Overview

GoA combines educational content and interactive gameplay into a fully immersive 3D world. Players explore a dungeon, solve challenges based on algorithms like Heapsort, Kruskal, and Prim, and receive real-time feedback on their learning journey. Perfect for students and classrooms aiming to enhance their understanding of algorithms in a visual, hands-on way.

## Core Features

- **3D Dungeon Exploration Gameplay**  
  Navigate through algorithm-based rooms and unlock the treasure by solving challenges.

- **Walk-through Interactive Tutorials**  
  Step-by-step tutorials for learning graph and sorting algorithms interactively.

- **Real-Time Feedback System**  
  Detects user mistakes and provides specific feedback based on algorithm logic.

- **Scoring, Lives & Leaderboard System**  
  Engaging game mechanics with scores, lives, and a competitive leaderboard.

- **Training & Regular Modes**  
  Practice freely in training mode or test your knowledge in regular mode.

- **Instructor Dashboard & Analytics**  
  View student performance per game or as a class, filterable by game or individual progress.

## Screenshots / Demo

- **Homepage**
  ![GoA Homepage](https://firebasestorage.googleapis.com/v0/b/commit-genie.firebasestorage.app/o/GoA%2FGoA%20p-1.png?alt=media&token=750e76c7-d553-4c29-8e18-033de3ec70ce)
- **Sign In/ Sign Up**
  ![Sign in/Signup](https://firebasestorage.googleapis.com/v0/b/commit-genie.firebasestorage.app/o/GoA%2FGoA%20p-2.png?alt=media&token=09269f2e-ebee-4aa3-b249-8e939971d5b3)
- **Instructor Dashboard 1**
  ![Dashboard_1](https://firebasestorage.googleapis.com/v0/b/commit-genie.firebasestorage.app/o/GoA%2FGoA%20p-3.png?alt=media&token=d6c8a161-12d1-4e1e-86ee-e33daa77e976)
- **Instructor Dashboard 2**
  ![Dashboard_2](https://firebasestorage.googleapis.com/v0/b/commit-genie.firebasestorage.app/o/GoA%2FGoA%20p-4.png?alt=media&token=f9842872-912d-4962-bd66-51a8ddd28e97)
- **Main Entrance of 3D Dungeon Exploration**
  ![Dungeon Exploration_1](https://firebasestorage.googleapis.com/v0/b/commit-genie.firebasestorage.app/o/GoA%2FGoA%20p-5.png?alt=media&token=2e42ecbf-ee99-49a1-922a-dff70185a02f)
- **3D Dungeon Treasure Gate**
  ![Dungeon Exploration_2](https://firebasestorage.googleapis.com/v0/b/commit-genie.firebasestorage.app/o/GoA%2FGoA%20p-6.png?alt=media&token=9142d270-dce7-4cb5-8096-87ee227a6d27)
- **Heapsort Algorithm Gameplay**
  ![Heapsort Gameplay](https://firebasestorage.googleapis.com/v0/b/commit-genie.firebasestorage.app/o/GoA%2FGoA%20p-7.png?alt=media&token=6080bd90-99b3-4d38-ad5a-cdf053d174a6)
- **Kruskal Algorithm Gameplay**
  ![Kruskal Gameplay](https://firebasestorage.googleapis.com/v0/b/commit-genie.firebasestorage.app/o/GoA%2FGoA%20p-8.png?alt=media&token=481ad1e0-2dc7-4046-9927-37e885a70986)
- **Prim Algorithm Gameplay**
  ![Prim Gameplay](https://firebasestorage.googleapis.com/v0/b/commit-genie.firebasestorage.app/o/GoA%2FGoA%20p-9.png?alt=media&token=2daaecac-1bdd-484b-946c-00742c2e9eee)

## Technology Stack

| Area              | Technologies                    |
| ----------------- | ------------------------------- |
| **Frontend**      | HTML, CSS, JavaScript, Three.js |
| **3D Models**     | Blender                         |
| **Backend**       | Node.js, Express.js             |
| **Database**      | MongoDB                         |
| **Game Engine**   | Custom built with Three.js      |
| **Data Analysis** | Custom dashboard with filtering |

## Installation & Setup

### Clone the repository

```bash
git clone https://github.com/yourusername/GoA
cd Gamification/Backend
```

### Install dependencies

```bash
npm install
```

### Set environment variables

Create a `.env` file in the root directory and add:

```env
DATABASE="your-mongodb-connection-string"
DATABASE_PASSWORD="your-database-password"
PORT=3000
```

### Start the server

```bash
cd front
npm install
npm run build
cd ..
npm start
```

Then navigate to `http://localhost:3000` in your browser.

## License

MIT 
