# webapp

# CSYE 6225 Webapp


This assignment is for creating rest end point for checking health end point for get end point, user endpoints for put, post and get methods.
## Softwares Used:
1. Any IDE/ text editor of choice.
2. Postman
3. Pgadmin 4
   
## How to Build?

1. The project resides on the repo webapp in Anutej-Northeastern organization.
2. To make changes to the repo code, fork the repo and clone it locally by running the below command: `git clone <link to forked repo>`
3. After cloning the repo locally run the below command after opening the project in IDE of choice:
`npm i`
1. Open Pgadmin to create a table that follows the below sql schema of the table
   `CREATE TABLE users (
  id integer,
  account_created timestamp without time zone,
  account_updated timestamp without time zone,
  username text,
  password text,
  first_name text,
  last_name text
);`

## How to Test?
1. Once the project is open you can run the below command to run tests that are pre written in the codebase : 
`npm test`
2. To test the API end points manually, move to the root folder of the project and run `node server.js`
3. Once you get a prompt that "server is listening on port 3300" open postman or any rest client.
4. The end points and the expected results are mentioned in [swaggerLink](https://app.swaggerhub.com/apis-docs/csye6225-webapp/cloud-native-webapp/spring2023-a1#/)

## How to Deploy?
1. Once the changes are made in the feature branch locally, add the changed files to the branch using the below command: `git add <file names>`
2. Once this is done, commit the changes and push them to the feature branch.
3. Now create a Pull request to merge the changes to the organization repo after the github action runs successfully. 
   
## Programming Lanuage used
   Node.js -19.x

## Third party libraries

Below are the dependencies used for building the project:

    "bcrypt": "^5.1.0",
    "cors": "^2.8.5",
    "debug": "^4.3.4",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "pg": "^8.9.0",
    "supertest": "^6.3.3""bcrypt": "^5.1.0",
    "cors": "^2.8.5",
    "debug": "^4.3.4",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "pg": "^8.9.0",
    "supertest": "^6.3.3"
    "jest": "^29.4.1"

