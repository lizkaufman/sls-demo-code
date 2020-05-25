'use strict';
const AWS = require('aws-sdk'); //requires AWS
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2019.11.21' }); //creates a new instance of DynamoDB when called using the AWS SDK
const { v4: uuidv4 } = require('uuid'); //requires v4 within uuid - need to npm i uuid to use as well

const demoTable = process.env.DEMO_TABLE; //gets the table from the environment variables (which we've set up in the YAML) and saves it to a variable we can use in the functions below

//---------HELPER FUNCTION TO SEND RESPONSES WITH HEADERS:---------

//This saves you from having to do these bits in each function :)
function response(statusCode, message) {
  //takes in the status code and a message (an object)
  return {
    statusCode: statusCode,
    //gives us back the status code it's received
    headers: {
      //sticks all the right headers on to talk to the request during the preflight check (CORS)
      'Access-Control-Allow-Headers': 'Content-Type', //all fetch requests on the front end need 'Content-Type': 'application/json' as a header!!
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT, DELETE',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message), //stringifies the message object into JSON
  };
}

//---------GET ALL ITEMS IN THE TABLE:---------

module.exports.getAllItems = (event, context, callback) => {
  // all lambda functions take in event (the request) along with context (haven't worked out what that's for yet) and callback (which then lets you use that response function above)

  return db //creates an instance of DynamoDB
    .scan({
      //scan is DynamoDB-speak for getting all the items
      TableName: demoTable, //which table to scan
    })
    .promise()
    .then((res) => callback(null, response(200, res.Items))) //status code 200 for success and message becomes JSON with all of the items in the table
    .catch((err) => callback(null, response(err.statusCode, err))); //error handling, getting the status code from the error and the error itself as the message
};

//---------GET A SINGLE ITEM BY ID:---------

module.exports.getItemById = (event, context, callback) => {
  const id = event.pathParameters.id; //gets the id out of the parameters of the event aka the request (the equivalent of doing req.params)

  const params = {
    //separate params object to tell the db which table and to use the id as the key (which will work because we set up the id in the YAML to be the partition key)
    Key: {
      id: id,
    },
    TableName: demoTable,
  };

  return db
    .get(params)
    .promise()
    .then((res) => {
      if (res.Item) callback(null, response(200, res.Item));
      //checks if there's an item with that id; if so, it's stored in res.Item
      else
        callback(
          null,
          response(404, { error: 'No item with that name found' })
        ); //if it doesn't find anything w/ that id, you send a 404 error instead
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

//---------POST NEW ITEM:---------

module.exports.addItem = (event, context, callback) => {
  //I've set up the example item below as a dictionary entry with a name key and a definition key; you can have as many as you want (just like a standard JSON); you just have to tell it what to expect below
  //example JSON in request: {"name": "petrichor", "definition": "the smell after rain"}

  const reqBody = JSON.parse(event.body); //parses the whole body out of the event (the request) and saves it to a variable

  const item = {
    //creates the item that will then be added to the database, incl the bits from the request body
    id: uuidv4(), //uses uuid to automatically generate a new unique id for the item
    createdAt: new Date().toISOString(), //automatically adds a human-readable date to the item as well
    name: reqBody.name, //destructures the name string out of the request body and saves it to the name key for the database
    definition: reqBody.definition, //destructures the definition string out of the request body and saves it to the definition key for the database
  };

  return db
    .put({
      TableName: benismsTable,
      Item: benism,
    })
    .promise()
    .then(() => {
      callback(null, response(200, benism));
    })
    .catch((err) => response(null, response(err.statusCode, err)));
};
