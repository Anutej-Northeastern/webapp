const client = require('./connection.js');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const saveUser = async(newUser) => {

    return new Promise((resolve, reject)=>{
        let insertQuery = `insert into users(first_name, last_name, username, password) 
                       values('${newUser.first_name}', '${newUser.last_name}', '${newUser.username}', '${newUser.password}') RETURNING id, first_name, last_name, username, account_created, account_updated `;
        
        client.query(insertQuery, (err, result)=>{
            if(!err){
                resolve(result.rows[0]);
            }
            else{ 
                reject('Cannot create a new user'); 
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
            resolve(true);
        }else{
            resolve(false);
        }
    })
}


const getUser = async (username, additional) => {

    return new Promise((resolve, reject)=>{
        let q = `Select * from users where username = '${username}'`;
        client.query(q, (err, result)=>{
                if(!err){
                    if(additional === 'check'){
                        if(result.rows.length>0){
                           resolve(true)
                        }else{
                            resolve(false)
                        }
                    }else{
                        resolve(result.rows[0]);
                    }    
                }
                else{
                    resolve(false);
                }
        });
        client.end;
    })          
    
}

const update = (user, id) => {
    var d = new Date();
    d = new Date(d.getTime() - 3000000);
    var date_format_str = d.getFullYear().toString()+"-"+((d.getMonth()+1).toString().length==2?(d.getMonth()+1).toString():"0"+(d.getMonth()+1).toString())+"-"+(d.getDate().toString().length==2?d.getDate().toString():"0"+d.getDate().toString())+" "+(d.getHours().toString().length==2?d.getHours().toString():"0"+d.getHours().toString())+":"+((parseInt(d.getMinutes()/5)*5).toString().length==2?(parseInt(d.getMinutes()/5)*5).toString():"0"+(parseInt(d.getMinutes()/5)*5).toString())+":00";

    return new Promise((resolve, reject)=>{
        
        let updateQuery = `update users set first_name = '${user.first_name}', last_name = '${user.last_name}', password = '${user.password}', username = '${user.username}', account_updated = timestamp '${date_format_str}' where id = ${id}`;
        client.query(updateQuery, (err, result)=>{
            if(!err){
                resolve(true);
            }
            else{ 
                reject(false) 
            }
        })
        client.end;
    })   
}

const comparePasswords = (password, hashedPassword) =>{

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

module.exports = {
    saveUser,
    hashPassword,
    emailValidation,
    getUser,
    update,
    comparePasswords
    
}