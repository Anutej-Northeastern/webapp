require("dotenv").config();
module.exports = {
	development: {
		// host: "localhost",
		// port: "5432",
		// username: "postgres",
		// password: "postgres",
		// database: "postgres",
		// dialect: "postgres",
		host: process.env.DB_HOST.split(':')[0],
		port: "5432",
		username: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		dialect: "postgres",
	},
};
