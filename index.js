import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";
import { stripHtml } from "string-strip-html";
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
  _time: joi.any(),
});

//ENDPOINTS

//GET ALL USERS
server.get("/participants", async (req, res) => {
  try {
    const users = await db.collection("participants").find().toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

//POST NEW USER
server.post("/participants", async (req, res) => {
  const participant = cleanHtml(req.body);

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
    _time: Date.now(),
  };

  try {
    await db.collection("participants").insertOne({
      ...participant,
      lastStatus: Date.now(),
    });

    await db.collection("messages").insertOne({ ...registerUserMessage });
    res.sendStatus(201);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

//GET MESSAGES
server.get("/messages", async (req, res) => {
  const limit = parseInt(cleanHtml(req.query.limit));
  const { user } = cleanHtml(req.headers);

  try {
    const allMessages = await db.collection("messages").find().toArray();
    const validMessages = allMessages.filter(
      (message) =>
        message.from === user ||
        message.to === user ||
        message.to === "Todos" ||
        message.type === "message"
    );
    if (limit === NaN) {
      showMessages = await validMessages;
      return res.sendStatus(201);
    }
    const showMessages = await validMessages.splice(-{ limit });
    return res.send(showMessages).status(201);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.message);
  }
});

//POST NEW MESSAGE
server.post("/messages", async (req, res) => {
  const { user } = cleanHtml(req.headers);

  const userExists = await db
    .collection("participants")
    .findOne({ name: user });

  if (!userExists) {
    return res.status(422).send("User not found");
  }

  const message = {
    ...cleanHtml(req.body),
    from: user,
    time: dayjs().format("HH:mm:ss"),
    _time: Date.now(),
  };

  try {
    await messageSchema.validateAsync(message, { abortEarly: false });
  } catch (error) {
    return res.status(422).send(error.details.map((err) => err.message));
  }

  try {
    await db.collection("messages").insertOne({ ...message });
    return res.sendStatus(201);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

server.delete("/messages/:id", async (req, res) => {
  const { id } = cleanHtml(req.params);

  const { user } = cleanHtml(req.headers);

  const isValidId = ObjectId.isValid(id);

  if (!isValidId) {
    return res.sendStatus(404);
  }

  let message;

  try {
    message = await db.collection("messages").findOne({ _id: ObjectId(id) });
  } catch (error) {
    return res.status(404).send(message.error);
  }

  if (!message) {
    return res.sendStatus(404);
  }

  if (message.from !== user) {
    return res.sendStatus(401);
  }

  try {
    await db.collection("messages").deleteOne({ _id: ObjectId(id) });
    return res.sendStatus(200);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

//POST STATUS
server.post("/status", async (req, res) => {
  const { user } = cleanHtml(req.headers);

  const foundUser = await db.collection("participants").findOne({ name: user });
  console.log(foundUser);

  if (!foundUser) {
    return res.sendStatus(404);
  }

  await db.collection("participantes").updateOne(
    {
      name: user,
    },
    { $set: { lastStatus: Date.now() } }
  );

  return res.sendStatus(200);
});

(function checkActiveUsers() {
  setInterval(async () => {
    await db
      .collection("participantes")
      .find()
      .forEach(async (user) => {
        if (Date.now() - user.lastStatus >= 10000) {
          const deletedUser = await db.collection("participants").deleteOne({
            name: user.name,
          });
          if (deletedUser.deletedCount === 1) {
            const deletedMessage = {
              from: user.name,
              to: "Todos",
              text: "sai da sala...",
              type: "status",
              time: dayjs().format("HH:mm:ss"),
              _time: Date.now(),
            };

            await db.collection("messages").insertOne({
              ...deletedMessage,
            });
          } else console.log("Usuário não deletado");
        }
      });
  }, 15000);
})();

function cleanHtml(obj) {
  if (typeof obj === "object") {
    for (let key in obj) {
      try {
        obj[key] = stripHtml(obj[key]).result.trim();
      } catch (err) {
        break;
      }
    }
    return obj;
  }

  if (typeof obj === "string") {
    return stripHtml(obj).result.trim();
  }
}

server.listen(5000, () => console.log(chalk.yellow("listening on port 5000")));