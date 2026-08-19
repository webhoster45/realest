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
    // const logsday = `Unique Users : ${new Date().toDateString()}`;
    const {eventtype, page, metadata,query}= req.body;
    const username=req.user;
    const userid=await User.findOne({username}).id;
    let now=new Date().toDateString();
    


    const allowedEvents = ['page_view', 'login','logout','file-upload','file-download','search'];

    if (!allowedEvents.includes(eventtype)) {
      throw new Error(`Invalid event type: ${eventType}`);
    }

    if(!eventtype || !page || !metadata) return res.status(400).json({message:"Missing Parameters"});

    
    let totalevents= Number (await redisclient.get('Total events:') )|| 0;
    totalevents += 1;
    await redisclient.set('Total events:',totalevents);

    await client.zAdd('Most Active Users', [
      { score: 0, value: username }
    ]);


    await client.zIncrBy('Most Active Users', 1, username);



        await client.zAdd('Popular pages', [
      { score: 0, value: page }
    ]);


    await client.zIncrBy('Popular pages', 1, page);


    
        await client.zAdd('Event rankings', [
      { score: 0, value: eventtype }
    ]);


    await client.zIncrBy('Event rankings', 1, eventtype);

    
    
    ///Active User: event calls returning users events date.now() with the current date.now() and returned number of 300s
     await redisclient.sAdd('active-users',userid);
     const active=await redisclient.sMembers('active-members');
     let filtered=active.filter(a=>{a.createdat - Date.now() > 5000});
     let eventresult=null;
     let liveactivity=null;
     
    if(eventtype == 'page_view'){
    let pageview= Number (await redisclient.get('Page views: ') )|| 0;
    pageview += 1;
    await redisclient.set('Page views: ',pageview);
    eventresult=`Page Views: ${pageview}`;
    await redisclient.sAdd(now,`${username} viewed ${page} `)

    }

    else if(eventtype == 'login'){

      let logincount=Number (await redisclient.get('login count:')) || 0;
      let logsdayLL = `Login Unique Users : ${now}`;
      logincount += 1;
      await redisclient.pfAdd('logins:',userid);
      await redisclient.set('login count:',logincount);
       // const alltimelogins=await pfMerge(logsday)
      let uniquecount=await redisclient.pfCount(logsdayLL);
      eventresult={'Total logins:':await redisclient.get('login count:'),'Today Unique logins':uniquecount}
      //If this doesn't work then switch it to turning it to array then counting it
      await redisclient.sAdd(now,`${username} Logged In `)

    }
    else if(eventtype == 'logout'){

      let logoutcount=Number (await redisclient.get('Logout: ')) || 0;
      let logsdayLO = `Logout Unique Users : ${now}`;
      logoutcount += 1;
      // const unique=await redisclient.pfGet('')
      await redisclient.pfAdd(logsDay1, userid);
      await redisclient.set('logout count: ',logoutcount);
      let uniquecount=await redisclient.pfCount(logsdayLO);
      eventresult={'Total logins:':await redisclient.get('login count:'),'Today Unique logouts: ':uniquecount};
      await redisclient.sAdd(now,`${username} Logged Out`)


    }
    else if(eventtype == 'file-upload'){
      
      let fileuploadcount=Number (await redisclient.get('file upload count:')) || 0;
      fileuploadcount += 1;
      await redisclient.set('file upload count:',fileuploadcount);
      eventresult=`File Upload Count: ${fileuploadcount}`;
      await redisclient.sAdd(now,`${username} Uploaded a File`)

    }
    else if(eventtype == 'file-download'){

      let filedownloadcount=Number (await redisclient.get('file download count:')) || 0;
      filedownloadcount += 1;
      await redisclient.set('file download count:',filedownloadcount);
      eventresult=`File Download Count: ${filedownloadcount}`
      await redisclient.sAdd(now,`${username} Downloaded a File`);

    }
    else if(eventtype == 'search'){

      let searchcount=Number (await redisclient.get('search count: ')) || 0;
      searchcount += 1;
      await redisclient.set('search count: ',searchcount);
      eventresult=`Search Count: ${searchcount} `;
      await redisclient.sAdd(now,`${username} Searched for ${query}`)

    }
    else{

      return res.status(400).json({message:`${eventtype} not supported`});

    }
await Event.create({
  userid: userid,      
  eventtype: eventtype, 
  page: page,          
  metadata: "Data"     
});

    
    return res.status(200).json({eventresult,'Activity Box':redisclient.sMembers(now)})
    //Ask whether this is the right approach for activities, or direct logging
    //begin phase 5
})
