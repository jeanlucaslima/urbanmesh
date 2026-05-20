import express from "express";
import cors from "cors";
import http from "node:http";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";

const PORT = 5000;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "graphql-gateway" }));

const httpServer = http.createServer(app);
const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.use("/graphql", expressMiddleware(server));

httpServer.listen(PORT, "0.0.0.0", () =>
  console.log(`graphql-gateway listening on ${PORT} (/graphql, /health)`)
);
