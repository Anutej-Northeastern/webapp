const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {sequelize} = require("./sequelize/models/index.js");
const app = express();
const client = require('./connection.js');
const {
    saveUser,
    hashPassword,
    emailValidation,
    fetchUser,
    updateUser,
    checkPasswords,
    getProduct,
    getProductBySKU,
    saveProduct,
    updateProduct,
    deleteProduct } = require('./app-service.js');

const port = process.env.PORT || 3000;

const {
    set200Response,
    set201Response,
    set204Response,
    set400Response,
    set401Response,
    set403Response,
    set404Response,
    set418Response,
    set501Response,
    set503Response} = require('./responses.js');



app.use(cors());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
const connectDb = async() =>{
    console.log('Checking database connection---');
    try{
        await sequelize.authenticate();
        console.log('Database connection established.');
        sequelize.sync({force:false}).then((result)=>{
            console.log(`${result}`)
        })
    }catch(e){
        console.log('Database connection failed',e);
        process.exit(1);
    }
}
//self executing async function
(async()=>{
    await connectDb();
    console.log(`Server is now listening at port ${port}`);
    app.listen(port, ()=>{
        console.log(`Listening at port ${port}`);
    })
})();


// Health check api call
app.get('/healthz', (request, response) => {
    try{
        set200Response("Everything is okay",response);
        return response.end();
    }
    catch(error){
        console.log(error+" -- Error Caught in healthz call")
        set503Response("Please Retry",response);
        return response.end();
    } 
});

// Handling default user api calls

app.post('/v1/user', async (request, response)=> {
    try{
        const payload = request.body;
    console.log(`Payload ---${JSON.stringify(payload)}`);

    const acceptedKeys = ["first_name", "last_name", "password", "username"];
    for (const key in Object.keys(payload)) {
        console.log(`$[(key in acceptedKeys)]`);
        if (!(key in acceptedKeys)) {
            set400Response("Bad request", response);
            return response.end();
        }
    }

    if (
        !payload.first_name ||
        !payload.last_name ||
        !payload.password ||
        !payload.username
    ) {
        //400
        set400Response("Bad Request", response);
        return response.end();
    }

    if (
        typeof payload.first_name != "string" ||
        typeof payload.last_name != "string" ||
        typeof payload.password != "string" ||
        typeof payload.username != "string"
    ) {
        set400Response("Bad request", response);
        return response.end();
    }

    if (
        !isNaN(payload.first_name) ||
        !isNaN(payload.last_name) ||
        !isNaN(payload.password) ||
        !isNaN(payload.username)
    ) {
        set400Response("Bad request", response);
        return response.end();
    }

    if (
        !payload.first_name.trim() ||
        !payload.last_name.trim() ||
        !payload.password.trim() ||
        !payload.username.trim()
    ) {
        //400
        set400Response("Bad Request", response);
        return response.end();
    }

    const emailValidity = await emailValidation(payload.username);
    console.log(`emailValidity ----- ${emailValidity}`);

    if (!emailValidity) {
        //400
        set400Response("username must be an email!", response);
        return response.end();
    } else {
        const existingUser = await fetchUser(payload.username);
        console.log(`existingUser ----- ${existingUser}`);
        if (existingUser.userExists) {
            //400
            set400Response(
                "The given username is already been taken",
                response
            );
            return response.end();
        } else {
            //201
            payload.password = await hashPassword(payload.password);
            const newUser = await saveUser(payload);
            console.log(`newUser ----- ${JSON.stringify(newUser)}`);
            delete newUser.password;
            set201Response(newUser, response);
            return response.end();
        }
    }

    }
    catch(error){
        console.log("Error Caught in post call -- "+error);
        set418Response("Please Retry",response);
        return response.end();
    }
})


