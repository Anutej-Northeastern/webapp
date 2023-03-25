require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {sequelize} = require("./sequelize/models/index.js");
const app = express();
const multer = require("multer");
const multerS3 = require("multer-s3");
const uuid = require("uuid").v4;
const path = require("path");
const aws = require("aws-sdk");
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
    deleteProduct,
    getProductImages,
	uploadImage,
	getProductImageById,
	deleteImage,
	logger } = require('./app-service.js');

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
const { request } = require('http');

aws.config.update({
	// accessKeyId: process.env.ACCESS_KEY,
	// secretAccessKey: process.env.ACCESS_SECRET_KEY,
	region: process.env.S3_REGION,
});


const s3 = new aws.S3({});

const StatsD = require('node-statsd');
const statsd = new StatsD({ host: "localhost", port: 8125 });

app.use(cors());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
const connectDb = async() =>{
    logger.info('Checking database connection---');
    try{
        await sequelize.authenticate();
        logger.info('Database connection established.');
        sequelize.sync({force:false}).then((result)=>{
            logger.info(`${result}`)
        })
    }catch(e){
        logger.error('Database connection failed',e);
        process.exit(1);
    }
}
//self executing async function
(async()=>{
    await connectDb();
	logger.info(`Server is now listening at port ${port}`);
    app.listen(port, ()=>{
		logger.info(`Listening at port ${port}`);
    })
})();


// Health check api call
app.get('/healthz', (request, response) => { 
    try{
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_healthz');
		
		logger.info('Healthz Received Healthz API call');
		set200Response("Everything is OK",response);
        return response.end();
    }
    catch(error){
		logger.warn("Healtz API Error Caught in healthz call"+error);
        set503Response("Please Retry",response);
        return response.end();
    } 
});

// Handling default user api calls

app.post('/v1/user', async (request, response)=> {
    try{
	//statsd.increment('api_all');
	statsd.increment('api_userCreate');
		
	const payload = request.body;
	logger.info(`User Create Payload ---${JSON.stringify(payload)}`);
    const acceptedKeys = ["first_name", "last_name", "password", "username"];
    for (const key in Object.keys(payload)) {
        logger.info(`$[(key in acceptedKeys)]`);
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
    logger.info(`User Create emailValidity ----- ${emailValidity}`);

    if (!emailValidity) {
        //400
        set400Response("username must be an email!", response);
        return response.end();
    } else {
        const existingUser = await fetchUser(payload.username);
        logger.info(`User Create existingUser ----- ${existingUser}`);
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
            logger.info(`User Create newUser ----- ${JSON.stringify(newUser)}`);
            delete newUser.password;
            set201Response(newUser, response);
            return response.end();
        }
    }

    }
    catch(error){
        logger.warn("Error Caught in post call while User Create -- "+error);
        set400Response("Bad Request",response);
        return response.end();
    }
})


// Handling Specific user api calls
app.get('/v1/user/:id',async (request, response) => {

    try{
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_userGet');

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
        logger.warn("Caught error while handing get user api call"+error);
        set400Response("Bad Request",response);
        return response.end();
    } 
})

app.put('/v1/user/:id',async (request, response)=> {
    try{
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_userPut');

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
                    logger.info(`User Put $[(key in acceptedKeys)]`);
                    if (!(key in acceptedKeys)) {
                        set400Response("Bad request", response);
                        return response.end();
                    }
                }
    
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
        logger.warn("User Update Caught Exception while handling put user request --- "+e);
        set400Response("Bad Request",response);
        return response.end();
    }
})


