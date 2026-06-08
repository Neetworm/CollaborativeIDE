````md
# CollaborativeIDE

CollaborativeIDE is a real-time collaborative code editor and development workspace built with a Node.js backend and a React frontend. It supports authentication, GitHub OAuth, project rooms, file storage, AI chat, sandboxed code execution, and admin analytics.

## Features

- Real-time collaborative coding rooms
- JWT-based authentication and authorization
- GitHub OAuth login and account merge flow
- AI assistant for coding-related interactions
- File upload, download, and snapshot support
- In-memory room state management
- Secure code execution with Docker sandboxing
- Support for multiple languages, including Node.js, Python, C++, and Java
- Admin dashboard for usage and activity insights
- Clean component-based frontend architecture

## Tech Stack

### Frontend
- React
- JavaScript
- Vite
- Axios
- React Router

### Backend
- Node.js
- Express.js
- MongoDB
- JWT
- Socket-style real-time room handling
- Docker
- GitHub OAuth

### Storage and Services
- MongoDB Atlas
- In-memory OTP storage
- File metadata storage
- Docker-based execution environments

## Project Structure

```bash
CollaborativeIDE/
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── AiChats.js
│   │   ├── Project.js
│   │   ├── Upload.js
│   │   └── User.js
│   ├── routes/
│   │   ├── ai.js
│   │   ├── auth.js
│   │   └── storage.js
│   ├── services/
│   │   ├── storageDB.js
│   │   └── otpStore.js
│   ├── docker.node
│   ├── docker.python
│   ├── docker.cpp
│   ├── docker.java
│   ├── executeCode.js
│   ├── executeCodeDocker.js
│   ├── db.js
│   ├── roomManager.js
│   └── index.js
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AiAssistant.jsx
│       │   ├── CloudStorage.jsx
│       │   ├── Console.jsx
│       │   ├── FileTree.jsx
│       │   └── Navbar.jsx
│       ├── pages/
│       │   ├── AdminDashboard.jsx
│       │   ├── Auth.jsx
│       │   ├── GitHubMerge.jsx
│       │   ├── GitHubSuccess.jsx
│       │   ├── Home.jsx
│       │   └── Room.jsx
│       ├── config.js
│       ├── App.jsx
│       └── main.jsx
│
└── README.md
````

## Prerequisites

* Node.js
* npm
* MongoDB
* Docker
* GitHub OAuth application credentials

## Environment Variables

Create a `.env` file inside the backend folder and add the required values:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

GEMINI_API_KEY=your_gemini_api_key
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=onboarding@resend.dev
```

## Installation

### Clone the repository

```bash
git clone https://github.com/your-username/CollaborativeIDE.git
cd CollaborativeIDE
```

### Install backend dependencies

```bash
cd backend
npm install
```

### Install frontend dependencies

```bash
cd ../frontend
npm install
```

## Running Locally

### Start the backend

```bash
cd backend
node index.js
```

### Start the frontend

```bash
cd frontend
npm run dev
```

## Docker Execution Setup

CollaborativeIDE uses isolated Docker containers for running code safely in different languages.

The following sandbox images are supported:

* Node.js
* Python
* C++
* Java

Each runtime has its own Dockerfile-style configuration inside the backend folder.

## API Modules

### Auth

Handles:

* user registration
* login
* JWT verification
* GitHub OAuth
* account merge flow

### AI

Handles:

* AI chat sessions
* assistant interactions

### Storage

Handles:

* file uploads
* downloads
* snapshots
* storage metadata

## Frontend Pages

### Auth

Login and registration page with authentication flows.

### Home

Dashboard for creating and joining rooms.

### Room

Main collaborative editor workspace.

### AdminDashboard

Analytics and administrative overview.

### GitHubMerge

Flow for merging GitHub-linked accounts.

### GitHubSuccess

OAuth callback success screen.

## Security and Architecture

* JWT is used for protected routes
* Auth middleware verifies user identity
* Room state is managed separately from persistent storage
* Docker is used for isolated code execution
* File metadata and project data are stored in MongoDB
* Sensitive operations are separated into dedicated backend routes and services

## License

This project is licensed under the MIT License.

## Author

Neetworm

```
```
