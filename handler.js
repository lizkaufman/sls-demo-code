//This is where the functions live that the functions section of the YAML file points to. These functions get added to Lambda, where they'll run in their own containers (kind of like Docker) when they receive a request to the path/method specified in the YAML.

//TODO: Just to note, it's better practice to have each function in a separate file, so eventually I'll refactor this and annotate accordingly. For now though, they're all in this one file.

'use strict'; //enables strict mode, which makes things that normally cause warnings error out (keeps the code cleaner)
const AWS = require('aws-sdk'); //requires AWS; set up your credentials by following the instructions here: https://www.serverless.com/framework/docs/providers/aws/guide/credentials/
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2019.11.21' }); //creates a new instance of DynamoDB when called using the AWS SDK
const { v4: uuidv4 } = require('uuid'); //requires v4 within uuid - need to npm i uuid to use as well

const demoTable = process.env.DEMO_TABLE; //gets the table from the environment variables (which we've set up in the YAML) and saves it to a variable we can use in the functions below

//---------HELPER FUNCTION TO SEND RESPONSE JSONS WITH HEADERS:---------

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
    .get(params) //passes the params object to get to use it to look for the id in the table
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
      //passes the table name and the item we just created above to the put
      //NOTE: even though it's creating a new item and is set up in the YAML to respond to post requests, you still use put here when it's talking directly to DynamoDB (it puts a new item rather than putting a replacement here)
      TableName: demoTable,
      Item: item,
    })
    .promise()
    .then(() => {
      callback(null, response(200, item));
    })
    .catch((err) => response(null, response(err.statusCode, err)));
};

//---------UPDATE ITEM (PUT REQUEST):---------

module.exports.updateItem = (event, context, callback) => {
  const id = event.pathParameters.id; //gets the id out of the path params just like with get by id above
  const reqBody = JSON.parse(event.body); //parses the body just like with the post above

  const item = {
    //similar to the post above, using the body, but we already have the id from the params, so we use it and don't generate a new one with uuid
    id: id, //it'll use the id to match the item since it's the partition key
    createdAt: new Date().toISOString(), //I have this pulling double duty as an updated date as well; it'll repalce the initial createdAt date from when it was posted... there's probably a more elegant way of doing this though!
    name: reqBody.name,
    definition: reqBody.definition,
  };

  return db
    .put({
      //just like in the post above (still a put, but this time we're doing a put that we're used to, making a direct replacement of the item)
      TableName: demoTable,
      Item: item,
    })
    .promise()
    .then((res) => {
      callback(null, response(200, res));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
//TODO: This works well for simpler data (i.e. a simple form) where you can just put the whole object, incl. changes; this is what we used for Volt. For something more complex, I have code for a more patch-like edit function that targets a specific key/value in the item. It's a little more complicated, and I've never actually used it in my code from the front end though (only a few tests on Postman). Let me know if you have a burning desire for it and I can share it or add it here!

//---------DELETE ITEM:---------

module.exports.deleteItem = (event, context, callback) => {
  const id = event.pathParameters.id;

  const params = {
    //same params object as with the get by id function above
    Key: {
      id: id,
    },
    TableName: demoTable,
  };

  return db
    .delete(params) //params are passed to delete so that it can do what it says on the tin for the relevant item
    .promise()
    .then(() =>
      callback(null, response(200, { message: `${id} deleted successfully` }))
    )
    .catch((err) => callback(null, response(err.statusCode, err)));
};
