const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

// mongodb related operations start from here

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nn0l6mi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
    // collections
    const usersCollection = client.db("TuneCamp").collection("users");
    const classesCollection = client.db("TuneCamp").collection("classes");
    const selectClassesCollection = client.db("TuneCamp").collection("selectClasses");
    const paymentCollection = client.db("TuneCamp").collection("paymentClasses");

    //  jwt post
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // users apis
    // user post operations
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // user get
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // instructors apis
    app.get("/users/instructor", async (req, res) => {
      const query = { role: "instructor" };
      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // get 6 instructor
    app.get("/users/6instructor", async (req, res) => {
      const query = { role: "instructor" };
      const result = await usersCollection.find(query).limit(6).toArray();
      res.send(result);
    });
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      // console.log(email)
      const user = await usersCollection.findOne(query);
      res.send(user);
    });
    app.get("/users/instructor/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      // console.log(email)
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // instructor
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
          
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Add Classes related apis
    app.post("/addClasses", async (req, res) => {
      const classes = req.body;
      const result = await classesCollection.insertOne(classes);
      res.send(result);
    });
    //  get classes apis
    app.get("/addClasses", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });
    app.get("/addClasses/myClass", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    // classes approved operations
    app.patch("/addClasses/approved/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/addClasses/denied/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "denied",
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get approved classes
    app.get("/addClasses/approved", async (req, res) => {
      const query = { status: "approved" };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    // feedback for myClass
    app.put('/addClasses/feedback', async(req, res) =>{
      const updateClasses = req.body;
      const toyInfo ={
        $set:{
               feedback: updateClasses.feedback
        }
      }
      const result = await toysCollection.updateOne(filter, toyInfo, options)
      res.send(result)
    })

    // select class related apis
    app.post("/selectClasses", async (req, res) => {
      const classes = req.body;
      // console.log(classes);
      const result = await selectClassesCollection.insertOne(classes);
      res.send(result);
    });

    app.get("/selectClasses", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await selectClassesCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/selectClasses/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await selectClassesCollection.deleteOne(query);
      res.send(result);
    });

    // payment related apis
    // payment-intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      console.log(price, amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post('/payments', async(req, res)=>{
      const payment = req.body;
      const result= await paymentCollection.insertOne(payment);
      res.send(result)

    })
    app.get('/payments', async(req, res)=>{
      const result = await paymentCollection.find().toArray();
      res.send(result);
    })
    app.get('/payments/6Classes', async(req, res)=>{
      const result = await paymentCollection.find().limit(6).toArray();
      res.send(result);
    })


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("tuneCamp is running");
});

app.listen(port, () => {
  console.log(`TuneCamp is running on${port}`);
});
