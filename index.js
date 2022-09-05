import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";
import chalk from "chalk";
import dotenv from "dotenv";
dotenv.config();

//CONFIGURATIONS
const server = express();
server.use(cors());
server.use(json());

//DATABASE CONNECTION
const mongoClient = new MongoClient(process.env.MONGO_URI);

let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("batepapoUol");
});

const userSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  from: joi.string().required(),
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().required(),
  time: joi.any(),
});

//ENDPOINTS
server.get("/participants", async (req, res) => {
  try {
    const users = await db.collection("participants").find().toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

server.post("/participants", async (req, res) => {
  const participant = req.body;

  console.log(participant);

  try {
    await userSchema.validateAsync(participant), { abortEarly: false };
  } catch (error) {
    res.status(422).send(error.details.map((err) => err.message));
    return;
  }

  const user = await db
    .collection("participants")
    .findOne({ name: participant.name });

  if (user) {
    return res.status(409).send("User already exists");
  }

  const registerUserMessage = {
    from: participant.name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss"),
  };

  try {
    await db.collection("participants").insertOne({
      ...participant,
      lastStatus: Date.now(),
    });
    res.sendStatus(201);
  } catch (error) {
    res.status(500).send(error.message);
  }
  /* if (!name) {
    res.sendStatus(422);
  }
  const response = await db
    .collection("participants")
    .insertOne({ name, lastStatus: Date.now() });

  res.status(201).send(`Login realizado com sucesso. Bem-vindo(a), ${name}!`); */
});

server.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);

  try {
    if (limit) {
      const messages = await db
        .collection("messages")
        .find({ limit, sort: { time: -1 } })
        .toArray();
      res.send([...messages].reverse());
    }

    const messages = await db.collection("messages").find().toArray();
    res.send(messages);
    
  } catch (error) {
    res.status(500).send(error.message);
  }
});

server.post("/messages", async (req, res) => {
  const { user } = req.headers;
  const message = {
    ...req.body,
    from: user,
    time: dayjs().format("HH:mm:ss"),
  };

  try {
    await messageSchema.validateAsync(message, { abortEarly: false });
  } catch (error) {
    return res.status(422).send(error.details.map((err) => err.message));
  }

  try {
    await db.collection("messages").insertOne({ ...message });
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(500);
  }
});

server.listen(5000, () => console.log(chalk.yellow("listening on port 5000")));
