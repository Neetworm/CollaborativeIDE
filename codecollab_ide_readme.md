Welcome to **CodeCollab IDE**! Built for seamless teamwork, this platform allows developers to write, execute, and debug code together in real-time. Whether you are pair programming, teaching a coding class, or brainstorming architCodeCollab IDE READMEecture, CodeCollab provides all the tools you need right in your browser.

## 📑 Table of Contents

* [✨ Key Features](#-key-features)

* [🏗️ Architecture Overview](#️-architecture-overview)

* [🛠️ Tech Stack](#️-tech-stack)

* [⚙️ Environment Variables](#️-environment-variables)

* [🚀 Getting Started](#-getting-started)

* [☁️ Deployment Guide](#️-deployment-guide)

## ✨ Key Features

* **Real-Time Collaboration:** Experience sub-150ms code syncing. You can see your teammates typing live, complete with multi-colored cursors and active user presence badges.

* **Multi-Language Execution:** Write and execute JavaScript, Python, Java, and C++ directly in the browser. We use a secure, remote engine to run your code instantly.

* **"Follow Me" Presentation Mode:** Perfect for teaching! When the room leader turns this on, all participants' screens automatically lock to the leader's scroll position, active file, and cursor location.

* **Cloud Storage & Snapshots:** Never lose your work. Seamlessly integrated with AWS S3, you can upload project assets, export your entire codebase as a ZIP file, and save up to 5 rolling project snapshots to revert to later.

* **Context-Aware Gemini AI:** A built-in AI coding assistant (powered by Google's `gemini-3.8-flash`). It automatically reads the file you are currently working on to help debug, explain concepts, or suggest optimizations.

* **Advanced Room Management:** Create public spaces or private, invite-only rooms with leader-approval mechanisms. Rooms feature built-in live chat and detailed execution analytics (like error streaks and successful builds).

* **Robust File System:** Create, rename, delete, and globally search across multiple files in a virtual project tree, just like a desktop IDE.

## 🏗️ Architecture Overview

To keep the application fast and reliable, the architecture is split into three main layers that communicate in real-time.

1. **The Client (Frontend):**
   Built with React and Monaco Editor (the same engine behind VS Code). It maintains a continuous WebSocket connection to the server, sending out tiny "deltas" (changes) whenever you type, scroll, or switch files.

2. **The Server (Backend Hub):**
   A Node.js/Express server armed with Socket.IO. It acts as the traffic controller. When User A types a line of code, the server receives it and instantly broadcasts it to Users B and C. It also manages authentication and file syncing.

3. **The Services (Storage & APIs):**

   * **MongoDB:** Stores user accounts, room settings, and the basic project structure.

   * **AWS S3:** Handles heavy lifting for file uploads and codebase snapshots.

   * **Piston API:** A secure sandbox that compiles and executes the users' code.

   * **Gemini AI:** Processes natural language queries alongside the user's code context to provide intelligent chatbot responses.

## 🛠️ Tech Stack

| Category | Technologies Used | 
| ----- | ----- | 
| **Frontend** | React.js (Vite), Monaco Editor, Socket.IO-client, TailwindCSS | 
| **Backend** | Node.js, Express.js, Socket.IO | 
| **Database** | MongoDB (Mongoose) | 
| **Cloud & APIs** | AWS S3, Google Generative AI (Gemini), Piston API (Execution) | 
| **Hosting** | Vercel (Frontend), Render (Backend) | 

## ⚙️ Environment Variables

To run this project, you will need to add the following variables to your `.env` files.

### Backend (`backend/.env`)

| Variable | Description | 
| ----- | ----- | 
| `PORT` | The port your server runs on (e.g., `5000`) | 
| `MONGO_URI` | Your MongoDB connection string | 
| `JWT_SECRET` | A secure string for encrypting user tokens | 
| `CLIENT_URL` | `http://localhost:5173` (or your Vercel URL) | 
| `AWS_REGION` | Your AWS region (e.g., `ap-south-1`) | 
| `AWS_ACCESS_KEY_ID` | Your AWS IAM access key | 
| `AWS_SECRET_ACCESS_KEY` | Your AWS IAM secret key | 
| `AWS_BUCKET_NAME` | The name of your S3 bucket | 
| `PISTON_API_KEY` | Execution API key | 
| `GEMINI_API_KEY` | Google Gemini API key | 

### Frontend (`frontend/.env`)

| Variable | Description | 
| ----- | ----- | 
| `VITE_API_BASE_URL` | `http://localhost:5000` (or your Render URL) | 

## 🚀 Getting Started

Follow these steps to get a local copy up and running on your machine.

### Prerequisites

* Node.js installed on your machine

* A MongoDB cluster (Atlas or local)

* An AWS Account (for S3 storage features)

### 1. Clone the repository

```
git clone https://github.com/yourusername/codecollab-ide.git
cd codecollab-ide


```

### 2. Start the Backend

```
cd backend
npm install
# Create your .env file here based on the table above
npm run dev


```

### 3. Start the Frontend

Open a new terminal window:

```
cd frontend
npm install
# Create your .env file here based on the table above
npm run dev


```

Navigate to `http://localhost:5173` in your browser to start collaborating!

## ☁️ Deployment Guide

This project is optimized for deployment on **Vercel** (Frontend) and **Render** (Backend).

**Frontend Notes (Vercel):**
Because this is a Single Page Application (SPA) using React Router, we included a `vercel.json` file in the frontend root. This ensures that if a user refreshes the page inside a room (e.g., `/room`), Vercel routes them correctly instead of throwing a 404 error.

**Backend Notes (Render):**
Render does not upload `.env` files. You **must** manually input every backend environment variable (AWS keys, Gemini keys, Mongo URI) into the **Environment** tab of your Render Web Service dashboard, otherwise cloud storage and AI execution will fail in production.