import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import chalk from "chalk";
dotenv.config();

const server = express();
server.use(cors());
server.use(json());

const mongoClient = new MongoClient(process.env.MONGO_URI);

let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("batepapoUol");
});

server.get("/participants", async (req, res) => {
  const response = await db.collection("participants").find().toArray();
  res.send(response);
});

server.post("/participants", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400).send("Nome de usuário é obrigatório");
  }
  const response = await db
    .collection("participants")
    .insertOne({ name, lastStatus: Date.now() });

  res.status(201).send(`Login realizado com sucesso. Bem-vindo(a), ${name}!`);
});

server.listen(5000, () => console.log(chalk.yellow("listening on port 5000")));
