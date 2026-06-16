const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

// jw key set ||JWKS
const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

// common middleware for verify token||jwt
const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  // console.log(authHeader);
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Unauthorized: you are not logged in" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: "Unauthorized: you are not logged in" });
  }
  // console.log(token);

  // Verify
  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Forbidden:Token validation failed" });
  }
};

async function run() {
  try {
    await client.connect();

    // create database
    const db = client.db("booknook");
    const roomCollection = db.collection("rooms");
    const bookingsCollection = db.collection("bookings");

    // create GET API
    // app.get("/room", async (req, res) => {
    //   const result = await roomCollection.find().toArray();
    //   res.json(result);
    // });

    // create post API
    app.post("/room", verifyToken, async (req, res) => {
      const roomData = req.body;
      console.log(roomData);
      const result = await roomCollection.insertOne(roomData);

      res.json(result);
    });

    // create GET API for single id, for details page || middleWare
    app.get("/room/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await roomCollection.findOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    // Create PATCH API for edit details page information
    app.patch("/room/:id", verifyToken, async (req, res) => {
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
    app.delete("/room/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await roomCollection.deleteOne({ _id: new ObjectId(id) });

      res.json(result);
    });

    // Create GET API for booking data collection
    app.get("/booking/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;

      const result = await bookingsCollection
        .find({ userId: userId })
        .toArray();
      res.json(result);
    });

    // Create POST API for booking data collection
    app.post("/booking", verifyToken, async (req, res) => {
      const bookingData = req.body;

      // Booking conflict

      const { roomId, date, startTime, endTime } = bookingData;
      const conflict = await bookingsCollection.findOne({
        roomId,
        date,
        $and: [
          { startTime: { $lt: endTime } },
          { endTime: { $gt: startTime } },
        ],
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: "Time slot already booked",
        });
      }

      // ***
      const result = await bookingsCollection.insertOne(bookingData);

      res.json(result);
    });

    // Create DELETE API for booking data collection
    app.delete("/booking/:bookingId", verifyToken, async (req, res) => {
      const { bookingId } = req.params;
      const result = await bookingsCollection.deleteOne({
        _id: new ObjectId(bookingId),
      });

      res.json(result);
    });

    // ************* for rooms & my-listings combined  & search****
    app.get("/room", async (req, res) => {
      try {
        const email = req.query.email;
        const search = req.query.search;
        const amenities = req.query.amenities;

        let query = {};
        if (email && email !== "undefined") {
          query = { email: email };
        }
        // ***
        if (search) {
          query.roomName = { $regex: search, $options: "i" };
        }

        if (amenities) {
          const amenitiesArray = amenities.split(",");
          query.amenities = { $in: amenitiesArray };
        }
        // ***
        const result = await roomCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        console.error("GET Room Error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
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
