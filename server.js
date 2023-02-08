const client = require('./connection.js');
const express = require('express');
const app = express();
const bcrypt = require('bcrypt');

const {saveUser, hashPassword, emailValidation, fetchUser, updateUser, checkPasswords } = require('./app-service.js');

const {set200Response, set403Response, set201Response, set204Response, set400Response, set401Response, set501Response} = require('./responses.js');
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
        set200Response({},response);
        return response.end();
    }
    catch(error){
        console.log(error+" -- Error Caught in healthz call")
        set400Response(error, response);
        return response.end();
    } 
});

// Handling default user api calls

app.post('/users', async (request, response)=> {
    try{
        const payload = request.body;
        if(payload.id || payload.account_created || payload.account_updated){
            //400
            set400Response("Bad request", response);
            return response.end();
            
        }
        
        if(!payload.first_name || !payload.last_name || !payload.password || !payload.username){
            //400
            set400Response("Bad request", response);
            return response.end();
        }
        else{
            const emailValidity = await emailValidation(payload.username);
            if(!emailValidity){
                //400
                set400Response("Username must be in format of example@example.com", response);
                return response.end();
            }
            else{
            const oldUser = await fetchUser(payload.username);
            if(oldUser){
                //400
                set400Response("User Already exists", response);
                return response.end();
            }
            else{
                 //201
                payload.password = await hashPassword(payload.password);
                const newUser = await saveUser(payload);
                delete newUser.password;
                set201Response(newUser,response)
                return response.end();
                }
            }
        }
            
        } 
    catch(error){
        set400Response(error,{})
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
                set200Response(existingUser.user,response);
                return response.end();
            }else{
                //403
                set403Response("Cannot access other users data",response);
                return response.end();
            }
        }else{
            //401
            set401Response("Username or password is incorrect",response);
            return response.end();
        }
        }
        else{
             //401
            set401Response("No user with this username",response);
            return response.end();
        }
    }
    catch(error){
        //401
        set401Response("Username or password are incorrect",response);
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
        set400Response("Username cannot be found",response);
        return response.end();
    }else{
        const authenticated = await comparePasswords(password, existingUser.password)
        if(authenticated){

            const payload = request.body;

            if('first_name' in payload){
                if(!(payload.first_name.trim())){
                    //400
                    set400Response("first_name cannot be empty value",response);
                    return response.end();
                }  
            }else{
                payload.first_name = existingUser.first_name;
            }

            if('last_name' in payload){
                if(!(payload.last_name.trim())){
                    //400
                    set400Response("last_name cannot be empty value",response);
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
                set400Response("Username must be in example@example format",response);
                return response.end();
            }else if(isUserNameTaken){
                //400
                set400Response("UserName present in db",response);
                return response.end();
            }
            else{
                if(existingUser.id == id){   
                    if('password' in payload){
                        if(!(payload.password.trim())){
                            //400
                            set400Response("password cannot be empty value",response);
                            return response.end();
                        }else{
                            payload.password = await hashPassword(payload.password);    
                            //204     
                            const result = await updateUser(payload, id);
                            set204Response(result,response);
                            return response.end();
                        }
                    }else{
                        payload.password = password;
                        payload.password = await hashPassword(payload.password);    
                        //204     
                        const result = await updateUser(payload, id);
                        set204Response(result,response);
                        return response.end();
                    } 
                }else{
                    //403
                    set403Response("Cannot access other user data",response);
                    return response.end();
                }
            }  
        }else{
            //401
            set403Response("Username or password are not mismatching",response);
            return response.end();
        }
    }
})

// handling unimplemented methods

app.all('/healthz',(req,res)=>{
    set501Response("Method not implemented",res);
    return res.end();
})
app.all('*',(req,res)=>{
    set501Response("Method not implemented",res);
    return res.end();
})

app.all('/user',(req,res)=>{
    set501Response("Method not implemented",res);
    return res.end();
})
