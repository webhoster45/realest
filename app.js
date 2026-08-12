require('dotenv').config();
const express=require('express');
const path=require('path');
const jwt=require('jsonwebtoken');
const cors=require('cors');
const mongoose=require('mongoose');
const PORT=process.env.PORT || 3000;
const MONGODB_URL=process.env.MONGODB_URL;
const JWT_SECERT=process.env.JWT_SECERT;
const Schema=mongoose.Schema;
const bcrypt=require('bcrypt');
const Redis=require('redis');

// const redisclient=new Redis({
// host: '127.0.0.1',
//   port: 6379,
//   keepAlive: 10000, // Sends a ping every 10 seconds to keep connection alive
//   maxRetriesPerRequest: null,
//   retryStrategy(times) {
//     const delay = Math.min(times * 50, 2000);
//     return delay;
//   }
// })

const { createClient } = require('redis');

const redisclient = createClient({
    // url: 'redis://localhost:6379' // Optional config
});

redisclient.on('error', err => console.log('Redis Client Error', err));

// Note: Node-Redis requires you to connect explicitly
redisclient.connect(); 


const userschema=new Schema({
    username:{type:String,required:true},
    password:{type:String,required:true},
    email:{type:String,required:true}
},{timestamps:true});

const eventschema=new Schema({
    userid:{type:Schema.Types.ObjectId,ref:'User',required:true},
    eventtype:{type:String,required:true},
    page:{type:String,required:true},
    metadata:{type:Object,required:true}
},{timestamps:true})

const User=mongoose.model('User',userschema);
const Event=mongoose.model('Event',eventschema)

const app=express();

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(cors());

mongoose.connect(MONGODB_URL)
.then(()=>{
    console.log('Connected to MongoDB'); app.listen(PORT,()=>{console.log(`App listening on ${PORT}`)});
})
.catch((err)=>{
    console.log(err);
})

function authmiddleware(req,res,next){
try{
 const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  jwt.verify(token,JWT_SECERT,(err,decoded)=>{
    if(err) return res.status(403).json({message:"Invalid token"});
    req.user=decoded;
    next()
  })
}
catch(err){
    console.log(err);
}
}



app.post('/register',async (req,res)=>{
try{
    const {username,password,email}=req.body;
    if(!username || !password || !email) return res.status(400).json({message:"Missing Parameters"});
    const existinguser=await User.findOne({username});
    if(existinguser) return res.status(409).json({message:"User already exists"});
    const hashedpassword=await bcrypt.hash(password,10);
    await User.create({username,password:hashedpassword,email});
    const token=jwt.sign({username},JWT_SECERT);
    return res.status(200).json({message:`User ${username} created successfully`,token});

}
catch(err){
    console.log(err);
}
})

app.post('/login',async(req,res)=>{
  try{
    const {username,password,email}=req.body;
    if(!username || !password) return res.status(400).json({message:"Missing Parameters"});
    const user=await User.findOne({username});
    if(!user) return res.status(404).json({message:"User not found"});
    const match=await bcrypt.compare(password,user.password);
    if(!match) return res.status(400).json({message:"Invalid Username or passoword"});
    const token=jwt.sign({username},JWT_SECERT);
    return res.status(200).json({message:`User ${username} logged in successfully`,token})

  }catch(err){
    console.log(err);
  }
})


app.post('/event',authmiddleware,async (req,res)=>{
    const {eventtype, page, metadata}= req.body;
    const username=req.user;
    const userid=await User.findOne({username}).id;

    const allowedEvents = ['page_view', 'login','logout','file-upload','file-download','search'];
    if (!allowedEvents.includes(eventtype)) {
      throw new Error(`Invalid event type: ${eventType}`);
    }
    if(!eventtype || !page || !metadata) return res.status(400).json({message:"Missing Parameters"});
    
    let totalevents= Number (await redisclient.get('Total events:') )|| 0;
    totalevents += 1;
    await redisclient.set('Total events:',totalevents);

    if(eventtype == 'page_view'){
    let pageview= Number (await redisclient.get('Page views: ') )|| 0;
    pageview += 1;
    await redisclient.set('Page views: ',pageview);
    return res.status(200).json({message:await redisclient.get('Page views: ')})
    }
    else if(eventtype == 'login'){
      let logincount=Number (await redisclient.get('login count:')) || 0;
      logincount += 1;
      await redisclient.pfAdd('logins:',userid);
      await redisclient.set('login count:',logincount);
      return res.status(200).json({'Total logins:':await redisclient.get('login count:'),'Unique logins':await redisclient.pfCount('visitors:2026-08-09')})
    }
    else if(eventtype == 'logout'){
      let logoutcount=Number (await redisclient.get('Logout: ')) || 0;
      logoutcount += 1;
      await redisclient.pfadd('logout count: ',userid);
      await redisclient.set('logout count: ',logoutcount);
    }
    else if(eventtype == 'file-upload'){
      let fileuploadcount=Number (await redisclient.get('file upload count:')) || 0;
      fileuploadcount += 1;
      await redisclient.set('file upload count:',fileuploadcount);
    }
    else if(eventtype == 'file-download'){
      let filedownloadcount=Number (await redisclient.get('file download count:')) || 0;
      filedownloadcount += 1;
      await redisclient.set('file download count:',filedownloadcount);
    }
    else if(eventtype == 'search'){
      let searchcount=Number (await redisclient.get('search count: ')) || 0;
      searchcount += 1;
      await redisclient.set('search count: ',searchcount);
    }
    else{
      return res.status(400).json({message:`${eventtype} not supported`});

    }

})