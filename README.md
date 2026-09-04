# CodeCraftHub

CodeCraftHub is a simple REST API for tracking personal learning goals and courses. It is built with Node.js and Express and stores course data in a local `courses.json` file instead of using a database.

## Project Overview

Each course represents a learning goal and includes:
- Course name
- Course description
- Target completion date
- Current learning status
- Automatically generated ID
- Automatically generated creation timestamp

## Features

- Create a new course
- View all courses
- View a specific course
- Update an existing course
- Delete a course
- Automatically create `courses.json` if it does not exist
- Validate required fields and formats (`YYYY-MM-DD`)

## Technologies Used

- Node.js
- Express
- JSON file storage

## Installation & How to Run

1. Navigate to the project directory:
   ```bash
   cd codecrafthub


   Install dependencies:

Bash
npm install
Start the application:

Bash
npm start