// Handling Specific user api calls
app.get('/v1/user/:id',async (request, response) => {

    try{
        const authHeader = request.headers.authorization;
        const [type, token] = authHeader.split(" ");
        const decodedToken = Buffer.from(token, "base64").toString("utf8");
        const [username, password] = decodedToken.split(":");

        const id = request.params.id;
        if (isNaN(id)) {
            set400Response("Bad request", response);
            return response.end();
        }
        //check for authentication - check if a user with the given username and password exist?
        const existingUser = await fetchUser(username);

        if (existingUser.userExists) {
            const authenticated = await checkPasswords(
            password,
            existingUser.user.password
            );
            if (authenticated) {
            //check for authorization
            if (existingUser.user.id == id) {
                //200 OK
                delete existingUser.user.password;
                set200Response(existingUser.user, response);
                return response.end();
            } else {
                //403
                set403Response(
                    "You are not authorized to access this data",
                    response
                );
                return response.end();
            }
            } else {
                //401
                set401Response("Username and password mismatch", response);
                return response.end();
                }
            } else {
        //401
            set401Response(
                "Unable to fetch user with given username",
                response
            );
            return response.end();
        }
    }
    catch(error){
        //401
        console.log("Caught error while handing get user api call ---"+error);
        set418Response("Please Retry",response);
        return response.end();
    } 
})

app.put('/v1/user/:userId',async (request, response)=> {
    try{
        const authHeader = request.headers.authorization;

        const [type, token] = authHeader.split(' ');
        const decodedToken = Buffer.from(token,'base64').toString('utf8');
        const [username, password] = decodedToken.split(':');

        const id = request.params.userId;
        if(isNaN(id)){
            set400Response("Bad request", response);
            return response.end();
        }
        const existingUser = await fetchUser(username);
        if(!existingUser.userExists){
            set401Response("No user account found with the given username",response)
            return response.end();
        }else{
            const authenticated = await checkPasswords(password, existingUser.user.password)
            if(authenticated){
                const payload = request.body;
                console.log(`payload ----- ${payload}`);
                if('first_name' in payload){
                    if(!(payload.first_name.trim())){
                        //400
                        set400Response("first_name cannot be empty value", response);
                        return response.end();
                    }
                }else{
                    payload.first_name = existingUser.first_name;
                }

                if('last_name' in payload){
                    if(!(payload.last_name.trim())){
                        //400
                        set400Response("last_name cannot be empty value", response);
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

                        //400
                        set400Response("Sorry, Cannot change username", response);
                        return response.end();
                    }
                }

                if(!emailValidity){
                    //400
                    set400Response("Username should be in the format example@example.com", response);
                    return response.end();
                }else if(isUserNameTaken){
                    //400
                    set400Response("User already exists", response);
                    return response.end();
                }
                else{

                    if(existingUser.user.id == id){
                        if('password' in payload){
                            if(!(payload.password.trim())){
                                //400
                                set400Response("password cannot be empty value", response);
                                return response.end();
                            }else{
                                payload.password = await hashPassword(payload.password);
                                //204
                                const result = await updateUser(payload, id);
                                set204Response(result, response);
                                return response.end();
                            }
                        }else{
                            payload.password = password;
                            payload.password = await hashPassword(payload.password);
                            //204
                            const result = await updateUser(payload, id);
                            set204Response(result, response);
                            return response.end();
                        }
                    }else{
                        //403
                        set403Response("Cannot access other users data", response);
                        return response.end();
                    }
                }
            }else{
                //401
                set401Response("Username or password is incorrect",response)
                return response.end();
            }
        }
    }catch (e) {
        console.log("Caught Exception while handling put user request --- "+e);
        set403Response("User-Password Missmatch",response);
        return response.end();
    }
})


