import express,{json} from 'express';
import cors from 'cors';
import joi from 'joi';
import { MongoClient,ObjectId } from "mongodb";
import dotenv from 'dotenv';
dotenv.config();

const server = express();
server.use(cors());
server.use(json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect(() => {
  db =  mongoClient.db("batepapouol");
});

server.get('/participants',async (req,res)=>{
    try{
        const peoples = await db.collection('participants').find({}).toArray();
        res.send(peoples);
    }
    catch(error){
        console.error(error);
        res.sendStatus(500);
    }
})

server.listen(5000, ()=>{console.log("iniciado Server")});