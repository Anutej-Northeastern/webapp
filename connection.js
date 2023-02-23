const {Client} = require('pg')
require('dotenv').config()

const client = new Client({
    host: "localhost",
    user: "webapp",
    port: 5432,
    password: "postgres",
    database: "webapp"
})

module.exports = client
