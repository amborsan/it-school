import express from "express";
import usersRouter from "./routes/users.js";
import studentsRouter from "./routes/students.js";
import teachersRouter from "./routes/teachers.js";
import coursesRouter from "./routes/courses.js";
import employeesRouter from "./routes/employees.js";
import enrollmentsRouter from "./routes/enrollments.js";
import assignmentsRouter from "./routes/assignments.js";
import submissionsRouter from "./routes/submissions.js";
import gradesRouter from "./routes/grades.js";
import courseMaterialsRouter from "./routes/courseMaterials.js";
import paymentsRouter from "./routes/payments.js";
import eventsRouter from "./routes/events.js";
import reviewsRouter from "./routes/reviews.js";
import auditLogsRouter from "./routes/auditLogs.js";
import { errorHandler } from "./middleware/error-handler.js";
import { readSecurityConfig } from "./config/security.js";
import { authorizeResource } from "./middleware/authorize-resource.js";
import { authRouter } from "./routes/auth.js";
import { requireUser } from "./middleware/authenticate.js";
import { requireCsrf } from "./auth/csrf.js";
import { installSecurity } from "./middleware/security.js";

export function createApp(config = readSecurityConfig()) {
  const app = express();
  app.locals.config = config;
  const { authLimiter, limitWrites } = installSecurity(app, config);

  app.get("/", (req, res) => {
    res.json({
      message: "Express + Prisma API",
      users: "/users",
      resources: {
        user: "/users",
        student: "/students",
        teacher: "/teachers",
        course: "/courses",
        employee: "/employees",
        enrollment: "/enrollments",
        assignment: "/assignments",
        submission: "/submissions",
        grade: "/grades",
        courseMaterial: "/course-materials",
        payment: "/payments",
        event: "/events",
        review: "/reviews",
        auditLog: "/audit-logs",
      },
    });
  });

  // Public auth routes enforce CSRF and limits themselves; resource bodies follow authentication.
  app.use("/auth", authRouter(authLimiter));
  app.use(requireUser);
  app.use(requireCsrf);
  app.use(limitWrites);
  app.use(express.json({ limit: "10kb" }));

  app.use("/users", authorizeResource("user"), usersRouter);
  app.use("/students", authorizeResource("student"), studentsRouter);
  app.use("/teachers", authorizeResource("teacher"), teachersRouter);
  app.use("/courses", authorizeResource("course"), coursesRouter);
  app.use("/employees", authorizeResource("employee"), employeesRouter);
  app.use("/enrollments", authorizeResource("enrollment"), enrollmentsRouter);
  app.use("/assignments", authorizeResource("assignment"), assignmentsRouter);
  app.use("/submissions", authorizeResource("submission"), submissionsRouter);
  app.use("/grades", authorizeResource("grade"), gradesRouter);
  app.use(
    "/course-materials",
    authorizeResource("courseMaterial"),
    courseMaterialsRouter,
  );
  app.use("/payments", authorizeResource("payment"), paymentsRouter);
  app.use("/events", authorizeResource("event"), eventsRouter);
  app.use("/reviews", authorizeResource("review"), reviewsRouter);
  app.use("/audit-logs", authorizeResource("auditLog"), auditLogsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Route not found." });
  });

  // Express 5 forwards rejected async controller promises here.
  app.use(errorHandler);
  return app;
}

// Startup and existing CRUD tests share this instance; isolated tests use createApp.
export const app = createApp();
