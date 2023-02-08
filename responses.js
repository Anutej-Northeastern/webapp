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

const set501Response = (obj, response) => {
    response.status(501);
    response.json(obj);
}

module.exports = {set200Response, set403Response, set201Response, set204Response, set400Response, set401Response, set501Response}