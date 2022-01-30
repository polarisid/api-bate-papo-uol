import express,{json} from 'express';
import cors from 'cors';
import joi from 'joi';
import { MongoClient,ObjectId } from "mongodb";
import dotenv from 'dotenv';
dotenv.config();

const server = express();
server.use(cors());
server.use(json());

const userSchema = joi.object({
    user: joi.string().required(),
  });

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

server.post('/participants',async (req,res)=>{
    try{
        const participantOnline = await db.collection('participants').findOne({ user: req.body.user })
        const validation = userSchema.validate(req.body, { abortEarly: true });
        if(validation.error){res.sendStatus(422); return}
        else if(participantOnline){res.send(409); return}
        let dateNow= Date.now();
        // let dateConvert= `${new Date(dateNow).getHours()}:${new Date(dateNow).getMinutes()}:${new Date(dateNow).getSeconds()}`
        let dateConvertHour= new Date(dateNow).toTimeString().split(' ')[0]
        let statusMessage={"from": req.body.user, "to": 'Todos', "text": 'entra na sala...', "type": 'status', "time": dateConvertHour}
        let newParticipant = { "user":req.body.user, "lastStatus":dateNow}
        await db.collection('participants').insertOne(newParticipant)
        await db.collection('messages').insertOne(statusMessage)
        res.sendStatus(201)
    }
    catch(error){
        console.error(error);
        res.sendStatus(500);
    }
})

server.listen(5000, ()=>{console.log("iniciado Server")});