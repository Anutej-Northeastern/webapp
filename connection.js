const {Client} = require('pg')
require('dotenv').config()

const client = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "postgres",
    database: "postgres"
})

// const client = new Client({
//     host: process.env.PG_HOST,
//     user: process.env.PG_USER,
//     port: process.env.PG_PORT,
//     password: process.env.PG_PASSWORD,
//     database: process.env.PG_DATABASE
// })

module.exports = client
