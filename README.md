# ByteChef Embedded Sample App

This repository contains a sample application demonstrating how to integrate with ByteChef's embedded workflow builder. The application consists of a backend service for JWT token generation and a frontend Next.js application that embeds the ByteChef workflow builder.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- [Git](https://git-scm.com/) (for cloning the repository)

## Project Structure

The project is organized into two main directories:

- `back-end/`: Contains the Node.js backend service for JWT token generation
- `front-end/`: Contains the Next.js frontend application

## Backend Setup and Running Instructions

The backend is a Node.js application that generates JWT tokens for authentication with the ByteChef API. For setup instructions, please refer to the `README.md` file inside the `back-end/` directory. 

## Frontend Setup and Running Instructions

The frontend is a Next.js application that embeds the ByteChef workflow builder. For setup instructions, please refer to the `README.md` file inside the `front-end/` directory.

## Releasing Templates to the App's Environment

After publishing automation templates, go to **Embedded › Automation Workflows** in ByteChef, expand the project, open
the **Configurations** tab and create a configuration for the environment the app runs against
(`BYTECHEF_ENVIRONMENT`), enabled and pinned to the published version. Without it the Automation Hub and templates
pages are empty. The Automation Code Playground does this automatically through the `release` flag on its deploy
request. See `front-end/README.md` for details.
