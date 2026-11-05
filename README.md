# 🌱 Change Together — Events API

**Powering community connections through a reliable event management API.**

Change Together Events API is a RESTful backend built with Express.js and MongoDB. It handles community event management and volunteer participation by providing API endpoints for creating, retrieving, updating, and deleting events. It also manages volunteer registrations and integrates with the Next.js client as a fallback data source when the primary database routes are unavailable.

🔗 **Local API Base URL:** `http://localhost:5000`

## ✨ Key Features

1. **📅 Event Creation & Management** — Create, update, and delete community events with server-side validation. Only the original event organizer can modify or cancel their own events.

2. **🌍 Upcoming Events Discovery** — Retrieve all upcoming community events, automatically filtering out past events and sorting results by event date.

3. **🤝 Volunteer Participation** — Allow authenticated users to join community events. Each participation record stores a snapshot of both user and event information.

4. **🔒 Secure API Authentication** — Protect sensitive API endpoints using Better Auth JWT tokens. Tokens are verified against the client's JWKS to validate signatures, expiration, issuer, and audience.

5. **📋 Joined Events Tracking** — Retrieve all events joined by a specific authenticated user, sorted by event date.

6. **🛡️ Organizer Authorization** — Ensure that only the event organizer, verified through their authenticated email, can update or delete their own events.

7. **✅ Server-side Data Validation** — Validate event titles, descriptions, event types, locations, thumbnail URLs, and future event dates before storing data.

8. **🔁 Duplicate Join Prevention** — Use a unique MongoDB index on `{ eventId, user.email }` to prevent users from joining the same event more than once.

## 🧰 Technologies Used

| Category | Technologies |
|---|---|
| Backend Framework | Express.js |
| Language | JavaScript |
| Database | MongoDB (Native Driver) |
| Authentication | Better Auth JWT |
| Token Verification | jose (JWKS) |
| API Architecture | REST API |

## 📜 API Endpoints

The following endpoints are available for managing community events and volunteer participation.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/create-event` | Private | Create a new event |
| GET | `/upcoming-events` | Public | Retrieve all upcoming events |
| GET | `/events/:id` | Public | Retrieve event details and join count |
| GET | `/events/:id/join` | Optional | Retrieve join count and user's join status |
| POST | `/events/:id/join` | Private | Join an event |
| GET | `/my-events` | Private | Retrieve events joined by the authenticated user |
| PATCH | `/events/:id` | Private | Update an organized event |
| DELETE | `/events/:id` | Private | Cancel an organized event |

**Authentication:** Protected endpoints require a JWT access token in the request header.

```http
Authorization: Bearer <JWT>
```

The JWT is issued by the Next.js client's Better Auth `jwt()` plugin and verified using the client's JWKS endpoint.

## 🚀 Getting Started

Follow these steps to run the backend locally.

**1. Clone the repository**

```bash
git clone YOUR_SERVER_REPOSITORY_URL
```

**2. Navigate to the project directory**

```bash
cd YOUR_SERVER_PROJECT_FOLDER
```

**3. Install dependencies**

```bash
npm install
```

**4. Configure environment variables**

Create a `.env` file in the project root and add the following variables:

```env
MONGODB_URI=your-mongodb-connection-string
PORT=5000

# JWKS endpoint of the Next.js client
JWKS_URL=http://localhost:3000/api/auth/jwks
```

**5. Start the server**

```bash
node index.js
```

If your project includes a development script, you can also use:

```bash
npm run dev
```

The API will be available at:

`http://localhost:5000`

## 🗄️ Database Structure

The backend uses MongoDB and shares the `change-together` database with the Next.js client.

| Collection | Purpose |
|---|---|
| `create-event` | Stores community event information |
| `event-joins` | Stores volunteer participation records |

## 🔐 Additional Notes

- **Database Integration:** The backend uses the MongoDB native driver to manage event and volunteer participation data.
- **JWT Verification:** Protected routes verify Better Auth JWT tokens through the Next.js client's JWKS endpoint.
- **Event Ownership:** Only the authenticated organizer can update or delete their own events.
- **CORS Configuration:** CORS is enabled to allow the Next.js frontend to communicate with the Express API from a different origin.
- **Duplicate Prevention:** A unique compound index prevents duplicate volunteer registrations for the same event.

## 🔗 Relevant Links

- 🌐 **Frontend Live Demo:** [Change Together](https://change-together.vercel.app/)
- 💻 **Frontend Repository:** [Change Together](https://github.com/TaheraScript/Change-Together)
- ⚡ **Express.js:** [expressjs.com](https://expressjs.com/)
- 🍃 **MongoDB:** [mongodb.com](https://www.mongodb.com/)
- 🔐 **Better Auth:** [better-auth.com](https://www.better-auth.com/)
- 🔑 **jose:** [github.com/panva/jose](https://github.com/panva/jose)

---

**Built with ❤️ to support meaningful community initiatives.**