// Handling Product calls
// Unauthenticated call
app.get('/v1/product/:id', async (req,res)=>{
    try {
        //200 - OK
        const productId = req.params.id;
        if(isNaN(productId)){
            set400Response("Bad request", res);
            return res.end();
        }
        const product = await getProduct(productId);
        if(product.productExists){
            set200Response(product.product, res);
            return res.end();
        }else{
            set404Response(`Product Not Found`,res);
            return res.end();
        }
    }catch (e) {
        console.log("Caught Exception while handling get product request --- "+e);
        set501Response("Please Retry",res);
        return res.end();
    }
})
// Authenticated Calls
app.post('/v1/product',async (req,res)=>{
    try{
        //get the user credentials
        const authHeader = req.headers.authorization
        const [type, token] = authHeader.split(' ');
        const decodedToken = Buffer.from(token,'base64').toString('utf8');
        const [username, password] = decodedToken.split(':');

        //get the user details with the given username
        const result = await fetchUser(username);

        //does a user exist with the given username?
        if(!result.userExists){
            //401
            set401Response(`User with ${username} doesn't exist`,res)
            return res.end();
        }

        //is the password right?
        const passwordCheck = await checkPasswords(password, result.user.password)
        if(!passwordCheck){
            //401
            set401Response("Username or password is incorrect",res)
            return res.end();
        }

        //only if everything is okay, create a new product
        //check if the payload is correct
        const payload = req.body;
        if(payload.id || payload.date_added || payload.date_last_updated || payload.owner_user_id){
            //400
            set400Response("Bad request", res);
            return res.end();
        }
        else if(!payload.name || !payload.description || !payload.sku || !payload.manufacturer || !('quantity' in payload)){
            //400
            set400Response("Bad Request", res);
            return res.end();
        }
        else if(payload.quantity<0 || payload.quantity>100){
            //400
            set400Response("Quantity cannot be less than 0 or greater than 100", res)
            return res.end();
        }
        else if(typeof(payload.quantity)!="number")
        {
            set400Response("Quantity can only be a number", res)
            return res.end();
        }
        else{
            //check if there is any product with the given SKU
            const p = await getProductBySKU(payload.sku)
            if(p.productExists){
                set400Response("A product with the given sku exists", res);
                return res.end();
            }

            //nothing wrong with the payload
            //add the owner_user_id to the payload
            payload.owner_user_id = result.user.id;
            const savedProduct = await saveProduct(payload);
            if(savedProduct){
                set201Response(savedProduct, res);
                return res.end();
            }else{
                set400Response("Bad Request", res);
                return res.end();
            }
        }
    }catch (e) {
        console.log("Caught Exception while handling post product request --- "+e);
        set503Response("Please Retry",res);
        return res.end();
    }
})

app.patch('/v1/product/:id', async (req,res)=>{
    try{
        //get the user credentials
        const authHeader = req.headers.authorization
        const [type, token] = authHeader.split(' ');
        const decodedToken = Buffer.from(token,'base64').toString('utf8');
        const [username, password] = decodedToken.split(':');

        //get the user details with the given username
        const result = await fetchUser(username);

        //does a user exist with the given username?
        if(!result.userExists){
            //401
            set401Response(`Username incorrect `,res)
            return res.end();
        }

        //is the password right?
        const passwordCheck = await checkPasswords(password, result.user.password)
        if(!passwordCheck){
            //401
            set401Response("Username or Password is incorrect",res)
            return res.end();
        }

        //only if everything is okay
        //check if a product with the given id exists in the user's list of products
        const productId = req.params.id;
        if(isNaN(productId)){
            set400Response("Bad request", res);
            return res.end();
        }
        const payload = req.body;
        const productDetails = await getProduct(productId)

        if(!productDetails.productExists){
            //if no, no product found - 404
            set404Response(`No Product with the given id`,res);
            return res.end();
        }
        else{
            //if user id does not match with the ownerId of the product then you are not authorized to update - 403
            if(!(productDetails.product.owner_user_id === result.user.id)){
                set403Response(`Cannot access other products with different Owner Id`,res);
                return res.end();
            }else{

                //if yes, you can update the product details - 204

                if(payload.id || payload.date_added || payload.date_last_updated || payload.owner_user_id){
                    //400
                    set400Response("Bad request", res);
                    return res.end();

                }
                if(payload.quantity<0 || payload.quantity>100){
                    //400
                    set400Response("Quantity cannot be less than 0 or greater than 100", res)
                    return res.end();
                }

                if(payload.sku){
                    if(productDetails.product.sku != payload.sku){
                        //check if there is any product with the given SKU
                        const p = await getProductBySKU(payload.sku)
                        if(p.productExists){
                            set400Response("Product with given sku already exists", res);
                            return res.end();
                        }
                    }
                }

                const updatedProduct = updateProduct(payload, productId)
                if(!updatedProduct){
                    set400Response("Bad Request", res);
                    return res.end();
                }else{
                    set204Response(result, res);
                    return res.end();
                }
            }
        }
    }catch (e) {
        console.log("Caught Exception while handling patch product request --- "+e);
        set501Response("Please Retry",res);
        return res.end();
    }
})

