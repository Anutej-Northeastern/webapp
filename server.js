const client = require('./connection.js');
const express = require('express');
const app = express();
const bcrypt = require('bcrypt');

const {saveUser, hashPassword, emailValidation, fetchUser, updateUser, checkPasswords } = require('./app-service.js');

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
        return response.end();
    }
    catch(error){
        response.status(501);
        response.json(error);
        return response.end();
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
            return response.end();
            
        }
        
        if(!payload.first_name || !payload.last_name || !payload.password || !payload.username){
             //400
            response.status(400);
            response.json("Bad Request");
            return response.end();
        }
        else{
            const emailValidity = await emailValidation(payload.username);
            if(!emailValidity){
                //400
                response.status(400);
                response.json("Username must be in format of example@example.com");
                return response.end();
            }
            else{
            const oldUser = await fetchUser(payload.username);
            if(oldUser){
                 //400
                response.status(400);
                response.json("User Already exists");
                return response.end();
            }
            else{
                 //201
                payload.password = await hashPassword(payload.password);
                const newUser = await saveUser(payload);
                response.status(201);
                response.json(newUser);
                return response.end();
                }
            }
        }
            
        } 
    catch(error){
        response.status(400);
        response.json({});
        return response.end();
    } 
})


// // Handling Specific user api calls
app.get('/users/:id',async (request, response) => {
    try{
        const authHeader = request.headers.authorization
        const [type, token] = authHeader.split(' ');
        const decodedToken = Buffer.from(token,'base64').toString('utf8');
        const [username, password] = decodedToken.split(':');
        
        const id = request.params.id;
        
        
        const existingUser = await fetchUser(username);
        
        if(existingUser){
        const authenticated = bcrypt.compare(password, existingUser.password);
        await checkPasswords(password, existingUser.password)
        if(authenticated){
            if(existingUser.id == id){
                //200 OK
                delete existingUser.password;
                response.status(403);
                response.json(existingUser);
                return response.end();
            }else{
                //403
                response.status(403);
                response.json("Cannot access other users data");
                return response.end();
            }
        }else{
            //401
            response.status(401);
            response.json("Username or password are incorrect");
            return response.end();
        }
        }
        else{
             //401
            response.status(401);
            response.json("No user with this username");
            return response.end();
        }
    }
    catch(error){
        //401
        response.status(401);
        response.json("Username or password are incorrect");
        return response.end();
        
    } 
});

app.put('/users/:id',async (request, response)=> {
    const authHeader = request.headers.authorization;
    const [type, token] = authHeader.split(' ');
    const decodedToken = Buffer.from(token,'base64').toString('utf8');
    const [username, password] = decodedToken.split(':');

    var id = request.params.id;

    const existingUser = await fetchUser(username, 'get');
    if(!existingUser){
        response.status(401)
        response.json("Username cannot be found");
        return response.end();
    }else{
        const authenticated = await checkPasswords(password, existingUser.password)
        if(authenticated){

            const payload = request.body;

            if('first_name' in payload){
                if(!(payload.first_name.trim())){
                    //400
                    response.status(400)
                    response.json("first_name cannot be empty value");
                    return response.end();
                }  
            }else{
                payload.first_name = existingUser.first_name;
            }

            if('last_name' in payload){
                if(!(payload.last_name.trim())){
                    //400
                    response.status(400)
                    response.json("last_name cannot be empty value");
                    return response.end();
                }  
            }else{
                payload.last_name = existingUser.last_name;
            }

            let emailValidity = true;
            let isUserNameTaken = false;

            if(!payload.username){
                payload.username = username;
            }else{
                if(!(payload.username === username)){
                    emailValidity = await emailValidation(payload.username);
                    isUserNameTaken = await fetchUser(payload.username, 'check');
                }
            }
            
            if(!emailValidity){
                //400
                response.status(400)
                response.json("Username must be in example@example format");
                return response.end();
            }else if(isUserNameTaken){
                //400
                response.status(400)
                response.json("UserName present in db");
                return response.end();
            }
            else{
                if(existingUser.id == id){   
                    if('password' in payload){
                        if(!(payload.password.trim())){
                            //400
                            response.status(400)
                            response.json("password cannot be empty value");
                            return response.end();
                        }else{
                            payload.password = await hashPassword(payload.password);    
                            //204     
                            const result = await updateUser(payload, id);
                            response.status(204);
                            return response.end();
                        }
                    }else{
                        payload.password = password;
                        payload.password = await hashPassword(payload.password);    
                        //204     
                        const result = await updateUser(payload, id);
                        response.status(204);
                        return response.end();
                    } 
                }else{
                    //403
                    response.status(403);
                    console.log("inside else");
                    response.json("Cannot access other user data");
                    return response.end();
                }
            }  
        }else{
            //401
            response.status(403);
            response.json("Username or password are not mismatching");
            return response.end();
        }
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
