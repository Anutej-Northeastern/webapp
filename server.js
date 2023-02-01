const client = require('./connection.js');
const express = require('express');
const app = express();
const bcrypt = require('bcrypt');

const {save, hashPassword, emailValidation, getUser, update, comparePasswords } = require('./app-service.js');

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


// // Handling Specific user api calls
app.get('/users/:id',async (request, response) => {
    try{
        const authHeader = request.headers.authorization
        const [type, token] = authHeader.split(' ');
        console.log(token);
        const decodedToken = Buffer.from(token,'base64').toString('utf8');
        const [username, password] = decodedToken.split(':');
        console.log(username+'---'+password);
        
        
        const id = request.params.id;
        
        //check for authentication - check if a user with the given username and password exist?
        const existingUser = await getUser(username);
        
        if(existingUser){
        const authenticated = bcrypt.compare(password, existingUser.password);
        //  await comparePasswords(password, existingUser.password)
        console.log(authenticated+'authenticated');
        if(authenticated){
            //check for authorization
            if(existingUser.id == id){
                //200 OK
                delete existingUser.password;
                response.status(403);
                response.json(existingUser);
                console.log("existing User"+existingUser);
            }else{
                //403
                response.status(403);
                response.json("Cannot access other users data");
            }
        }else{
            //401
            response.status(401);
            response.json("Username or password are incorrect");
        }
        }
        else{
             //401
             response.status(401);
            response.json("No user with this username");
        }
    }
    catch(error){
        //401
        response.status(401);
        response.json("Username or password are incorrect");
        
    } 
});

app.put('/users/:id',async (request, response)=> {
    try{
        const authHeader = request.headers.authorization;
        const [type, token] = authHeader.split(' ');
        const decodedToken = Buffer.from(token,'base64').toString('utf8');
        const [username, password] = decodedToken.split(':');
        console.log(username+'---'+password);
        const id = request.params.id;
        const existingUser = await getUser(username);
        if(!existingUser){
            response.status(400);
            response.json("Given username doesn't exist in database");
        }else{
            const authenticated = await comparePasswords(password, existingUser.password)
        
        if(authenticated){
            var payload = request.body;

            const emailValidity = await emailValidation(payload.username);
            if(!emailValidity){
                //400
                console.log("Not valid email");
                response.status(400);
                response.json("Username must be of format example@example.com");
            }else{
                if(existingUser.id == id){
                    //201
                    console.log(id+"--userid--"+existingUser.id);
                    // const validusername = 
                    if(!payload.password)
                    {
                        payload.password = password;
                    }
                    if(!payload.username)
                    {
                        payload.username = username;
                    }
                    if(!payload.first_name )
                    {
                        payload.first_name = existingUser.first_name;
                    }
                    if(!payload.last_name)
                    {
                        payload.last_name = existingUser.last_name;
                    }
                    
                    payload.password = await hashPassword(payload.password);
                    console.log("payload"+JSON.stringify(payload));
                    console.log("temp before result from get");
                    const result = await update(payload, id);
                    response.status(201);
                    response.json(result);
                }else{
                     //403
                     response.status(403)
                     response.json("cannot access other user data");
                }
            }  
        }else{
            //401
            response.status(401);
            response.json("User or password incorrect");
        }
    }
    
}
catch(error){
    //401
    console.log("error "+error);
        response.status(401);
        response.json("User or password incorrect");
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
