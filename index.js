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

server.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((data) => {
      res.status(200).send(data);
    });
});

server.post("/participants", (req, res) => {
  const { name } = req.body;

  if (!name || name.length === 0) {
    res.status(400).send("Nome de usuário é obrigatório");
  } else {

      db.collection("participants").insertOne({ name });
      res.status(201).send("Login realizado com sucesso");
  }

});

server.listen(5000, () => console.log(chalk.yellow("listening on port 5000")));
