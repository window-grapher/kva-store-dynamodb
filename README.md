
# Key-Value Store System

This system utilizes AWS DynamoDB to offer an API for storing, retrieving, and deleting key-value data. Authentication is conducted through JWT tokens or secret tokens.

## Features

- **Adding Data (POST)**: Saves a new key-value pair.
- **Retrieving Data (GET)**: Retrieves data corresponding to a specified key.
- **Deleting Data (DELETE)**: Deletes data for a specified key.

## Interface

### POST /addItem

- **Authentication Required**: Yes
- **Body Parameters**:
  - `key`: The key to identify the data.
  - `data`: The data to be saved.
  - `readable`: Users who have read permission for the data.

### GET /getItem?key={key}&limit={limit}

- **Authentication Required**: Yes
- **Parameters**:
  - `key`: The key of the data to retrieve.
  - `limit`: The maximum number of data items to retrieve (optional).

### DELETE /deleteItem

- **Authentication Required**: Yes
- **Body Parameters**:
  - `key`: The key of the data to delete.
  - `created`: The creation date-time of the data.

## Authentication

- **JWT Token**: Passed in the `Authorization` header as `Bearer {token}`.
- **Secret Token**: Uses a secret token for accessing specific endpoints.

## Actions Based on Authentication Status and Roles

| Action           | Without Authentication | With Authentication (Regular User) | With Authentication (Admin) |
|------------------|------------------------|------------------------------------|-----------------------------|
| Adding Data      | Not Possible           | Possible (Own data only)           | Possible (Any data)         |
| Retrieving Data  | Possible (public data) | Possible (Own data and public data)| Possible (Any data)         |
| Deleting Data    | Not Possible           | Possible (Own data only)           | Possible (Any data)         |

- **Regular User**:
  - Can add data with their own user ID as the owner.
  - Can retrieve their own data or data marked as public.
  - Can delete their own data.
- **Admin**:
  - Can add, retrieve, and delete any data in the database, regardless of the owner.

## Error Responses

- `405 Method Not Allowed`: An unsupported HTTP method was used.
- `400 Bad Request`: Required parameters are missing or invalid.
- `401 Unauthorized`: Authentication failed.
- `403 Forbidden`: An unauthorized action was attempted.
- `500 Internal Server Error`: An error occurred within the server.

## Reserved Words and Details

The system restricts the use of certain keys that are reserved for system use. The following is a list of reserved words and their implications:

- **system***: Keys starting with `system` are reserved for internal system functionality and cannot be used by users for adding, retrieving, or deleting data. Attempting to use a reserved key will result in a `400 Bad Request` error.

|reserved key|detail|
|---|---|
|systemSecretToken-xxx|secretToken|
|systemUser-xxxx|user data|
