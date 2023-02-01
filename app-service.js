const client = require('./connection.js');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const save = async(newUser) => {

    return new Promise((resolve, reject)=>{
        let insertQuery = `insert into users(first_name, last_name, username, password) 
                       values('${newUser.first_name}', '${newUser.last_name}', '${newUser.username}', '${newUser.password}') RETURNING id, first_name, last_name, username, account_created, account_updated `;
        
        client.query(insertQuery, (err, result)=>{
            if(!err){
                resolve(result.rows[0]);
            }
            else{ 
                reject('Broke while creating a new user'); 
            }
        })
        client.end;
    })    
}


const hashPassword = (password) => {

    return new Promise((resolve, reject)=>{
                    
        bcrypt.genSalt(saltRounds, function(error, salt){
            if(!error){
                bcrypt.hash(password, salt, function(error, hash){
                    if(!error){
                        console.log(hash);
                        resolve(hash);
                    }else{
                        reject(password);
                    }
                    
                })
            }else{
                reject(password);
            }    
        }) 
    }) 
    
}



const  emailValidation = (input) =>{
    return new Promise((resolve, reject)=>{
        var validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        if(validRegex.test(String(input).toLowerCase())){
            console.log("valid email");
            resolve(true);
        }else{
            console.log("invalid email");
            resolve(false);
        }
    })
}


const getUser = async (username) => {

    return new Promise((resolve, reject)=>{
        let q = `Select * from users where username = '${username}'`;
        client.query(q, (err, result)=>{
                if(!err){
                    console.log(result.rows[0]);
                    resolve(result.rows[0]);
                }
                else{
                    reject(`something went wrong while trying to query user with username:${username}`);
                }
        });
        client.end;
    })          
    
}



module.exports = {
    save,
    hashPassword,
    emailValidation,
    getUser
    
}