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
    name: joi.string().required(),
  });
const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required(),
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
        const participantOnline = await db.collection('participants').findOne({ name: req.body.name })
        const validation = userSchema.validate(req.body, { abortEarly: true });
        if(validation.error){res.sendStatus(422); return}
        else if(participantOnline){res.sendStatus(409); return}
        let dateNow= Date.now();
        let dateConvertHour= new Date(dateNow).toTimeString().split(' ')[0]
        let statusMessage={"from": req.body.name, "to": 'Todos', "text": 'entra na sala...', "type": 'status', "time": dateConvertHour}
        let newParticipant = { "name":req.body.name, "lastStatus":dateNow}
        await db.collection('participants').insertOne(newParticipant)
        await db.collection('messages').insertOne(statusMessage)
        res.sendStatus(201)
    }
    catch(error){
        console.error(error);
        res.sendStatus(500);
    }
})

server.get('/messages', async (req,res)=>{
    let limiter = parseInt(req.query.limiter);
    const user = req.headers.user; 
    try{
        const messages =await db.collection('messages').find({$or:[{"to":"Todos"},{"to":user},{"from":user}]}).toArray();
        {limiter<messages.length? res.send(messages.slice(messages.length-limiter).slice(0)):res.send(messages)}
        //res.send(messages.slice(messages.length-10).slice(0)) //..reverse()
        //res.send(messages)
    }
    catch(error){
        console.error(error);
        res.sendStatus(500);
    }
})

server.post('/messages',async (req,res)=>{
    let dateNow= Date.now();
    let dateConvertHour= new Date(dateNow).toTimeString().split(' ')[0]
    try{
        let user_logged = req.headers.user;
        // if (user===null || user===""||user===undefined){res.sendStatus(422);return }
        const participantOnline = await db.collection('participants').findOne({name:user_logged})
        console.log(participantOnline)
        if(participantOnline==null){res.sendStatus(422);console.log("erro1"); return}
        
        const validation = messageSchema.validate(req.body, { abortEarly: true })
        if(validation.error){res.sendStatus(422);console.log("erro2");return}
        let message ={"from":user_logged,...req.body,"time":dateConvertHour}
        await db.collection('messages').insertOne(message)
        
        res.sendStatus(201)
    }
    catch(error){
        console.error(error);
        res.sendStatus(500); 
    }
})

server.post('/status',async (req,res)=>{
    try{
        const user = req.headers.user;
        const participantOnline = await db.collection('participants').findOne({ name: user })
        if(participantOnline==null){res.sendStatus(404); return}
        await db.collection('participants').updateOne({ name: user }, { $set: {lastStatus:Date.now()} });
        res.sendStatus(200)
    }
    catch(error){
        console.error(error);
        res.sendStatus(500); 
    }
})


server.listen(5000, ()=>{console.log("iniciado Server")});