<div align="center">
  
  <!-- Dynamic Banner -->
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:4af626,100:1e1e1e&height=250&section=header&text=CodeCollab&fontSize=80&fontColor=ffffff" alt="CodeCollab Header" />

  <h1>🚀 CodeCollab IDE</h1>
  
  <p><b>A production-grade, real-time collaborative cloud IDE that allows concurrent developers to write, compile, and synchronize code seamlessly in a unified workspace.</b></p>

  <!-- Badges -->
  <a href="https://github.com/Neetworm/CollaborativeIDE/stargazers"><img src="https://img.shields.io/github/stars/Neetworm/CollaborativeIDE?style=for-the-badge&color=yellow" alt="Stars" /></a>
  <a href="https://github.com/Neetworm/CollaborativeIDE/network/members"><img src="https://img.shields.io/github/forks/Neetworm/CollaborativeIDE?style=for-the-badge&color=blue" alt="Forks" /></a>
  <a href="https://github.com/Neetworm/CollaborativeIDE/issues"><img src="https://img.shields.io/github/issues/Neetworm/CollaborativeIDE?style=for-the-badge&color=red" alt="Issues" /></a>
  <a href="https://github.com/Neetworm/CollaborativeIDE/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Neetworm/CollaborativeIDE?style=for-the-badge&color=green" alt="License" /></a>

  <br />
  <br />

  [Live Deployment](https://collaborative-ide-six.vercel.app) • [Report Bug](https://github.com/Neetworm/CollaborativeIDE/issues) • [Request Feature](https://github.com/Neetworm/CollaborativeIDE/issues)

</div>

## 🔮 Core Features

* 🔴 **Real-Time Synchronization:** Sub-150ms bidirectional state tracking with live peer-cursor broadcast via Socket.IO.
* 🐳 **Isolated Code Execution:** Remote script compilation safely executed within strict multi-runtime Docker containers (Node, Python, C++).
* 💾 **Write-Reduction Architecture:** Memory-caching with a dirty-flag pattern minimizing disk I/O, auto-saving to MongoDB every 10 seconds.
* 👁️ **Follow-Me Mode:** Leader-follower sync layer that forces active room observers to lock onto a project administrator's viewport.
* 📁 **Full File Management:** Create, delete, and organize files and folders with options to export the entire workspace as a ZIP.
* 🔒 **Data Isolation Guardrails:** Role-based access controls utilizing query-level aggregation pipeline filters for strict workspace privacy.

---

## 💻 Tech Stack Matrix

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | ⚛️ React.js, ⚡ Vite, 📝 Monaco Editor, 🛤️ React Router |
| **Backend & Auth** | 🟢 Node.js, 🚂 Express.js, 🔑 JWT, 🐙 GitHub OAuth 2.0 |
| **Security & Runtimes**| 🐳 Docker, 📁 Multer, 📦 Archiver API |
| **Database** | 🍃 MongoDB Atlas, 🗃️ Mongoose ODM |
| **Infrastructure** | ▲ Vercel (Frontend), ☁️ Render (Backend API) |

---

## ⚙️ Quick Start Installation

**1. Clone the repository**
```bash
git clone [https://github.com/Neetworm/CollaborativeIDE.git](https://github.com/Neetworm/CollaborativeIDE.git)
cd CollaborativeIDE

```

**2. Setup the Backend API**

```bash
cd backend
npm install

```

*Create a `.env` file in the backend directory:*

```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_crypto_secret
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

```

*Start the server:*

```bash
node index.js

```

**3. Setup the Frontend Client**

```bash
cd ../frontend
npm install
npm run dev

```

*The app will be running at `http://localhost:5173*`

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────┐
│           Browser (React + Monaco)          │
│   HTTP REST API  ←→  WebSocket (Socket.IO)  │
└──────────────────┬──────────────────────────┘
┌──────────────────▼──────────────────────────┐
│         Express.js Backend (Node.js)        │
│  ┌─────────────┐    ┌─────────────────────┐ │
│  │  REST API   │    │  Socket.IO Server   │ │
│  └──────┬──────┘    └──────────┬──────────┘ │
└─────────┼────────────────────┬─┼────────────┘
┌─────────▼────────────────────▼─┼────────────┐
│   MongoDB Atlas (Users, Projects, Files)    │
└─────────────────────────────────┼────────────┘
                    ┌─────────────▼────────────┐
                    │   Docker Sandbox Layer   │
                    └──────────────────────────┘

```

---

## 🤝 Contribute

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👨‍💻 About the Developer

<table>
  <tr>
    <td align="center">
      <img src="https://github.com/Neetworm.png" width="200" alt="Garvit Ghai"/><br>
      <b>Garvit Ghai</b><br><br>
      <a href="https://github.com/Neetworm">
        <img src="https://img.shields.io/badge/GITHUB-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
      </a><br>
      <a href="https://www.linkedin.com/in/garvit-ghai-80638828a/">
        <img src="https://img.shields.io/badge/LINKEDIN-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
      </a>
    </td>
  </tr>
</table>

## 🧾 License

Distributed under the **MIT License**. Feel free to use this project for learning or inspiration!