// Handling Product calls
// Unauthenticated call
app.get('/v1/product/:id', async (request,response)=>{
    try {
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_productGet');

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
        logger.warn("Product Get Caught Exception while handling get product request --- "+e);
        set400Response("Bad Request",response);
        return response.end();
    }
})
// Authenticated Calls
app.post('/v1/product',async (request,response)=>{
    try {
		//get the user credentials
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_productPost');

		const authHeader = request.headers.authorization;
		if(authHeader===undefined){
			set401Response("Unauthorized User",response);
			return response.end();
		}
		const [type, token] = authHeader.split(" ");
		const decodedToken = Buffer.from(token, "base64").toString("utf8");
		const [username, password] = decodedToken.split(":");

		//get the user details with the given username
		const result = await fetchUser(username);
		logger.info(`Product Create logged in user details -- ${JSON.stringify(result)}`);

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
		const passwordCheck = await checkPasswords(
			password,
			result.user.password
		);
		if (!passwordCheck) {
			//401
			set401Response("Username or Password is incorrect", response);
			return response.end();
		}

		//only if everything is okay, create a new product
		//check if the payload is correct
		const payload = request.body;
		logger.info(`Porduct Post Payload ---${JSON.stringify(payload)}`);

		const acceptedKeys = [
			"name",
			"description",
			"sku",
			"manufacturer",
			"quantity",
		];
		for (const key in Object.keys(payload)) {
			logger.info(`Porduct Post $[(key in acceptedKeys)]`);
			if (!(key in acceptedKeys)) {
				logger.info(`Porduct Post inside keys`);
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
			logger.info(`Porduct Post inside name desc absence`);

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
			logger.info(`Porduct Post inside name desc type check`);

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
			logger.info(`Porduct Post inside name desc trim`);

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
        logger.warn(`Porduct Post Caught Exception while handling post product request --- ${e}`);
        set400Response("Bad Request",response);
        return response.end();
	}
})

app.patch('/v1/product/:id', async (request,response)=>{
    try{
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_productPatch');

    //get the user credentials
	const authHeader = request.headers.authorization;
	const [type, token] = authHeader.split(" ");
	const decodedToken = Buffer.from(token, "base64").toString("utf8");
	const [username, password] = decodedToken.split(":");

	//get the user details with the given username
	const result = await fetchUser(username);
	logger.info(`Product Patch logged in user details -- ${JSON.stringify(result)}`);

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
				logger.info(`Product Patch $[(key in acceptedKeys)]`);
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
			logger.info(`Product Patch updated product --- ${updatedProduct}`);
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
        logger.warn(`Product PatchCaught Exception while handling patch product request --- ${e}`);
        set400Response("Bad Request",response);
        return response.end();
    }
})

app.put('/v1/product/:id', async (request,response)=>{
    try{
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_productPut');

	//get the user credentials
	const authHeader = request.headers.authorization;
	const [type, token] = authHeader.split(" ");
	const decodedToken = Buffer.from(token, "base64").toString("utf8");
	const [username, password] = decodedToken.split(":");

	//get the user details with the given username
	const result = await fetchUser(username);
	logger.info(`Product Put logged in user details -- ${JSON.stringify(result)}`);

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
			logger.info(`Product Put productId ---${JSON.stringify(productId)}`);
			logger.info(`Product Put Payload ---${JSON.stringify(payload)}`);

			const acceptedKeys = [
				"name",
				"description",
				"sku",
				"manufacturer",
				"quantity",
			];
			for (const key in Object.keys(payload)) {
				logger.info(`Product Put $[(key in acceptedKeys)]`);
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
			logger.info(`Product Put updated product --- ${updatedProduct}`);
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
        logger.warn(`Product Put Caught Exception while handling put product request ${e}`);
        set400Response("Bad Request",response);
        return response.end();
    }
})

app.delete('/v1/product/:id', async (request,response)=> {
    try {
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_productDelete');

		//get the user credentials
		const authHeader = request.headers.authorization;
		if(authHeader===undefined){
			set401Response("Need to pass in the authorization details",response);
			return response.end();
		}
		const [type, token] = authHeader.split(" ");
		const decodedToken = Buffer.from(token, "base64").toString("utf8");
		const [username, password] = decodedToken.split(":");

		//get the user details with the given username
		const result = await fetchUser(username);

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
		const passwordCheck = await checkPasswords(
			password,
			result.user.password
		);
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
		const productDetails = await getProduct(productId);
		logger.info(`Product Delete productDetails`);

		if (!productDetails.productExists) {
			//if no, send 404
			set404Response(`Product Not Found`, response);
			return response.end();
		}
		//check for owner of the product
		if (productDetails.product.owner_user_id === result.user.id) {
			//if yes, you can delete the product  - 204
			const deleteImages = await removeAllImages(productId);
			if(deleteImages){
				const deletedProduct = await deleteProduct(productId);
				if (!deletedProduct) {
					set400Response("Bad Request", response);
					return response.end();
				} else {
					set400Response(result, response);
					return response.end();
				}
			}else{
				set400Response("Error while deleting the images of this product", response);
				return response.end();
			}
		} else {
			//if not then you are not authorized to update - 403
			set403Response(
				`Sorry, you are not authorized to delete the product with id : ${productId}`,
				response
			);
			return response.end();
		}
	} catch (error) {
		logger.warn(`caught exception handling delete product --- ${error}`);
		set400Response(error, response);
		return response.end();
	}
})

// Image Api Calls


const authenticateUser = async (request, response, next) => {
	try {
		logger.info(`Image Authenticate User inside authenticate user`);
		const authHeader = request.headers.authorization;
		if(authHeader===undefined){
			set401Response("Need to pass in the authorization details",response);
			return response.end();
		}
		const [type, token] = authHeader.split(" ");
		const decodedToken = Buffer.from(token, "base64").toString("utf8");
		const [username, password] = decodedToken.split(":");
		//get the user details with the given username
		const result = await fetchUser(username);
		logger.info(`Image Authenticate User Middleware logged in user details -- ${JSON.stringify(result)}`);

		//check for user authentication,
		if (!result.userExists) {
			//401
			set401Response(
				`No user account found with this username --- ${username}`,
				response
			);
			return response.end();
		}
		//is the password right?
		const passwordCheck = await checkPasswords(
			password,
			result.user.password
		);
		if (!passwordCheck) {
			//401
			set401Response("Username and password mismatch", response);
			return response.end();
		}

		const productId = request.params.productId;
		//check for product existance,
		if (isNaN(productId)) {
			set400Response("Bad request", response);
			return response.end();
		}

		const productDetails = await getProduct(productId);

		if (!productDetails.productExists) {
			//if no, no product found - 404
			set404Response(`Product Not Found`, response);
			return response.end();
		}

		//check for user authorization
		if (!(productDetails.product.owner_user_id === result.user.id)) {
			set403Response(
				`Sorry, you are not authorized to add images to this product`,
				response
			);
			return response.end();
		}
		next();
	} catch (error) {
		logger.warn(`Image Authenticate User Caught exception while handling user authentication --- ${error}`);
		set400Response(error, response);
		return response.end();
	}
};

const upload = multer({
	storage: multerS3({
		s3: s3,
		bucket: process.env.S3_BUCKET,
		metadata: (req, file, cb) => {
			cb(null, { fieldName: file.fieldname });
		},
		key: (req, file, cb) => {
			const ext = path.extname(file.originalname);
			cb(null, `${uuid()}${ext}`);
		},
	}),
});


const deleteObjs = async(params, imgIds)=>{
	return new Promise((resolve, reject)=>{
		s3.deleteObjects(params, async (error, data) => {
			if (error) {
				reject(error);
			} else {
				logger.info(`Delete Object Middleware message on successful deletion ${data}`);
				const d_image = await deleteImage(imgIds);
				logger.info(`Delete Object Middleware deleted image --- ${d_image}`);
				if (!d_image) {
					reject(false);
				} else {
					resolve(d_image);
				}
			}
		});
	})
}

const removeAllImages = async (productId) => {
	//200 - OK
	try {
		//delete an image of a product
		//get the details of the given id from the db
		const imgs = await getProductImages(productId);
		let imgIds = [];
		let s3Locations = [];
		if (imgs.imagesExists) {
			logger.info(`Delete all Images Middleware inside images exist`);
			imgs.images.forEach((image) => {
				s3Locations.push(image.s3_bucket_path.split("/").pop());
				imgIds.push(image.image_id);
			});
			logger.info(`Delete all Images Middleware s3 locations --- ${s3Locations}`);
			if (s3Locations.length == 0) {
				return true;
			}
		} else {
			return false;
		}
		//get its s3 address
		const objects = s3Locations.map((key) => ({
			Key: key
		}));
		var params = {
			Bucket: process.env.S3_BUCKET,
			Delete: {
				Objects: objects
			},
		};
		
		const result = await deleteObjs(params, imgIds);
		return result;
		
	} catch (error) {
		logger.warn(`Delete all Images Middleware error due to -- ${error.message}`);
		set400Response(error, response);
		return false;
	}
};

app.get('/v1/product/:productId/image',authenticateUser,async(request,response)=>{
	//200 - OK
	try {
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_imageGet');
		logger.info(`Image Get Api Call`)
		const productId = request.params.productId;
		const images = await getProductImages(productId);
		if (images.imagesExists) {
			set200Response(images.images, response);
			return response.end();
		} else {
			set404Response(`No Images Found`, response);
			return response.end();
		}
	} catch (error) {
		logger.warn(`Image Get ${error}`);
		set400Response(error, response);
		return response.end();
	}
})

app.get("/v1/product/:productId/image/:imageId",authenticateUser,async(request,response)=>{
	//200 - OK
	try {
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_imageGetone');
		logger.info(`Image Get One Api Call`)
		
		const productId = request.params.productId;
		const imageId = request.params.imageId;
		const image = await getProductImageById(productId, imageId);
		if (image.imageExists) {
			set200Response(image.image, response);
			return response.end();
		} else {
			set404Response(`No Image Found`, response);
			return response.end();
		}
	} catch (error) {
		logger.warn(`Image Get One Caught error while handling get one product image api call -- ${error}`)
		set400Response(error, response);
		return response.end();
	}
})

app.post("/v1/product/:productId/image",authenticateUser,upload.single("file"),async(request,response)=>{
	//200 - OK
	try {
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_imagePost');
		
		if (!request.file) {
			set400Response("File not uploaded", response);
			return response.end();
		}
		//upload a document
		const productId = request.params.productId;
		const s3ObjectLocation = request.file.location;
		logger.info(`Image Post productId : ${productId}`);
		logger.info(`Image Post original filename : ${request.file.originalname}`);
		logger.info(`Image Post file location : ${s3ObjectLocation}`);
		if (!request.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) { // Check if the file type is allowed
			set400Response('Only image files are allowed!',response)
			return response.end();
		}
		const imageDetails = await uploadImage({
			product_id: productId,
			file_name: request.file.originalname,
			s3_bucket_path: s3ObjectLocation,
		});
		if (imageDetails) {
			set201Response(imageDetails, response);
			return response.end();
		} else {
			set400Response("Bad Request", response);
			return response.end();
		}
	} catch (error) {
		logger.warn(`Image Post error while uploading file --- ${error}`);
		set400Response("Bad Request", response);
		return response.end();
	}
})

aws.config.update({
	// accessKeyId: process.env.ACCESS_KEY,
	// secretAccessKey: process.env.ACCESS_SECRET_KEY,
	region: process.env.REGION,
});

app.delete("/v1/product/:productId/image/:imageId",authenticateUser,async(request,response)=>{
	//200 - OK
	try {
		//delete an image of a product
		//get the details of the given id from the db
		statsd.increment('endpoint_all');
		statsd.increment('endpoint_imageDelete');
		logger.info(`Image Get Api Call`)
		

		const productId = request.params.productId;
		const imageId = request.params.imageId;
		const img = await getProductImageById(productId, imageId);
		let s3Location;
		if (img.imageExists) {
			s3Location = img.image.s3_bucket_path.split("/").pop();
		} else {
			set404Response(`No Image Found`, response);
			return response.end();
		}
		//get its s3 address
		var params = {
			Bucket: process.env.S3_BUCKET,
			Key: s3Location
		};
		s3.deleteObject(params, async (error, data) => {
			if (error) {
				set400Response(error.message, response);
				return response.end();
			} else {
				const d_image = await deleteImage(imageId);
				if (!d_image) {
					set400Response("Bad Request", response);
					return response.end();
				} else {
					logger.info(`Image Delete Inside if delete image present`);
					set204Response(d_image, response);
					return response.end();
				}
			}
		});
	} catch (error) {
		logger.warn(`Image Delete error occured while delete image -- ${error.message}`);
		set400Response(error, response);
		return response.end();
	}
})

// handling unimplemented methods
app.all('*',(req,res)=>{
	set501Response("Method not implemented",res);
	return res.end();
})

app.all('/healthz',(req,res)=>{
    set501Response("Method not implemented",res);
    return res.end();
})

app.all('/user',(req,res)=>{
	set501Response("Method not implemented",res);
	return res.end();
})

app.all("/:productId/image/:imageId",(req,res)=>{
	set501Response("Method not implemented",res);
	return res.end();	
})

app.all("/:productId/image",(req,res)=>{
    set501Response("Method not implemented",res);
    return res.end();
})


module.exports = {app}
