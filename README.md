# Serverless demo code

On 26 May 2020, I gave a talk to some of my School of Code cohort buddies reviewing Serverless and using it to set up a simple RESTful back end with CRUD routes on AWS.

Here's my code to use as a model/cheat sheet for your own back end. I've absolutely flooded it with comments with the intention that each line in the YAML and each new line in the handler has an explanation so you know what that bit is doing and how it fits in with the rest.

## Other useful links:

- AWS quick-start guide on the Serverless docs: https://www.serverless.com/framework/docs/providers/aws/guide/quick-start/
- How to set up your AWS account credentials to talk to Serverless: https://www.serverless.com/framework/docs/providers/aws/guide/credentials/
- Serverless blog post on how to combat CORS:
https://www.serverless.com/blog/cors-api-gateway-survival-guide/
- @goserverless – Tweet them if you’re stuck! They’re really helpful.

## Commands:

- npm i -g serverless (installs Serverless globally on your machine the first time you use it)
- serverless (starts your project and asks you the setup questions)
- sls deploy (sends your code to AWS once you've set up your credentials; redeploy using this every time you make changes, and it'll swap out the old code with the new; also, it'll give you your URLS for your end points in the console for you to copy and paste once it's deployed your code)