app.put('/v1/product/:id', async (req,res)=>{
    try{
        //get the user credentials
        const authHeader = req.headers.authorization
        const [type, token] = authHeader.split(' ');
        const decodedToken = Buffer.from(token,'base64').toString('utf8');
        const [username, password] = decodedToken.split(':');

        //get the user details with the given username
        const result = await fetchUser(username);
        //does a user exist with the given username?
        if(!result.userExists){
            //401
            set401Response(`User with ${username} doesn't exist`,res)
            return res.end();
        }

        //is the password right?
        const passwordCheck = await checkPasswords(password, result.user.password)
        if(!passwordCheck){
            //401
            set401Response("Username or password is incorrect",res)
            return res.end();
        }

        //only if everything is okay
        //check if a product with the given id exists in the user's list of products
        const productId = req.params.id;

        if(isNaN(productId)){
            set400Response("Bad request", res);
            return res.end();
        }
        const payload = req.body;
        const productDetails = await getProduct(productId)

        if(!productDetails.productExists){
            //if no, no product found - 404
            set404Response(`Product Not Found`,res);
            return res.end();
        }
        else{
            //if user id does not match with the ownerId of the product then you are not authorized to update - 403
            if(!(productDetails.product.owner_user_id === result.user.id)){
                set403Response(`Cannot update other product with other owner id`,res);
                return res.end();
            }else{
                //if yes, you can update the product details - 204

                if(payload.id || payload.date_added || payload.date_last_updated || payload.owner_user_id){
                    //400
                    set400Response("Bad request", res);
                    return res.end();
                }

                if(!payload.name || !payload.description || !payload.sku || !payload.manufacturer || !('quantity' in payload)){
                    //400
                    set400Response("Bad Request", res);
                    return res.end();
                }
                if(payload.quantity<0 || payload.quantity>100){
                    //400
                    set400Response("Quantity cannot be less than 0 or greater than 100", res)
                    return res.end();
                }
                if(typeof(payload.quantity)!="number")
                {
                    set400Response("Quantity can only be a number", res)
                    return res.end();
                }
                //check if there is any product with the given SKU
                if(productDetails.product.sku != payload.sku){
                    const p = await getProductBySKU(payload.sku)
                    if(p.productExists){
                        set400Response("Product with given sku already exists", res);
                        return res.end();
                    }
                }

                const updatedProduct = updateProduct(payload, productId)
                if(!updatedProduct){
                    set400Response("Bad Request", res);
                    return res.end();
                }else{
                    set204Response(result, res);
                    return res.end();
                }
            }
        }
    }catch (e) {
        console.log("Caught Exception while handling put product request"+e);
        set503Response("Please Retry",res);
        return res.end();
    }
})
app.delete('/v1/product/:id', async (req,res)=> {
    try {
        //get the user credentials
        const authHeader = req.headers.authorization;
        const [type, token] = authHeader.split(' ');
        const decodedToken = Buffer.from(token,'base64').toString('utf8');
        const [username, password] = decodedToken.split(':');

        //get the user details with the given username
        const result = await fetchUser(username);

        //does a user exist with the given username?
        if(!result.userExists){
            //401
            set401Response(`User with ${username} doesn't exist`,res)
            return res.end();
        }

        //is the password right?
        const passwordCheck = await checkPasswords(password, result.user.password)
        if(!passwordCheck){
            //401
            set401Response("Username or password is incorrect",res)
            return res.end();
        }

        //only if everything is okay
        const productId = req.params.id;
        if(isNaN(productId)){
            console.log(productId+"====Product ID");
            set400Response("Bad request", res);
            return res.end();
        }
        const productDetails = await getProduct(productId)

        if(!productDetails.productExists){
            //if no, send 404
            set404Response(`Product Not Found`,res);
            return res.end();
        }
        //check for owner of the product
        if(productDetails.product.owner_user_id === result.user.id){
            //if yes, you can delete the product  - 204
            const deletedProduct = await deleteProduct(productId);
            if(!deletedProduct){
                set400Response("Bad Request", res);
                return res.end();
            }else{
                set204Response(result, res);
                return res.end();
            }
        }else{
            //if not then you are not authorized to update - 403
            set403Response(`Cannot access products with different owner id`,res);
            return res.end();
        }
    } catch (e) {
        console.log("Caught Exception while handling delete product request"+e);
        set503Response("Please Retry",res);
        return res.end();
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

module.exports = {app}