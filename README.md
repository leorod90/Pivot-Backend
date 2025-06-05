### run command
node index.js

## API Endpoints
https://pivot-backend-n1u5.onrender.com/

## Authentication

### Register new user

POST /auth/register
Content-Type: application/json

{
  "username": "yourUsername",
  "password": "yourPassword"
}

### Login

POST /auth/login
Content-Type: application/json

{
  "username": "yourUsername",
  "password": "yourPassword"
}

## Profiles

### Get all profiles

GET /profiles

### Get one profiles

GET /profiles/:id

### Create a profile

POST /profiles
Content-Type: application/json

{
  "name": "Your Name",
  "image": "Image URL",
  "description": "Description about you",
  "ownerId": "Your user ID from register/login"
}

### Update a profile

PUT /profiles/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "image": "Updated Image URL",
  "description": "Updated Description",
  "ownerId": "Your user ID"
}

## Comments

### Get comments for a profile

GET /profiles/:id/comments

### Add comment to profile

POST /profiles/:id/comments
Content-Type: application/json

{
  "text": "Your comment text",
  "ownerId": "Your user ID"
}

### Update comment
PUT /comments/:id
Content-Type: application/json

{
  "text": "Updated comment text",
  "ownerId": "Your user ID"
}


### Delete comment

DELETE /comments/:id
Content-Type: application/json

{
  "ownerId": "Your user ID"
}
