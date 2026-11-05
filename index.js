import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
    throw err;
  }
}
const mongoclient = await connectToMongoDB();
const db = mongoclient.db("change-together");
const createEventCollection = db.collection("create-event");
const joinCollection = db.collection("event-joins");

const todayString = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const idCandidates = (value) => {
  const id = String(value ?? "");
  const candidates = [id];
  if (ObjectId.isValid(id)) candidates.push(new ObjectId(id));
  return candidates;
};
const idFilter = (value) => ({ _id: { $in: idCandidates(value) } });

const EVENT_TYPES = [
  "Cleanup",
  "Plantation",
  "Donation",
  "Winter Relief",
  "Food Drive",
  "Health Camp",
  "Education",
  "Community Support",
];

const EVENT_LIMITS = {
  title: 120,
  location: 160,
  description: 700,
  thumbnailUrl: 2048,
};

const EDITABLE_EVENT_FIELDS = [
  "title",
  "description",
  "type",
  "thumbnailUrl",
  "location",
  "date",
];

const isValidEventImageUrl = (value) => {
  const url = String(value ?? "").trim();
  if (!url) return false;
  if (url.length > EVENT_LIMITS.thumbnailUrl) return false;
  return /^https?:\/\/.+/i.test(url) || url.startsWith("/");
};

const validateEventFields = (data, { partial = false } = {}) => {
  const errors = {};
  const provided = (field) => Object.prototype.hasOwnProperty.call(data, field);
  const shouldCheck = (field) => !partial || provided(field);
  const text = (field) =>
    typeof data[field] === "string" ? data[field].trim() : "";

  const checkText = (field, label, min, max) => {
    if (!shouldCheck(field)) return;
    const value = text(field);
    if (!value) {
      errors[field] = `${label} is required.`;
    } else if (value.length < min) {
      errors[field] = `${label} must be at least ${min} characters.`;
    } else if (value.length > max) {
      errors[field] = `${label} must be ${max} characters or fewer.`;
    }
  };

  checkText("title", "Title", 5, EVENT_LIMITS.title);
  checkText("location", "Location", 3, EVENT_LIMITS.location);
  checkText("description", "Description", 20, EVENT_LIMITS.description);

  if (shouldCheck("type") && !EVENT_TYPES.includes(text("type"))) {
    errors.type = "Choose a valid event type.";
  }

  if (shouldCheck("thumbnailUrl")) {
    const value = text("thumbnailUrl");
    if (!value) {
      errors.thumbnailUrl = "Thumbnail image URL is required.";
    } else if (!isValidEventImageUrl(value)) {
      errors.thumbnailUrl =
        "Use a valid image link starting with http(s):// or an image path.";
    }
  }

  if (shouldCheck("date")) {
    const date = text("date");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(new Date(`${date}T00:00:00`).getTime())
    ) {
      errors.date = "Choose a valid event date.";
    } else if (date <= todayString()) {
      errors.date = "The event date must be in the future.";
    }
  }
  return errors;
};

const pickEditableFields = (data) => {
  const update = {};
  for (const field of EDITABLE_EVENT_FIELDS) {
    if (typeof data[field] === "string") update[field] = data[field].trim();
  }
  return update;
};

const userFromToken = (payload = {}) => ({
  id: typeof payload.sub === "string" ? payload.sub : "",
  email: normalizeEmail(payload.email),
  name: typeof payload.name === "string" ? payload.name.trim() : "",
  image: typeof payload.image === "string" ? payload.image : null,
});

const isOrganizer = (event, email) =>
  Boolean(event?.organizerEmail) &&
  normalizeEmail(event.organizerEmail) === normalizeEmail(email);

const serializeEvent = (event, joinCount = 0) => ({
  ...event,
  _id: event._id.toString(),
  organizerEmail: event.organizerEmail || "Change Together community",
  joinCount,
});
async function getJoinCounts(eventIds) {
  if (eventIds.length === 0) return new Map();

  const counts = await joinCollection
    .aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ])
    .toArray();

  return new Map(counts.map((item) => [item._id, item.count]));
}
await joinCollection.createIndex(
  { eventId: 1, "user.email": 1 },
  { unique: true, name: "unique_event_user" },
);
await createEventCollection.createIndex({ date: 1 });

const JWKS_URL =
  process.env.JWKS_URL || `${process.env.CLIENT_URL}/api/auth/jwks`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "You are not authorized to access this resource." });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: "You are not authorized to access this resource." });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    const user = userFromToken(payload);
    if (!user.email) {
      return res
        .status(401)
        .json({ message: "You are not authorized to access this resource." });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Token validation failed:", error);
    return res
      .status(401)
      .json({ message: "You are not authorized to access this resource." });
  }
};

const optionalToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(" ")[1] : null;
  if (!token) return next();

  try {
    const { payload } = await jwtVerify(token, JWKS);
    const user = userFromToken(payload);
    if (user.email) req.user = user;
  } catch (error) {
    console.error("Optional token validation failed:", error);
  }
  next();
};

