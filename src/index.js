import express,{json} from 'express';
import { stripHtml } from "string-strip-html";
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
        let username= stripHtml(req.body.name).result
        const participantOnline = await db.collection('participants').findOne({ name: username })
        const validation = userSchema.validate(req.body, { abortEarly: true });
        if(validation.error){res.sendStatus(422); return}
        else if(participantOnline){res.sendStatus(409); return}
        let dateNow= Date.now();
        let dateConvertHour= new Date(dateNow).toTimeString().split(' ')[0]
        let statusMessage={"from": username, "to": 'Todos', "text": 'entra na sala...', "type": 'status', "time": dateConvertHour}
        let newParticipant = { "name":username, "lastStatus":dateNow}
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
        if(participantOnline==null){res.sendStatus(422);return}
        const validation = messageSchema.validate(req.body, { abortEarly: true })
        if(validation.error){res.sendStatus(422);return}
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
server.delete('/messages/:id',async (req,res)=>{
    let user = req.headers.user
    let id =(req.params.id)
    try{
        const messages =await db.collection('messages').find({$and:[{_id:new ObjectId(id)},{from:user}]}).toArray();
        
        if(messages===null||messages===undefined||messages===[]){
            let msg=await db.collection('messages').find({_id:new ObjectId(id)}).toArray();
            if(msg){res.sendStatus(401);return}  
            res.sendStatus(404);
            return;
        }
        await db.collection('messages').deleteOne({$and:[{_id:new ObjectId(id)},{from:user}]})
    }catch(error){
        console.error(error);
        res.sendStatus(500);
    }

})

setInterval(()=>findAbsent(),15000);
async function findAbsent(){
    try{
    let dateNow= Date.now();
    let dateConvertHour= new Date(dateNow).toTimeString().split(' ')[0]
    let statusMessage={"to": 'Todos', "text": 'sai da sala...', "type": 'status', "time": dateConvertHour}
    let timeCut = parseInt(Date.now())-10000
    const usersOff =await db.collection('participants').find({lastStatus: {$lt:timeCut}}).toArray();
    await usersOff.map((item)=>{ db.collection('messages').insertOne({"from": item.name, ...statusMessage})})
    await db.collection('participants').deleteMany({ lastStatus: {$lt:timeCut} })
    
    // let statusMessage={"from": username, "to": 'Todos', "text": 'entra na sala...', "type": 'status', "time": dateConvertHour}
    }catch(error){
        console.error(error);
        res.sendStatus(500); 
    }

}


server.listen(5000, ()=>{console.log("iniciado Server")});