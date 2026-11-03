import express from 'express';
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const mongoclient = await connectToMongoDB()
const db = mongoclient.db('change-together')
const createEventCollection = db.collection('create-event')
const joinCollection = db.collection('event-joins')

/* `date` is stored as YYYY-MM-DD, so a string comparison works. */
const todayString = () => {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const toObjectId = (value) => (ObjectId.isValid(value) ? new ObjectId(value) : null)

const serializeEvent = (event, joinCount = 0) => ({
  ...event,
  _id: event._id.toString(),
  organizerEmail: event.organizerEmail || 'Change Together community',
  joinCount,
})

async function getJoinCounts(eventIds) {
  if (eventIds.length === 0) return new Map()

  const counts = await joinCollection
    .aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ])
    .toArray()

  return new Map(counts.map((item) => [item._id, item.count]))
}

// Make sure a user can join the same event only once.
await joinCollection.createIndex(
  { eventId: 1, 'user.email': 1 },
  { unique: true, name: 'unique_event_user' },
)
await createEventCollection.createIndex({ date: 1 })

app.post('/create-event', async (req, res) => {
  const data = req.body ?? {}
  const requiredFields = [
    'title',
    'description',
    'type',
    'thumbnailUrl',
    'location',
    'date',
    'organizerEmail',
  ]
  const missingFields = requiredFields.filter(
    (field) => typeof data[field] !== 'string' || !data[field].trim(),
  )

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(', ')}`,
    })
  }

  const event = {
    title: data.title.trim(),
    description: data.description.trim(),
    type: data.type.trim(),
    thumbnailUrl: data.thumbnailUrl.trim(),
    location: data.location.trim(),
    date: data.date,
    organizerEmail: normalizeEmail(data.organizerEmail),
    createdAt: new Date().toISOString(),
  }

  const result = await createEventCollection.insertOne(event)
  res.status(201).json({
    insertedId: result.insertedId.toString(),
    event: serializeEvent({ ...event, _id: result.insertedId }),
  })
})

app.get('/upcoming-events', async (req, res) => {
  const events = await createEventCollection
    .find({ date: { $gte: todayString() } })
    .sort({ date: 1, createdAt: 1 })
    .toArray()

  const joinCounts = await getJoinCounts(events.map((event) => event._id.toString()))

  res.send(
    events.map((event) =>
      serializeEvent(event, joinCounts.get(event._id.toString()) ?? 0),
    ),
  )
})

app.get('/events/:id', async (req, res) => {
  const eventId = toObjectId(req.params.id)
  if (!eventId) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  const event = await createEventCollection.findOne({ _id: eventId })
  if (!event) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  const joinCount = await joinCollection.countDocuments({
    eventId: eventId.toString(),
  })
  res.send(serializeEvent(event, joinCount))
})

app.get('/events/:id/join', async (req, res) => {
  const eventId = toObjectId(req.params.id)
  if (!eventId) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  const event = await createEventCollection.findOne({ _id: eventId })
  if (!event) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  const id = eventId.toString()
  const email = normalizeEmail(req.query.email)
  const joinCount = await joinCollection.countDocuments({ eventId: id })

  if (!email) {
    return res.send({ joined: false, joinCount })
  }

  const join = await joinCollection.findOne({ eventId: id, 'user.email': email })
  res.send({
    joined: Boolean(join),
    joinCount,
    joinedAt: join?.joinedAt ?? null,
  })
})

app.post('/events/:id/join', async (req, res) => {
  const eventId = toObjectId(req.params.id)
  if (!eventId) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  const event = await createEventCollection.findOne({ _id: eventId })
  if (!event) {
    return res.status(404).json({ message: 'Event not found.' })
  }

  if (event.date < todayString()) {
    return res.status(400).json({ message: 'This event has already taken place.' })
  }

  const user = req.body?.user
  const email = normalizeEmail(user?.email)
  if (!email) {
    return res.status(401).json({ message: 'Log in to join this event.' })
  }

  const id = eventId.toString()
  const joinedAt = new Date().toISOString()
  const member = {
    email,
    displayName:
      typeof user?.displayName === 'string' && user.displayName.trim()
        ? user.displayName.trim()
        : email.split('@')[0],
    photoURL: typeof user?.photoURL === 'string' ? user.photoURL : null,
  }

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
    })
  } catch (error) {
    if (error?.code === 11000) {
      const joinCount = await joinCollection.countDocuments({ eventId: id })
      return res.status(409).json({
        message: 'You have already joined this event.',
        joined: true,
        joinCount,
      })
    }
    throw error
  }

  const joinCount = await joinCollection.countDocuments({ eventId: id })
  res.status(201).json({ joined: true, joinCount, joinedAt })
})

app.get('/my-events', async (req, res) => {
  const email = normalizeEmail(req.query.email)
  if (!email) {
    return res.status(400).json({ message: 'An email address is required.' })
  }

  const joins = await joinCollection
    .find({ 'user.email': email })
    .sort({ joinedAt: -1 })
    .toArray()

  if (joins.length === 0) return res.send([])

  const objectIds = joins
    .map((join) => toObjectId(join.eventId))
    .filter((id) => id !== null)

  const events = await createEventCollection
    .find({ _id: { $in: objectIds }, date: { $gte: todayString() } })
    .sort({ date: 1 })
    .toArray()

  const eventsById = new Map(events.map((event) => [event._id.toString(), event]))
  const joinCounts = await getJoinCounts([...eventsById.keys()])

  const joinedEvents = joins
    .map((join) => {
      const event = eventsById.get(join.eventId)
      if (!event) return null
      return {
        event: serializeEvent(event, joinCounts.get(join.eventId) ?? 0),
        joinedAt: join.joinedAt,
      }
    })
    .filter(Boolean)

  res.send(joinedEvents)
})

app.patch('/events/:id',async(req,res)=>{
  const id = req.params.id
  const updateData = req.body

  const result = await createEventCollection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateData}
  )
  res.send(result)
})

app.get('/events/:id',async(req,res)=>{
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const result = await createEventCollection.findOne(query)
   res.send(result)
})

app.delete('/events/:id',async(req,res)=>{
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const result = await createEventCollection.deleteOne(query)
   res.send(result)
})


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use((err, req, res, next) => {
  console.error(err)
  if (res.headersSent) return next(err)
  res.status(500).json({ message: 'Something went wrong on the server.' })
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

export default app