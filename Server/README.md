# ApplyFlow — Job Application Tracker API

ApplyFlow is a RESTful backend API for tracking job applications. It allows users to create accounts, authenticate securely, manage their job applications, and retrieve application records associated with their accounts.

The project was built to strengthen my understanding of backend engineering, REST API design, authentication, relational databases, and secure data access.

## Features

- **User authentication:** Register and log in using email and password.
- **Password hashing:** Secure password storage using bcrypt.
- **JWT authentication:** Protect API endpoints with JSON Web Tokens.
- **Application management:** Create, retrieve, update, and delete job applications.
- **User-specific access control:** Users can access and manage only their own applications.
- **Input validation:** Validate incoming data using Zod.
- **Application status management:** Track applications as Applied, Interview, Rejected, or Offer.
- **Filtering:** Filter applications by status and company.
- **Pagination:** Retrieve application records in manageable pages.
- **Relational data:** Associate applications with users and companies using PostgreSQL foreign keys.
- **Health check:** Verify that the API server is responding.

## Tech Stack

- **Runtime:** Node.js
- **Language:** JavaScript (ES Modules)
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Database client:** node-postgres (`pg`)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`)
- **Password hashing:** bcrypt
- **Validation:** Zod
- **Environment configuration:** dotenv

## Project Structure

```text
Server/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── application.controller.js
│   │   └── auth.controller.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── routes/
│   │   ├── application.routes.js
│   │   └── auth.routes.js
│   ├── validators/
│   │   └── auth.validator.js
│   └── server.js
├── .env
├── .gitignore
└── package.json
```

*This structure reflects the main files; adjust it if your repository contains additional modules or folders.*

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Rhea843/ApplyFlow.git
cd ApplyFLow/Server
```



### 2. Install dependencies

```bash
npm install
```

### 3. Create the database

Create a PostgreSQL database named:

```sql
CREATE DATABASE job_application_tracker;
```

Connect to the database and execute the SQL schema that defines the `users`, `companies`, and `applications` tables, along with the `application_status` enum.

Ensure your PostgreSQL setup supports `gen_random_uuid()`.

### 4. Configure environment variables

Create a `.env` file in the `Server` directory:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_application_tracker
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password

JWT_SECRET=your_generated_secret
```

Use your actual local database credentials. Generate a strong, random JWT secret and keep it private.

**Never commit your `.env` file or expose your database credentials or JWT secret.**

### 5. Start the development server

```bash
npm run dev
```

The API runs locally at:

```text
http://localhost:5000
```

Check the health endpoint:

```http
GET /health
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new user | Not required |
| POST | `/api/auth/login` | Log in and receive a JWT | Not required |

### Applications

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| GET | `/api/applications` | Retrieve the authenticated user's applications | Required |
| POST | `/api/applications` | Create an application | Required |
| PATCH | `/api/applications/:id` | Update an application | Required |
| DELETE | `/api/applications/:id` | Delete an application | Required |

All application routes require a valid JWT in the request header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Application Filtering and Pagination

The GET endpoint supports filtering by application status and company, along with pagination.

Examples:

```http
GET /api/applications?status=Applied
GET /api/applications?company=Microsoft
GET /api/applications?page=1&limit=10
```

Filters can be combined where supported by the implementation.

## Example Requests

### Register a user

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPassword123!"
}
```

### Log in

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "jane@example.com",
  "password": "StrongPassword123!"
}
```

Use the JWT returned by the login endpoint to authenticate subsequent application requests.

### Create an application

```http
POST /api/applications
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

```json
{
  "companyid": "YOUR_COMPANY_UUID",
  "position": "Backend Developer Intern",
  "location": "Lagos",
  "date_applied": "2026-10-27",
  "status": "Applied"
}
```

The `companyid` must reference an existing company record. The authenticated user's ID is derived from the verified token rather than accepted from the request body.

### Update an application

```http
PATCH /api/applications/YOUR_APPLICATION_UUID
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

```json
{
  "status": "Interview"
}
```

### Delete an application

```http
DELETE /api/applications/YOUR_APPLICATION_UUID
Authorization: Bearer YOUR_JWT_TOKEN
```

## Database Design

ApplyFlow uses three primary tables:

- **users:** Stores user identity and hashed passwords.
- **companies:** Stores company details.
- **applications:** Stores job application details and references both the user and company tables.

Each application belongs to one user and one company. Foreign keys maintain referential integrity, while the application ownership checks restrict access to the authenticated user's records.

Application statuses are constrained using a PostgreSQL enum:

- `Applied`
- `Interview`
- `Rejected`
- `Offer`

## Error Handling and HTTP Status Codes

The API uses HTTP status codes to communicate request outcomes.

| Status | Meaning |
|---|---|
| `200 OK` | Request completed successfully |
| `201 Created` | A resource was created |
| `400 Bad Request` | Invalid request data |
| `401 Unauthorized` | Missing, invalid, or expired authentication token |
| `404 Not Found` | Requested application not found or not owned by the user |
| `500 Internal Server Error` | Unexpected server-side failure |

Exact responses may vary by endpoint and validation failure.

## Security Considerations

- Passwords are hashed before storage.
- JWTs protect authenticated routes.
- SQL queries use parameterized values to reduce SQL injection risk.
- Application queries enforce ownership using the authenticated user's ID.
- Request payloads are validated before database operations.
- Sensitive configuration is kept in environment variables.

## Testing

The API can be tested with Postman.

Recommended test cases include:

- Successful registration and login.
- Duplicate email registration.
- Login with incorrect credentials.
- Requests with missing, malformed, or expired tokens.
- Creating, retrieving, updating, and deleting applications.
- Invalid application statuses and missing required fields.
- Attempts to modify another user's application.
- Filtering and pagination with valid and invalid parameters.

## Future Improvements

- Automated integration tests.
- Centralized error-handling middleware.
- OpenAPI/Swagger documentation.
- Database migrations and seed scripts.
- Rate limiting for authentication endpoints.
- Production deployment and hosted PostgreSQL.
- Continuous integration with GitHub Actions.

## What I Learned

Building ApplyFlow has helped me practise:

- Designing RESTful API endpoints.
- Working with relational databases and SQL joins.
- Implementing authentication with JWTs.
- Hashing and verifying passwords with bcrypt.
- Validating request data.
- Enforcing resource ownership and access control.
- Debugging API errors and testing endpoints with Postman.

## Author

**Victoria**

Backend development learner focused on JavaScript, Node.js, Express.js, PostgreSQL, and building reliable APIs.

