const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();

const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // create database
    const db = client.db("booknook");
    const roomCollection = db.collection("rooms");
    const bookingsCollection = db.collection("bookings");

    // create GET API
    app.get("/room", async (req, res) => {
      const result = await roomCollection.find().toArray();
      res.json(result);
    });

    // create post API
    app.post("/room", async (req, res) => {
      const roomData = req.body;
      console.log(roomData);
      const result = await roomCollection.insertOne(roomData);

      res.json(result);
    });

    // create GET API for single id, for details page
    app.get("/room/:id", async (req, res) => {
      const { id } = req.params;

      const result = await roomCollection.findOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    // Create PATCH API for edit details page information
    app.patch("/room/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const result = await roomCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData },
      );

      res.json(result);
    });

    // create Delete API for delete any Specific room
    app.delete("/room/:id", async (req, res) => {
      const { id } = req.params;
      const result = await roomCollection.deleteOne({ _id: new ObjectId(id) });

      res.json(result);
    });

    // Create POST API for booking data collection
    app.post("/booking", async (req, res) => {
      const bookingData = req.body;
      const result = await bookingsCollection.insertOne(bookingData);

      res.json(result);
    });

    // ******************---------***********
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine....!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
