const set200Response = (obj, response) => {
    response.status(200);
    response.json(obj);
}

const set201Response = (obj, response) => {
    response.status(201);
    response.json(obj);
}

const set204Response = (obj, response) => {
    response.status(204);
    response.json(obj);
}

const set400Response = (obj, response) => {
    response.status(400);
    response.json(obj);
}

const set401Response = (obj, response) => {
    response.status(401);
    response.json(obj);
}

const set403Response = (obj, response) => {
    response.status(403);
    response.json(obj);
}

const set404Response = (obj, response) => {
    response.status(404);
    response.json(obj);
}
const set418Response = (obj, response) => {
    response.status(418);
    response.json(obj);
}
const set501Response = (obj, response) => {
    response.status(501);
    response.json(obj);
}
const set503Response = (obj, response) => {
    response.status(503);
    response.json(obj);
}

module.exports = {
    set200Response,
    set201Response,
    set204Response,
    set400Response,
    set401Response,
    set403Response,
    set404Response,
    set418Response,
    set501Response,
    set503Response
}