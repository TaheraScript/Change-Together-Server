 Server README.md (paste into the Express project root):

  # Change Together — Events API

    The Express + MongoDB backend for **Change Together**. It stores community
    events and volunteer joins, and exposes a small REST API that the Next.js
    client reads from as a fallback when the app's own database routes are
    unavailable.

    **Base URL (local):** http://localhost:5000

    ## ✨ What it does

    - **Creates, updates and deletes events** — writes are protected by a 
  Better
      Auth JWT, and only the organiser (`organizerEmail` from the verified 
  token)
      can change or cancel their own event.
    - **Lists upcoming events** — every event whose date is today or later, 
  sorted
      by date.
    - **Stores joins** — a join is saved with a snapshot of both the user and 
  the
      event, guarded by a unique `{eventId, user.email}` index so a volunteer 
  can
      join an event only once.
    - **Returns a user's joined events** — all events a signed-in volunteer 
  joined,
      sorted by event date.
    - **Validates everything server-side** — title, description, type, 
  location,
      thumbnail URL and a strictly future event date.

    ## 🛠 Tech stack

    - **Express** (REST API)
    - **MongoDB** (native driver, `change-together` database)
    - **JWT verification** with `jose` against the client's JWKS
    - **JavaScript**

    ## 📜 Endpoints

    | Method | Endpoint | Auth | Description |
    | --- | --- | --- | --- |
    | POST | `/create-event` | JWT | Create an event |
    | GET | `/upcoming-events` | Public | All upcoming events |
    | GET | `/events/:id` | Public | A single event + join count |
    | GET | `/events/:id/join` | Optional | Join count (+ your join status 
  when signed in) |
    | POST | `/events/:id/join` | JWT | Join an event |
    | GET | `/my-events` | JWT | Events you joined, sorted by date |
    | PATCH | `/events/:id` | JWT | Update your event |
    | DELETE | `/events/:id` | JWT | Cancel your event |

    Protected routes expect `Authorization: Bearer <JWT>` issued by the 
  Next.js
    app's Better Auth `jwt()` plugin. Tokens are verified against the client's
    JWKS (signature, expiry, issuer, audience).

    ## 🚀 Getting started

    ```bash
    npm install
    node index.js   # or: npm run dev
    ```

    ### Environment variables

    Create a `.env` with:

    ```bash
    MONGODB_URI=your-mongodb-connection-string
    PORT=5000

    # JWKS of the Next.js client (defaults to
  http://localhost:3000/api/auth/jwks)
    JWKS_URL=http://localhost:3000/api/auth/jwks
    ```

    ## 🔐 Notes

    - The API shares the `change-together` database with the client, using the
      `create-event` and `event-joins` collections.
    - CORS is enabled so the Next.js client can call the API from a different
      origin.




  One thing to fix before you publish: both files use
  https://your-live-site.vercel.app as the live URL placeholder — swap in your
   actual deployed client URL (the server README intentionally shows the local
   base URL, since the Express API usually isn't public).

❯ give for server side to add on readme.md file 

✻ Thought for 1 second [ctrl+o to expand]

⠶ Here's the server-side README.md — copy the whole block into the Express
  project's README.md:

  # Change Together — Events API

    The Express + MongoDB backend for **Change Together**. It stores community
    events and volunteer joins, and exposes a small REST API that the Next.js
    client reads from as a fallback when the app's own database routes are
    unavailable.

    **Base URL (local):** http://localhost:5000

    ## ✨ What it does

    - **Creates, updates and deletes events** — writes are protected by a 
  Better
      Auth JWT, and only the organiser (`organizerEmail` from the verified 
  token)
      can change or cancel their own event.
    - **Lists upcoming events** — every event whose date is today or later, 
  sorted
      by date.
    - **Stores joins** — a join is saved with a snapshot of both the user and 
  the
      event, guarded by a unique `{eventId, user.email}` index so a volunteer 
  can
      join an event only once.
    - **Returns a user's joined events** — all events a signed-in volunteer 
  joined,
      sorted by event date.
    - **Validates everything server-side** — title, description, type, 
  location,
      thumbnail URL and a strictly future event date.

    ## 🛠 Tech stack

    - **Express** (REST API)
    - **MongoDB** (native driver, `change-together` database)
    - **JWT verification** with `jose` against the client's JWKS
    - **JavaScript**

    ## 📜 Endpoints

    | Method | Endpoint | Auth | Description |
    | --- | --- | --- | --- |
    | POST | `/create-event` | JWT | Create an event |
    | GET | `/upcoming-events` | Public | All upcoming events |
    | GET | `/events/:id` | Public | A single event + join count |
    | GET | `/events/:id/join` | Optional | Join count (+ your join status 
  when signed in) |
    | POST | `/events/:id/join` | JWT | Join an event |
    | GET | `/my-events` | JWT | Events you joined, sorted by date |
    | PATCH | `/events/:id` | JWT | Update your event |
    | DELETE | `/events/:id` | JWT | Cancel your event |

    Protected routes expect `Authorization: Bearer <JWT>` issued by the 
  Next.js
    app's Better Auth `jwt()` plugin. Tokens are verified against the client's
    JWKS (signature, expiry, issuer, audience).

    ## 🚀 Getting started

    ```bash
    npm install
    node index.js   # or: npm run dev
    ```

    ### Environment variables

    Create a `.env` with:

    ```bash
    MONGODB_URI=your-mongodb-connection-string
    PORT=5000

    # JWKS of the Next.js client (defaults to
  http://localhost:3000/api/auth/jwks)
    JWKS_URL=http://localhost:3000/api/auth/jwks
    ```

    ## 🔐 Notes

    - The API shares the `change-together` database with the client, using the
      `create-event` and `event-joins` collections.
    - CORS is enabled so the Next.js client can call the API from a different
      origin.

