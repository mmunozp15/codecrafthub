// app.js
const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = 5000;

// The JSON file will be created in the same folder as this app.js file.
const COURSES_FILE = path.join(__dirname, "courses.json");

// Allowed course status values
const VALID_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed"
];

/*
  Middleware that allows Express to read JSON request bodies.
*/
app.use(express.json());

/*
  Custom application error class.
  This makes it easier to return consistent error responses
  with an appropriate HTTP status code.
*/
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

/*
  Create courses.json automatically if it does not already exist.
  The file starts as an empty JSON array.
*/
async function initializeDataFile() {
  try {
    await fs.access(COURSES_FILE);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(COURSES_FILE, "[]", "utf8");
      console.log("Created courses.json");
    } else {
      throw error;
    }
  }
}

/*
  Read all courses from courses.json.
*/
async function readCourses() {
  try {
    const fileContents = await fs.readFile(COURSES_FILE, "utf8");
    if (!fileContents.trim()) {
      return [];
    }
    const courses = JSON.parse(fileContents);
    if (!Array.isArray(courses)) {
      throw new AppError(
        "courses.json must contain a JSON array",
        500
      );
    }
    return courses;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new AppError(
        "courses.json contains invalid JSON",
        500
      );
    }
    throw new AppError(
      "Unable to read courses.json",
      500
    );
  }
}

/*
  Save all courses to courses.json.
*/
async function writeCourses(courses) {
  try {
    const jsonData = JSON.stringify(courses, null, 2);
    await fs.writeFile(COURSES_FILE, jsonData, "utf8");
  } catch (error) {
    throw new AppError(
      "Unable to write to courses.json",
      500
    );
  }
}

/*
  Check whether a date uses the exact YYYY-MM-DD format.
*/
function isValidDateFormat(dateString) {
  if (typeof dateString !== "string") {
    return false;
  }
  const formatMatches = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  if (!formatMatches) {
    return false;
  }
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/*
  Validate the required fields for a course.
*/
function validateCourseData(courseData) {
  const {
    name,
    description,
    target_date,
    status
  } = courseData;

  if (typeof name !== "string" || name.trim() === "") {
    throw new AppError("The name field is required", 400);
  }
  if (typeof description !== "string" || description.trim() === "") {
    throw new AppError("The description field is required", 400);
  }
  if (typeof target_date !== "string" || target_date.trim() === "") {
    throw new AppError("The target_date field is required", 400);
  }
  if (!isValidDateFormat(target_date)) {
    throw new AppError("target_date must use the format YYYY-MM-DD", 400);
  }
  if (typeof status !== "string" || status.trim() === "") {
    throw new AppError("The status field is required", 400);
  }
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError(
      `Invalid status. Status must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }
}

/*
  Generate the next course ID starting at 1.
*/
function generateNextId(courses) {
  if (courses.length === 0) {
    return 1;
  }
  const highestId = Math.max(
    ...courses.map((course) => Number(course.id) || 0)
  );
  return highestId + 1;
}

/*
  POST /api/courses - Add a new course.
*/
app.post("/api/courses", async (req, res, next) => {
  try {
    validateCourseData(req.body);
    const courses = await readCourses();
    const newCourse = {
      id: generateNextId(courses),
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      target_date: req.body.target_date,
      status: req.body.status,
      created_at: new Date().toISOString()
    };
    courses.push(newCourse);
    await writeCourses(courses);
    res.status(201).json({
      message: "Course created successfully",
      course: newCourse
    });
  } catch (error) {
    next(error);
  }
});

/*
  GET /api/courses - Return all courses.
*/
app.get("/api/courses", async (req, res, next) => {
  try {
    const courses = await readCourses();
    res.status(200).json(courses);
  } catch (error) {
    next(error);
  }
});

/*
  GET /api/courses/:id - Return one course by ID.
*/
app.get("/api/courses/:id", async (req, res, next) => {
  try {
    const courseId = Number(req.params.id);
    const courses = await readCourses();
    const course = courses.find((item) => item.id === courseId);
    if (!course) {
      throw new AppError("Course not found", 404);
    }
    res.status(200).json(course);
  } catch (error) {
    next(error);
  }
});

/*
  PUT /api/courses/:id - Update an existing course.
*/
app.put("/api/courses/:id", async (req, res, next) => {
  try {
    const courseId = Number(req.params.id);
    validateCourseData(req.body);
    const courses = await readCourses();
    const courseIndex = courses.findIndex(
      (item) => item.id === courseId
    );
    if (courseIndex === -1) {
      throw new AppError("Course not found", 404);
    }
    const existingCourse = courses[courseIndex];
    const updatedCourse = {
      id: existingCourse.id,
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      target_date: req.body.target_date,
      status: req.body.status,
      created_at: existingCourse.created_at
    };
    courses[courseIndex] = updatedCourse;
    await writeCourses(courses);
    res.status(200).json({
      message: "Course updated successfully",
      course: updatedCourse
    });
  } catch (error) {
    next(error);
  }
});

/*
  DELETE /api/courses/:id - Delete a course by ID.
*/
app.delete("/api/courses/:id", async (req, res, next) => {
  try {
    const courseId = Number(req.params.id);
    const courses = await readCourses();
    const courseIndex = courses.findIndex(
      (item) => item.id === courseId
    );
    if (courseIndex === -1) {
      throw new AppError("Course not found", 404);
    }
    const deletedCourse = courses[courseIndex];
    courses.splice(courseIndex, 1);
    await writeCourses(courses);
    res.status(200).json({
      message: "Course deleted successfully",
      course: deletedCourse
    });
  } catch (error) {
    next(error);
  }
});

/*
  Handle 404 routes.
*/
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/*
  Handle malformed JSON request bodies.
*/
app.use((error, req, res, next) => {
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    error.type === "entity.parse.failed"
  ) {
    return res.status(400).json({
      error: "Request body contains invalid JSON"
    });
  }
  next(error);
});

/*
  Central error-handling middleware.
*/
app.use((error, req, res, next) => {
  console.error(error);
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal server error" : error.message
  });
});

/*
  Start the server.
*/
initializeDataFile()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CodeCraftHub API is running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize courses.json:", error.message);
    process.exit(1);
  });