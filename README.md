
# Connectly - Real-Time Group Chat Application

Connectly is a modern, real-time group chat application built to enable seamless communication in dynamic chat rooms. Designed with scalability and user experience in mind, Connectly supports user authentication, themed chat rooms, emoji reactions, and live messaging using React, Node.js, MongoDB, and Socket.IO.

This application empowers users to create and join multiple chat rooms, customize themes, and receive instant notifications — perfect for team collaboration, community discussions, and social interactions.
## Features

- **User Authentication**: Secure registration and login with JWT-based authentication.
- **Real-Time Messaging**: Instant message delivery using Socket.IO for seamless chat experience.
- **Group Chat Rooms**:
  - Create public or private chat rooms.
  - Request to join private rooms with admin approval.
  - View and manage room members.
- **Message Management**:
  - Send and receive text messages and emojis.
  - Delete individual messages.
  - Clear chat history within rooms.
- **Chat Room Customization**:
  - Choose from multiple animated themes (Blue, Green, Pink, Orange, Dark).
  - Dynamic backgrounds matching selected themes.
- **Notifications**:
  - Real-time notifications for new messages and join requests.
- **Responsive Design**:
  - Mobile-friendly layout with intuitive UI.
- **Role-Based Access**:
  - Room admins can add/remove members and approve join requests.
- **Persistent Data**:
  - Messages, rooms, and user data stored securely in MongoDB.

##  Tech Stack

- **Frontend**: React, React Router, Tailwind CSS, Framer Motion, Emoji Picker
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Real-Time Communication**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: vercel
##  Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mamatha1607/connectly-group-chat-application.git
   cd connectly-group-chat-application

2. **Install backend dependencies and start backend server**
   ```bash
   cd backend
   npm install
   npm run dev
Backend runs on http://localhost:5000

3. **Install frontend dependencies and start frontend**
   ```bash
   
   cd ../frontend
   npm install
   npm start

Frontend runs on http://localhost:3000

4. **Install and set up MongoDB**

If you need help installing MongoDB and setting it up locally, please refer to the official documentation:

- [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

- Make sure MongoDB is running before starting the backend server.

5. **Configure environment variables**

- Create a `.env` file in the `backend` folder.

- Add your MongoDB URI, JWT secret, and other required keys. For example:

  ```env
  MONGO_URI=your_mongo_connection_string
  JWT_SECRET=your_jwt_secret
  PORT=5000


6. Start the backend server
cd ../backend
npm start

7. Start the frontend development server
cd ../frontend
npm start

8. Open the app
Visit http://localhost:3000 in your browser.


## 👤Usage

1. **Register or log in** to create or join chat rooms.

2. **Create a new chat room** by providing a name, description, and optional tags. You can also choose to make the room private.

3. **Browse and join existing chat rooms**:
   - Join public rooms instantly.
   - Request access to private rooms and wait for admin approval.

4. **Chat in real-time** with other members:
   - Send text messages and emojis.
   - Messages appear instantly without needing to refresh.
   - Delete your own messages if needed.
   - Clear the entire chat history (if you’re a member).

5. **Customize your chat experience**:
   - Choose from different chat room themes with animated backgrounds.
   - View members of the chat room.
   - Admins can manage members by adding or removing users.
```bash
backend
├── middleware
│   └── auth.js
├── models
│   ├── Message.js
│   ├── Room.js
│   └── User.js
├── routes
├── utils
├── .env
├── db.js
├── package.json
└── package-lock.json

frontend
└── src
    ├── components
    │   ├── Bluebackground.jsx
    │   ├── ChatPage.jsx
    │   ├── ChatRoomThemeSelector.jsx
    │   ├── GreenBackground.jsx
    │   ├── HeartBackground.jsx
    │   ├── Navbar.js
    │   └── OrangeBackground.jsx
    ├── pages
    │   ├── AuthPage.jsx
    │   ├── CreateRoom.js
    │   └── RoomDashboard.js
    ├── App.js
    ├── index.css
    ├── index.js
    └── Socket.js
