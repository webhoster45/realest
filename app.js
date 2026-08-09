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

const userschema=new Schema({
    username:{type:String,required:true},
    password:{type:String,required:true},
    email:{type:String,required:true}
})

const User=mongoose.model('User',userschema);


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
    const existinguser=User.findOne({username});
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


app.post('/event',(req,res)=>{
    const {eventType, page, metadata}= req.body;
})




