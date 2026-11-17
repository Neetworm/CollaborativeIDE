
# 🚀 CodeCollab IDE
### Real-Time Collaborative Cloud IDE

CodeCollab is a real-time collaborative cloud-based IDE that enables developers to write, execute, and debug code together directly from their browsers.

Designed for pair programming, collaborative development, and interactive coding sessions, CodeCollab combines real-time synchronization, multi-language code execution, cloud storage, and AI-powered coding assistance into a unified development environment.

**Built to make collaborative coding seamless, interactive, and accessible.**

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Structure](#-project-structure)
- [⚙️ Environment Variables](#️-environment-variables)
- [🚀 Getting Started](#-getting-started)
- [☁️ Deployment](#️-deployment)
- [🔐 Security Notes](#-security-notes)
- [🤝 Contributing](#-contributing)

---

## ✨ Key Features

### 1. Real-Time Collaboration
- Achieves sub-150ms code synchronization.
- Enables multiple users to collaborate within the same coding room.
- Displays live multi-colored cursors and active user presence.
- Synchronizes code changes across connected participants using WebSockets.

### 2. Multi-Language Code Execution
- Supports JavaScript, Python, Java, and C++.
- Executes code directly from the browser.
- Uses the Piston API as the remote code execution engine.
- Provides execution results without requiring users to configure local compilers.

### 3. Follow Me – Presentation Mode
- Designed for collaborative teaching and guided coding sessions.
- Allows room leaders to control participants' viewing experience.
- Synchronizes participants' scroll position, active file, and cursor location with the leader.

### 4. Cloud Storage & Project Snapshots
- Integrates AWS S3 for cloud-based file storage.
- Supports project asset uploads.
- Allows users to export their codebase as a ZIP file.
- Maintains up to five rolling project snapshots for recovery.

### 5. Context-Aware Gemini AI Assistant
- Integrates Google's Gemini AI for coding assistance.
- Uses the currently active file as context for AI interactions.
- Helps users debug code, understand concepts, and explore optimization suggestions.

### 6. Advanced Room Management
- Supports public and private invite-only coding rooms.
- Includes leader-approval mechanisms for room access.
- Provides built-in real-time room chat.
- Tracks execution analytics, including error streaks and successful builds.

### 7. Virtual File System
- Create, rename, and delete project files.
- Organize code using a virtual project tree.
- Search across multiple files.
- Manage project files within the collaborative workspace.

---

## 🏗️ System Architecture

CodeCollab follows a layered architecture consisting of the frontend client, backend server, and external services.

### Architecture Overview

```text
                  ┌─────────────────────────┐
                  │       Frontend          │
                  │                         │
                  │ React + Monaco Editor   │
                  │ Socket.IO Client        │
                  └────────────┬────────────┘
                               │
                      HTTP / WebSocket
                               │
                  ┌────────────▼────────────┐
                  │       Backend           │
                  │                         │
                  │    Node.js + Express    │
                  │       Socket.IO         │
                  └────────────┬────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
      ┌───────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
      │   MongoDB    │  │   AWS S3    │  │  External   │
      │              │  │             │  │  Services   │
      │ User & Room  │  │ File Storage│  │             │
      │ Data         │  │ Snapshots   │  │ Gemini AI   │
      │              │  │             │  │ Piston API  │
      └──────────────┘  └─────────────┘  └─────────────┘
```

### 1. Frontend – Client Layer

Built using React.js and Monaco Editor, the frontend provides the collaborative coding interface.

- Monaco Editor provides a VS Code-like editing experience.
- Socket.IO Client maintains real-time communication with the backend.
- Code changes and collaboration events are synchronized between connected users.
- The interface supports room management, file navigation, code execution, and AI assistance.

### 2. Backend – Application Layer

The backend is built using Node.js, Express.js, and Socket.IO.

It acts as the central communication and application layer.

- Handles HTTP requests and application APIs.
- Manages WebSocket connections and real-time room communication.
- Broadcasts code changes and collaboration events.
- Handles authentication, room management, and file synchronization.
- Coordinates communication with databases and external services.

### 3. Services – Data & Integration Layer

| Service | Responsibility |
|---|---|
| MongoDB | Stores user accounts, room settings, and project-related data. |
| AWS S3 | Handles file uploads, cloud storage, and project snapshots. |
| Piston API | Provides remote code compilation and execution. |
| Gemini AI | Powers context-aware AI coding assistance. |

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js (Vite), Monaco Editor, Socket.IO Client, Tailwind CSS |
| Backend | Node.js, Express.js, Socket.IO |
| Database | MongoDB, Mongoose |
| Cloud Storage | AWS S3 |
| AI Integration | Google Generative AI (Gemini) |
| Code Execution | Piston API |
| Deployment | Vercel (Frontend), Render (Backend) |

---

## 📂 Project Structure

```text
CodeCollab/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vercel.json
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── config/
│   ├── package.json
│   └── server.js
│
├── README.md
└── .gitignore
```

*Note: This is a high-level representation of the project structure. Actual directories and filenames may vary.*

---

## ⚙️ Environment Variables

The application requires environment variables for database connectivity, authentication, cloud storage, AI integration, and code execution.

Create separate `.env` files for the frontend and backend.

### Backend – `backend/.env`

| Variable | Description |
|---|---|
| `PORT` | Port on which the backend server runs (e.g., `5000`). |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | Secret key used for JWT signing and verification. |
| `CLIENT_URL` | Frontend application URL. |
| `AWS_REGION` | AWS region (e.g., `ap-south-1`). |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key. |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret access key. |
| `AWS_BUCKET_NAME` | Name of the AWS S3 bucket. |
| `PISTON_API_KEY` | API key for the Piston execution service. |
| `GEMINI_API_KEY` | Google Gemini API key. |

### Frontend – `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API URL (e.g., `http://localhost:5000`). |

**Important:** Use the exact variable names expected by your application code. Do not commit actual API keys, passwords, or secret credentials to GitHub.

---

## 🚀 Getting Started

Follow these instructions to set up CodeCollab locally.

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- MongoDB Atlas account or a local MongoDB instance
- AWS account with an appropriately configured S3 bucket
- Required API credentials for Gemini and Piston

### 1. Clone the Repository

```bash
git clone https://github.com/Neetworm/CollaborativeIDE.git

cd CollaborativeIDE
```

### 2. Install Backend Dependencies

```bash
cd backend

npm install
```

Create a `.env` file inside the backend directory and configure the required environment variables.

Start the backend development server:

```bash
npm run dev
```

### 3. Install Frontend Dependencies

Open another terminal window:

```bash
cd frontend

npm install
```

Create a `.env` file inside the frontend directory and configure the backend API URL.

Start the frontend development server:

```bash
npm run dev
```

### 4. Access the Application

Open your browser and navigate to:

```text
http://localhost:5173
```

You can now access the CodeCollab interface and start collaborating.

---

## ☁️ Deployment

CodeCollab uses Vercel for frontend hosting and Render for backend deployment.

### Frontend – Vercel

- Deploy the frontend application through Vercel.
- Configure the required frontend environment variables.
- Ensure the backend API URL points to the deployed backend.
- The frontend includes a `vercel.json` configuration for React Router SPA routing.

This configuration ensures that refreshing nested routes, such as `/room`, does not result in an unintended 404 response.

### Backend – Render

- Deploy the Node.js backend as a Render Web Service.
- Configure all backend environment variables through the Render dashboard.
- Set the appropriate frontend URL in `CLIENT_URL`.
- Ensure MongoDB, AWS S3, Gemini AI, and Piston API credentials are configured correctly.

**Important:** Render does not automatically use your local `.env` file. Environment variables must be configured separately in the Render service dashboard.

---

## 🔐 Security Notes

- Never commit `.env` files or API credentials.
- Keep AWS IAM credentials private and use least-privilege permissions.
- Use strong JWT secrets.
- Validate incoming requests on the backend.
- Restrict access to private collaboration rooms through appropriate authorization checks.

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

If you would like to contribute:

1. Fork the repository.
2. Create a new feature branch.
3. Implement your changes.
4. Commit and push your changes.
5. Open a Pull Request.

---

## 📬 Contact

**Garvit Ghai**

- Email: [garvitghai880@gmail.com](mailto:garvitghai880@gmail.com)
- GitHub: [Neetworm](https://github.com/Neetworm)
- LinkedIn: [Garvit Ghai](https://www.linkedin.com/in/garvit-ghai-80638828a)

---

<div align="center">

### Built for collaboration. Designed for developers. 🚀

**CodeCollab IDE**

⭐ If you find this project interesting, consider giving it a star!

</div>
