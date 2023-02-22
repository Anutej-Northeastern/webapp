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
        set200Response("Everything is OK",response);
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
                "Username already exists in the DB",
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
        set400Response("Bad Request",response);
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
                    "Cannot access records owned by others",
                    response
                );
                return response.end();
            }
            } else {
                //401
                set401Response("Username or password incorrect", response);
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
        console.log("Caught error while handing get user api call"+error);
        set400Response("Bad Request",response);
        return response.end();
    } 
})

app.put('/v1/user/:id',async (request, response)=> {
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
        if (!existingUser.userExists) {
            set401Response(
                "Unable to fetch user with given username",
                response
            );
            return response.end();
        } else {
            const authenticated = await checkPasswords(
                password,
                existingUser.user.password
            );
            if (authenticated) {
    
                //check if the user is authorized to edit the user
                if (existingUser.user.id != id) {
                    //403
                    set403Response(
                        "Cannot access records owned by others",
                        response
                    );
                    return response.end();
                }
    
                const payload = request.body;
                
                const acceptedKeys = [
                    "first_name",
                    "last_name",
                    "password",
                    "username",
                ];
                for (const key in Object.keys(payload)) {
                    console.log(`$[(key in acceptedKeys)]`);
                    if (!(key in acceptedKeys)) {
                        set400Response("Bad request", response);
                        return response.end();
                    }
                }
    
                //first_name = null
                //first_name = ""
                if (!payload.first_name ||
                    !payload.last_name ||
                    !payload.password ||
                    !payload.username) {
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
    
                if (!payload.username) {
                    payload.username = username;
                } else {
                    if (!(payload.username === username)) {
                        //400
                        set400Response("Username cannot be changed", response);
                        return response.end();
                    }
                }
    
                payload.password = await hashPassword(payload.password);
                //204
                const result = await updateUser(payload, id);
                set204Response(result, response);
                return response.end();
                
            } else {
                //401
                set401Response("Username or password incorrect", response);
                return response.end();
            }
        }
    }catch (e) {
        console.log("Caught Exception while handling put user request --- "+e);
        set400Response("Bad Request",response);
        return response.end();
    }
})


// Handling Product calls
// Unauthenticated call
app.get('/v1/product/:id', async (request,response)=>{
    try {
        const productId = request.params.id;
	    if (isNaN(productId)) {
		    set401Response("Bad request", response);
		    return response.end();
	    }
	    const product = await getProduct(productId);
	    if (product.productExists) {
		    set200Response(product.product, response);
		    return response.end();
	    } else {
		    set404Response(`Unable to Find Product`, response);
    		return response.end();
	    }
    }catch (e) {
        console.log("Caught Exception while handling get product request --- "+e);
        set400Response("Bad Request",response);
        return response.end();
    }
})
// Authenticated Calls
app.post('/v1/product',async (request,response)=>{
    try{
        
	//get the user credentials
	const authHeader = request.headers.authorization;
	const [type, token] = authHeader.split(" ");
	const decodedToken = Buffer.from(token, "base64").toString("utf8");
	const [username, password] = decodedToken.split(":");

	//get the user details with the given username
	const result = await fetchUser(username);
	console.log(`logged in user details -- ${JSON.stringify(result)}`);

	//does a user exist with the given username?
	if (!result.userExists) {
		//401
		set401Response(
			`Unable to find user with username : ${username}`,
			response
		);
		return response.end();
	}

	//is the password right?
	const passwordCheck = await checkPasswords(password, result.user.password);
	if (!passwordCheck) {
		//401
		set401Response("Username or Password is incorrect", response);
		return response.end();
	}

	//only if everything is okay, create a new product
	//check if the payload is correct
	const payload = request.body;
	console.log(`Payload ---${JSON.stringify(payload)}`);

	const acceptedKeys = [
		"name",
		"description",
		"sku",
		"manufacturer",
		"quantity",
	];
	for (const key in Object.keys(payload)) {
		console.log(`$[(key in acceptedKeys)]`);
		if (!(key in acceptedKeys)) {
			set400Response("Bad request", response);
			return response.end();
		}
	}

	if (
		!payload.name ||
		!payload.description ||
		!payload.sku ||
		!payload.manufacturer ||
		!("quantity" in payload)
	) {
		//400
		set400Response("Bad Request", response);
		return response.end();
	}

	if (
		typeof payload.name != "string" ||
		typeof payload.description != "string" ||
		typeof payload.sku != "string" ||
		typeof payload.manufacturer != "string" ||
		typeof payload.quantity != "number"
	) {
		set400Response("Bad request", response);
		return response.end();
	}

	if (
		!isNaN(payload.name) ||
		!isNaN(payload.description) ||
		!isNaN(payload.sku) ||
		!isNaN(payload.manufacturer) ||
		isNaN(payload.quantity)
	) {
		set400Response("Bad request", response);
		return response.end();
	}

	if (
		!payload.name.trim() ||
		!payload.description.trim() ||
		!payload.sku.trim() ||
		!payload.manufacturer.trim()
	) {
		//400
		set400Response("Bad Request", response);
		return response.end();
	}

	//check if there is any product with the given SKU
	const p = await getProductBySKU(payload.sku);
	if (p.productExists) {
		set400Response(
			"Product with given SKU already exists in DB",
			response
		);
		return response.end();
	}

	if (payload.quantity < 0 || payload.quantity > 100) {
		set400Response(
			"Quantity can only be between 0 and 100",
			response
		);
		return response.end();
	}

	//nothing wrong with the payload
	//add the owner_user_id to the payload
	payload.owner_user_id = result.user.id;
	const savedProduct = await saveProduct(payload);
	if (savedProduct) {
		set201Response(savedProduct, response);
		return response.end();
	} else {
		set400Response("Bad Request", response);
		return response.end();
	}
    }catch (e) {
        console.log("Caught Exception while handling post product request --- "+e);
        set400Response("Bad Request",res);
        return res.end();
    }
})

