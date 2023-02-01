const client = require('./connection.js');
const express = require('express');
const app = express();
const bcrypt = require('bcrypt');

const {save, hashPassword, emailValidation, getUser } = require('./app-service.js');

app.listen(3300, () => {
    console.log('Server is now listening at port 3300');
});

client.connect();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(express.json());

// Health check api call
app.get('/healthz', (request, response) => {
    try{
        response.status(200);
        response.json({});
    }
    catch(error){
        response.status(501);
        response.json(error);
    } 
});

// Handling default user api calls

app.post('/users', async (request, response)=> {
    try{
        const payload = request.body;
        if(payload.id || payload.account_created || payload.account_updated){
            //400
            response.status(400);
            response.json("Bad Request");
            
        }
        
        if(!payload.first_name || !payload.last_name || !payload.password || !payload.username){
             //400
            response.status(400);
            response.json("Bad Request");
        }
        else{
            const emailValidity = await emailValidation(payload.username);
            if(!emailValidity){
                //400
                response.status(400);
                response.json("Username must be in format of example@example.com");
            }
            else{
            const existingUser = await getUser(payload.username);
            if(existingUser){
                 //400
                response.status(400);
                response.json("User Already exists");
            }
            else{
                 //201
                payload.password = await hashPassword(payload.password);
                const newUser = await save(payload);
                response.status(201);
                response.json(newUser);
                }
            }
        }
            
        } 
    catch(error){
        response.status(400);
        response.json({});
    } 
})



// handling unimplemented methods

app.all('/healthz',(req,res)=>{
    res.status(501).send("Method not implemented")
})
app.all('*',(req,res)=>{
    res.status(501).send("Method not implemented")
})

app.all('/user',(req,res)=>{
    res.status(501).send("Method not implemented")
})
