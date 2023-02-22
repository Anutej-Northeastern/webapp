
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { User, Product } = require('../webapp/sequelize/models/index');
const saveUser = async(newUser) => {

    try{
        const user = await User.create(newUser);
        return user.toJSON();
    }catch(e){
        return false;
    }
}

const hashPassword = (password) => {

    return new Promise((resolve, reject)=>{

        bcrypt.genSalt(saltRounds, function(error, salt){
            if(!error){
                bcrypt.hash(password, salt, function(error, hash){

                    if(!error){
                        resolve(hash);
                    }else{
                        resolve(false);
                    }

                })
            }else{
                resolve(false);
            }
        })
    })

}

const  emailValidation = (input) =>{
    return new Promise((resolve, reject)=>{
        var validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        if(validRegex.test(String(input).toLowerCase())){
            resolve(true);
        }else{
            resolve(false);
        }
    })
}

const fetchUser = async (email) => {

    try{
        const user = await User.findOne({ where:{ username: email}});
        if(user === null){
            return {userExists: false, message:"Couldn't find a user with the given name", user:{}};
        }else{
            return {userExists: true, message:"User found", user: user.toJSON()};
        }
    }catch(e){
        console.log(`exception while finding user---${e}`)
    }
    
}

const checkPasswords = (password, hashedPassword) =>{

    return new Promise((resolve, reject)=>{
        bcrypt.compare(password, hashedPassword, (error, result)=>{
            
            if(result){
                resolve(true)
            }else{
                reject(false)
            }
        })
    })   
}

const updateUser = async (user, id) => {
    var d = new Date();
    d = new Date(d.getTime() - 3000000);
    var date_format_str = d.getFullYear().toString()+"-"+((d.getMonth()+1).toString().length==2?(d.getMonth()+1).toString():"0"+(d.getMonth()+1).toString())+"-"+(d.getDate().toString().length==2?d.getDate().toString():"0"+d.getDate().toString())+" "+(d.getHours().toString().length==2?d.getHours().toString():"0"+d.getHours().toString())+":"+((parseInt(d.getMinutes()/5)*5).toString().length==2?(parseInt(d.getMinutes()/5)*5).toString():"0"+(parseInt(d.getMinutes()/5)*5).toString())+":00";

    try{
        const updatedUser = await User.update({
                first_name: user.first_name,
                last_name : user.last_name,
                password : user.password,
                username : user.username,
                account_updated : date_format_str},
            {where:{ id: id}});

        if(updatedUser === null){
            return {userExists: false, message:"Couldn't find a user with the given name", user:{}};
        }else{
            return {userExists: true, message:"User found", user: updatedUser};
        }
    }catch(e){
        console.log(`exception while updating user---${e}`)
    }
}

const getProductBySKU = async (productSKU) => {
    try{
        const product = await Product.findOne({ where:{ sku : productSKU }});
        if(product === null){
            return {productExists: false, message:"Couldn't find a product with the given id", product:{}};
        }else{
            return {productExists: true, message:"Product found", product: product.toJSON()};
        }
    }catch(e){
        console.log(`exception while finding product---${e}`)
    }
}

const getProduct = async (productId) => {
    try{
        const product = await Product.findOne({ where:{ id : productId }});
        if(product === null){
            return {productExists: false, message:"Couldn't find a product with the given id", product:{}};
        }else{
            return {productExists: true, message:"Product found", product: product.toJSON()};
        }
    }catch(e){
        console.log(`exception while finding product---${e}`)
    }
}

const saveProduct = async (newProduct) => {
    try{
        const product = await Product.create(newProduct);
        return product.toJSON();
    }catch(e){
        console.log(`error while saving product -- ${e}`)
        return false;
    }
}

const updateProduct = async (product, productId) => {

    var d = new Date();
    d = new Date(d.getTime() - 3000000);
    var date_format_str = d.getFullYear().toString()+"-"+((d.getMonth()+1).toString().length==2?(d.getMonth()+1).toString():"0"+(d.getMonth()+1).toString())+"-"+(d.getDate().toString().length==2?d.getDate().toString():"0"+d.getDate().toString())+" "+(d.getHours().toString().length==2?d.getHours().toString():"0"+d.getHours().toString())+":"+((parseInt(d.getMinutes()/5)*5).toString().length==2?(parseInt(d.getMinutes()/5)*5).toString():"0"+(parseInt(d.getMinutes()/5)*5).toString())+":00";
    product.date_last_updated = date_format_str;
    try{
        const updatedProduct = await Product.update({...product}, { returning : true, where: { id : productId}});
        return updatedProduct;
    }catch(e){
        console.log(`error while trying to update product -- ${e}`)
        return false;
    }
}

const deleteProduct = async (productId) => {

    try{
        const deletedProduct = await Product.destroy({ returning : true, where: { id : productId}});
        return deletedProduct;
    }catch(e){
        console.log(`error while trying to delete product -- ${e}`)
        return false;
    }
}

module.exports = {
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
    deleteProduct
}