app.patch('/v1/product/:id', async (request,response)=>{
    try{
    //get the user credentials
	const authHeader = request.headers.authorization;
	const [type, token] = authHeader.split(" ");
	const decodedToken = Buffer.from(token, "base64").toString("utf8");
	const [username, password] = decodedToken.split(":");

	//get the user details with the given username
	const result = await fetchUser(username);
	console.log(`logged in user details -- ${JSON.stringify(result)}`);

	//does a user exist with the given username?
	if (!result.userExists) {
		//401
		set401Response(
			`Unable to find user with username : ${username}`,
			response
		);
		return response.end();
	}

	//is the password right?
	const passwordCheck = await checkPasswords(password, result.user.password);
	if (!passwordCheck) {
		//401
		set401Response("Username or Password is incorrect", response);
		return response.end();
	}

	//only if everything is okay
	//check if a product with the given id exists in the user's list of products
	const productId = request.params.id;
	if (isNaN(productId)) {
		set400Response("Bad request", response);
		return response.end();
	}

	const productDetails = await getProduct(productId);

	if (!productDetails.productExists) {
		//if no, no product found - 404
		set404Response(`Product Not Found`, response);
		return response.end();
	} else {
		//if user id does not match with the ownerId of the product then you are not authorized to update - 403
		if (!(productDetails.product.owner_user_id === result.user.id)) {
			set403Response(
				`Cannot access products with other Owner ID`,
				response
			);
			return response.end();
		} else {
			//if yes, you can update the product details - 204
			const payload = request.body;

			const acceptedKeys = [
				"name",
				"description",
				"sku",
				"manufacturer",
				"quantity",
			];
			for (const key in Object.keys(payload)) {
				console.log(`$[(key in acceptedKeys)]`);
				if (!(key in acceptedKeys)) {
					set400Response("Bad request", response);
					return response.end();
				}
			}

			if ("name" in payload) {
				if (typeof payload.name == "string") {
					if (isNaN(payload.name)) {
						if (!payload.name.trim()) {
							set400Response("Bad Request - name", response);
							return response.end();
						}
					} else {
						set400Response("Bad Request - name", response);
						return response.end();
					}
				} else {
					set400Response("Bad Request - name", response);
					return response.end();
				}
			}

			if ("description" in payload) {
				if (typeof payload.description == "string") {
					if (isNaN(payload.description)) {
						if (!payload.description.trim()) {
							set400Response("Bad Request - description", response);
							return response.end();
						}
					} else {
						set400Response("Bad Request - description", response);
						return response.end();
					}
				} else {
					set400Response("Bad Request - description", response);
					return response.end();
				}
			}

			if ("sku" in payload) {
				if (typeof payload.sku == "string") {
					if (isNaN(payload.sku)) {
						if (!payload.sku.trim()) {
							set400Response("Bad Request - sku", response);
							return response.end();
						}
					} else {
						set400Response("Bad Request - sku", response);
						return response.end();
					}
				} else {
					set400Response("Bad Request - sku", response);
					return response.end();
				}
			}

			if ("manufacturer" in payload) {
				if (typeof payload.manufacturer == "string") {
					if (isNaN(payload.manufacturer)) {
						if (!payload.manufacturer.trim()) {
							set400Response("Bad Request - manufacturer", response);
							return response.end();
						}
					} else {
						set400Response("Bad Request - manufacturer", response);
						return response.end();
					}
				} else {
					set400Response("Bad Request - manufacturer", response);
					return response.end();
				}
			}

			if ("quantity" in payload) {
				if (typeof payload.quantity == "number") {
					if (!isNaN(payload.quantity)) {
						if (!(payload.quantity >= 0 && payload.quantity <= 100)) {
							set400Response("Bad Request - quantity", response);
							return response.end();
						}
					} else {
						set400Response("Bad Request - quantity", response);
						return response.end();
					}
				} else {
					set400Response("Bad Request - quantity", response);
					return response.end();
				}
			}

			//check if there is any product with the given SKU
			if ("sku" in payload) {
				const p = await getProductBySKU(payload.sku);
				if (p.productExists) {
					set400Response(
						"Bad Request -- A product with the given sku exist already",
						response
					);
					return response.end();
				}
			}

			const updatedProduct = updateProduct(payload, productId);
			console.log(`updated product --- ${updatedProduct}`);
			if (!updatedProduct) {
				set400Response("Bad Request", response);
				return response.end();
			} else {
				set204Response(result, response);
				return response.end();
			}
		}
	}
    }catch (e) {
        console.log("Caught Exception while handling patch product request --- "+e);
        set400Response("Bad Request",response);
        return response.end();
    }
})