app.post("/create-event", verifyToken, async (req, res) => {
  const data = req.body ?? {};
  if (typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({ message: "Invalid request body." });
  }

  const errors = validateEventFields(data);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Invalid event details.", errors });
  }

  const event = {
    ...pickEditableFields(data),
    organizerEmail: req.user.email,
    createdAt: new Date().toISOString(),
  };

  const result = await createEventCollection.insertOne(event);
  res.status(201).json({
    insertedId: result.insertedId.toString(),
    event: serializeEvent({ ...event, _id: result.insertedId }),
  });
});

app.get("/upcoming-events", async (req, res) => {
  const events = await createEventCollection
    .find({ date: { $gte: todayString() } })
    .sort({ date: 1, createdAt: 1 })
    .toArray();

  const joinCounts = await getJoinCounts(
    events.map((event) => event._id.toString()),
  );

  res.send(
    events.map((event) =>
      serializeEvent(event, joinCounts.get(event._id.toString()) ?? 0),
    ),
  );
});

app.get("/events/:id", async (req, res) => {
  const event = await createEventCollection.findOne(idFilter(req.params.id));
  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }

  const joinCount = await joinCollection.countDocuments({
    eventId: event._id.toString(),
  });
  res.send(serializeEvent(event, joinCount));
});

app.get("/events/:id/join", optionalToken, async (req, res) => {
  const event = await createEventCollection.findOne(idFilter(req.params.id));
  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }

  const id = event._id.toString();
  const joinCount = await joinCollection.countDocuments({ eventId: id });

  if (!req.user?.email) {
    return res.send({ joined: false, joinCount, joinedAt: null });
  }

  const join = await joinCollection.findOne({
    eventId: id,
    "user.email": req.user.email,
  });

  res.send({
    joined: Boolean(join),
    joinCount,
    joinedAt: join?.joinedAt ?? null,
  });
});

app.post("/events/:id/join", verifyToken, async (req, res) => {
  const event = await createEventCollection.findOne(idFilter(req.params.id));
  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }

  if (event.date < todayString()) {
    return res
      .status(400)
      .json({ message: "This event has already taken place." });
  }

  const { email, name, image } = req.user;
  const id = event._id.toString();
  const joinedAt = new Date().toISOString();
  const member = {
    email,
    displayName: name || email.split("@")[0],
    photoURL: image,
  };

  try {
    await joinCollection.insertOne({
      eventId: id,
      user: member,
      event: {
        _id: id,
        title: event.title,
        description: event.description,
        type: event.type,
        thumbnailUrl: event.thumbnailUrl,
        location: event.location,
        date: event.date,
        organizerEmail: event.organizerEmail,
      },
      joinedAt,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const joinCount = await joinCollection.countDocuments({ eventId: id });
      return res.status(409).json({
        message: "You have already joined this event.",
        joined: true,
        alreadyJoined: true,
        joinCount,
      });
    }
    throw error;
  }

  const joinCount = await joinCollection.countDocuments({ eventId: id });
  res.status(201).json({ joined: true, joinCount, joinedAt });
});

app.get("/my-events", verifyToken, async (req, res) => {
  const email = req.user.email;

  const joins = await joinCollection.find({ "user.email": email }).toArray();

  if (joins.length === 0) return res.send([]);

  const candidates = joins.flatMap((join) => idCandidates(join.eventId));

  const events = await createEventCollection
    .find({ _id: { $in: candidates } })
    .toArray();

  const eventsById = new Map(
    events.map((event) => [event._id.toString(), event]),
  );
  const joinCounts = await getJoinCounts([...eventsById.keys()]);

  const joinedEvents = joins
    .map((join) => {
      const event = eventsById.get(String(join.eventId));
      if (!event) return null;
      return {
        event: serializeEvent(event, joinCounts.get(event._id.toString()) ?? 0),
        joinedAt: join.joinedAt,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.event.date.localeCompare(b.event.date) ||
        String(b.joinedAt).localeCompare(String(a.joinedAt)),
    );

  res.send(joinedEvents);
});

app.patch("/events/:id", verifyToken, async (req, res) => {
  const data = req.body ?? {};
  if (typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({ message: "Invalid request body." });
  }

  const errors = validateEventFields(data, { partial: true });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Invalid event details.", errors });
  }

  const update = pickEditableFields(data);
  if (Object.keys(update).length === 0) {
    return res
      .status(400)
      .json({ message: "No editable fields were provided." });
  }

  const event = await createEventCollection.findOne(idFilter(req.params.id));
  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }

  if (!isOrganizer(event, req.user.email)) {
    return res
      .status(403)
      .json({ message: "You can only change events you created." });
  }

  await createEventCollection.updateOne(idFilter(req.params.id), {
    $set: update,
  });
  const updated = await createEventCollection.findOne(idFilter(req.params.id));
  const joinCount = await joinCollection.countDocuments({
    eventId: event._id.toString(),
  });
  res.send(serializeEvent(updated, joinCount));
});

app.delete("/events/:id", verifyToken, async (req, res) => {
  const event = await createEventCollection.findOne(idFilter(req.params.id));
  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }

  if (!isOrganizer(event, req.user.email)) {
    return res
      .status(403)
      .json({ message: "You can only cancel events you created." });
  }

  await createEventCollection.deleteOne(idFilter(req.params.id));
  await joinCollection.deleteMany({ eventId: event._id.toString() });
  res.send({ deleted: true });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  const message =
    status >= 500 ? "Something went wrong on the server." : err.message;
  res.status(status).json({ message });
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

export default app;
