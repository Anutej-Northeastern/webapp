const client = require('./connection.js');
const express = require('express');
const app = express();


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