app.put('/v1/product/:id', async (request,response)=>{
    try{
        
	//get the user credentials
	const authHeader = request.headers.authorization;
	const [type, token] = authHeader.split(" ");
	const decodedToken = Buffer.from(token, "base64").toString("utf8");
	const [username, password] = decodedToken.split(":");

	//get the user details with the given username
	const result = await fetchUser(username);
	console.log(`logged in user details -- ${JSON.stringify(result)}`);

	//does a user exist with the given username?
	if (!result.userExists) {
		//401
		set401Response(
			`Unable to find User with username : ${username}`,
			response
		);
		return response.end();
	}

	//is the password right?
	const passwordCheck = await checkPasswords(password, result.user.password);
	if (!passwordCheck) {
		//401
		set401Response("Username or Password is incorrect", response);
		return response.end();
	}

	//only if everything is okay
	//check if a product with the given id exists in the user's list of products
	const productId = request.params.id;

	if (isNaN(productId)) {
		set400Response("Bad request", response);
		return response.end();
	}

	const productDetails = await getProduct(productId);

	if (!productDetails.productExists) {
		//if no, no product found - 404
		set404Response(`Product Not Found`, response);
		return response.end();
	} else {
		//if user id does not match with the ownerId of the product then you are not authorized to update - 403
		if (!(productDetails.product.owner_user_id === result.user.id)) {
			set403Response(
				`Cannot access product records with other Owner ID`,
				response
			);
			return response.end();
		} else {
			//if yes, you can update the product details - 204

			const payload = request.body;
			console.log(`productId ---${JSON.stringify(productId)}`);
			console.log(`Payload ---${JSON.stringify(payload)}`);

			const acceptedKeys = [
				"name",
				"description",
				"sku",
				"manufacturer",
				"quantity",
			];
			for (const key in Object.keys(payload)) {
				console.log(`$[(key in acceptedKeys)]`);
				if (!(key in acceptedKeys)) {
					set400Response("Bad request", response);
					return response.end();
				}
			}

			if (
				!payload.name ||
				!payload.description ||
				!payload.sku ||
				!payload.manufacturer ||
				!("quantity" in payload)
			) {
				//400
				set400Response("Bad Request", response);
				return response.end();
			}

			if (
				typeof payload.name != "string" ||
				typeof payload.description != "string" ||
				typeof payload.sku != "string" ||
				typeof payload.manufacturer != "string" ||
				typeof payload.quantity != "number"
			) {
				set400Response("Bad request", response);
				return response.end();
			}

			if (
				!isNaN(payload.name) ||
				!isNaN(payload.description) ||
				!isNaN(payload.sku) ||
				!isNaN(payload.manufacturer) ||
				isNaN(payload.quantity)
			) {
				set400Response("Bad request", response);
				return response.end();
			}

			if (
				!payload.name.trim() ||
				!payload.description.trim() ||
				!payload.sku.trim() ||
				!payload.manufacturer.trim()
			) {
				//400
				set400Response("Bad Request", response);
				return response.end();
			}

			//check if there is any product with the given SKU
			const p = await getProductBySKU(payload.sku);
			if (p.productExists) {
				set400Response(
					"Product with given SKU already exists in DB",
					response
				);
				return response.end();
			}

			if (payload.quantity < 0 || payload.quantity > 100) {
				set400Response(
					"Bad Request -- Quantity can only be between 0 and 100",
					response
				);
				return response.end();
			}

			const updatedProduct = updateProduct(payload, productId);
			console.log(`updated product --- ${updatedProduct}`);
			if (!updatedProduct) {
				set400Response("Bad Request", response);
				return response.end();
			} else {
				set204Response(result, response);
				return response.end();
			}
		}
	}
    }catch (e) {
        console.log("Caught Exception while handling put product request"+e);
        set400Response("Bad Request",res);
        return res.end();
    }
})
app.delete('/v1/product/:id', async (request,response)=> {
    try {
        //get the user credentials
        const authHeader = request.headers.authorization;
        const [type, token] = authHeader.split(" ");
        const decodedToken = Buffer.from(token, "base64").toString("utf8");
        const [username, password] = decodedToken.split(":");
    
        //get the user details with the given username
        const result = await fetchUser(username);
        console.log(`logged in user details -- ${JSON.stringify(result)}`);
    
        //does a user exist with the given username?
        if (!result.userExists) {
            //401
            set401Response(
                `Unable to find user with username : ${username}`,
                response
            );
            return response.end();
        }
    
        //is the password right?
        const passwordCheck = await checkPasswords(password, result.user.password);
        if (!passwordCheck) {
            //401
            set401Response("Username or password is incorrect", response);
            return response.end();
        }
    
        //only if everything is okay
        const productId = request.params.id;
        if (isNaN(productId)) {
            set400Response("Bad request", response);
            return response.end();
        }
        console.log(`productId ---${JSON.stringify(productId)}`);
        const productDetails = await getProduct(productId);
    
        if (!productDetails.productExists) {
            //if no, send 404
            set404Response(`Product Not Found`, response);
            return response.end();
        }
        //check for owner of the product
        if (productDetails.product.owner_user_id === result.user.id) {
            //if yes, you can delete the product  - 204
            const deletedProduct = await deleteProduct(productId);
            console.log(`deleted product --- ${deletedProduct}`);
            if (!deletedProduct) {
                set400Response("Bad Request", response);
                return response.end();
            } else {
                set204Response(result, response);
                return response.end();
            }
        } else {
            //if not then you are not authorized to update - 403
            set403Response(
                `Cannot access products with other owner ID`,
                response
            );
            return response.end();
        }
    } catch (e) {
        console.log("Caught Exception while handling delete product request"+e);
        set503Response("Please Retry",response);
        return response.end();
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