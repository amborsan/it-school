import { hashPassword } from "../src/auth/passwords.js";
import { prisma } from "../src/prisma.js";

// Development only: fixed UUIDs make reruns update these demo records.
// Passwords use the same randomized hash format as the account API.
const users = [
  {
    id: "00000001-0000-4000-8000-000000000001",
    email: "demo.maya.bennett@example.com",
    firstName: "Maya",
    lastName: "Bennett",
    fullName: "Maya Bennett",
    role: "STUDENT",
    phone: "+49 30 5550 0001",
    address: "1 Example Street, Berlin",
  },
  {
    id: "00000001-0000-4000-8000-000000000002",
    email: "demo.liam.fischer@example.com",
    firstName: "Liam",
    lastName: "Fischer",
    fullName: "Liam Fischer",
    role: "STUDENT",
    phone: "+49 30 5550 0002",
    address: "2 Example Street, Berlin",
  },
  {
    id: "00000001-0000-4000-8000-000000000003",
    email: "demo.sofia.reed@example.com",
    firstName: "Sofia",
    lastName: "Reed",
    fullName: "Sofia Reed",
    role: "STUDENT",
    phone: "+49 30 5550 0003",
    address: "3 Example Street, Berlin",
  },
  {
    id: "00000001-0000-4000-8000-000000000004",
    email: "demo.daniel.weber@example.com",
    firstName: "Daniel",
    lastName: "Weber",
    fullName: "Daniel Weber",
    role: "TEACHER",
    phone: "+49 30 5550 0004",
    address: "4 Example Street, Berlin",
  },
  {
    id: "00000001-0000-4000-8000-000000000005",
    email: "demo.amira.khan@example.com",
    firstName: "Amira",
    lastName: "Khan",
    fullName: "Amira Khan",
    role: "TEACHER",
    phone: "+49 30 5550 0005",
    address: "5 Example Street, Berlin",
  },
  {
    id: "00000001-0000-4000-8000-000000000006",
    email: "demo.oliver.chen@example.com",
    firstName: "Oliver",
    lastName: "Chen",
    fullName: "Oliver Chen",
    role: "TEACHER",
    phone: "+49 30 5550 0006",
    address: "6 Example Street, Berlin",
  },
  {
    id: "00000001-0000-4000-8000-000000000007",
    email: "demo.emma.brooks@example.com",
    firstName: "Emma",
    lastName: "Brooks",
    fullName: "Emma Brooks",
    role: "EMPLOYEE",
    phone: "+49 30 5550 0007",
    address: "7 Example Street, Berlin",
  },
  {
    id: "00000001-0000-4000-8000-000000000008",
    email: "demo.noah.keller@example.com",
    firstName: "Noah",
    lastName: "Keller",
    fullName: "Noah Keller",
    role: "EMPLOYEE",
    phone: "+49 30 5550 0008",
    address: "8 Example Street, Berlin",
  },
  {
    id: "00000001-0000-4000-8000-000000000009",
    email: "demo.ava.morgan@example.com",
    firstName: "Ava",
    lastName: "Morgan",
    fullName: "Ava Morgan",
    role: "EMPLOYEE",
    phone: "+49 30 5550 0009",
    address: "9 Example Street, Berlin",
  },
];

const students = [
  {
    id: "00000002-0000-4000-8000-000000000001",
    userId: "00000001-0000-4000-8000-000000000001",
    studentId: "DEMO-STU-001",
    dateOfBirth: new Date("2003-04-12T10:00:00.000Z"),
    enrollmentDate: new Date("2026-09-01T10:00:00.000Z"),
  },
  {
    id: "00000002-0000-4000-8000-000000000002",
    userId: "00000001-0000-4000-8000-000000000002",
    studentId: "DEMO-STU-002",
    dateOfBirth: new Date("2002-11-08T10:00:00.000Z"),
    enrollmentDate: new Date("2026-09-01T10:00:00.000Z"),
  },
  {
    id: "00000002-0000-4000-8000-000000000003",
    userId: "00000001-0000-4000-8000-000000000003",
    studentId: "DEMO-STU-003",
    dateOfBirth: new Date("2004-01-23T10:00:00.000Z"),
    enrollmentDate: new Date("2026-09-01T10:00:00.000Z"),
  },
];

const teachers = [
  {
    id: "00000003-0000-4000-8000-000000000001",
    userId: "00000001-0000-4000-8000-000000000004",
    employeeId: "DEMO-TCH-001",
    department: "Computer Science",
    position: "Programming Instructor",
    hireDate: new Date("2022-08-15T10:00:00.000Z"),
  },
  {
    id: "00000003-0000-4000-8000-000000000002",
    userId: "00000001-0000-4000-8000-000000000005",
    employeeId: "DEMO-TCH-002",
    department: "Data Science",
    position: "Database Instructor",
    hireDate: new Date("2023-02-01T10:00:00.000Z"),
  },
  {
    id: "00000003-0000-4000-8000-000000000003",
    userId: "00000001-0000-4000-8000-000000000006",
    employeeId: "DEMO-TCH-003",
    department: "Web Development",
    position: "Web Instructor",
    hireDate: new Date("2021-09-01T10:00:00.000Z"),
  },
];

const employees = [
  {
    id: "00000004-0000-4000-8000-000000000001",
    userId: "00000001-0000-4000-8000-000000000007",
    employeeId: "DEMO-EMP-001",
    department: "Administration",
    position: "School Coordinator",
    hireDate: new Date("2023-01-09T10:00:00.000Z"),
    salary: "4200.00",
    isActive: true,
  },
  {
    id: "00000004-0000-4000-8000-000000000002",
    userId: "00000001-0000-4000-8000-000000000008",
    employeeId: "DEMO-EMP-002",
    department: "IT Support",
    position: "Systems Technician",
    hireDate: new Date("2024-03-04T10:00:00.000Z"),
    salary: "3800.50",
    isActive: true,
  },
  {
    id: "00000004-0000-4000-8000-000000000003",
    userId: "00000001-0000-4000-8000-000000000009",
    employeeId: "DEMO-EMP-003",
    department: "Student Services",
    position: "Student Advisor",
    hireDate: new Date("2022-06-20T10:00:00.000Z"),
    salary: "3950.00",
    isActive: true,
  },
];

const courses = [
  {
    id: "00000005-0000-4000-8000-000000000001",
    code: "DEMO-CS101",
    title: "Introduction to Programming",
    description:
      "Learn variables, functions, and problem solving with JavaScript.",
    instructorId: "00000003-0000-4000-8000-000000000001",
    credits: 3,
    level: "BASIC",
    prerequisites: [],
    maxStudents: 30,
  },
  {
    id: "00000005-0000-4000-8000-000000000002",
    code: "DEMO-DB201",
    title: "Relational Databases",
    description:
      "Design PostgreSQL databases and query them with SQL and Prisma.",
    instructorId: "00000003-0000-4000-8000-000000000002",
    credits: 4,
    level: "INTERMEDIATE",
    prerequisites: ["DEMO-CS101"],
    maxStudents: 25,
  },
  {
    id: "00000005-0000-4000-8000-000000000003",
    code: "DEMO-WEB301",
    title: "Backend Web Development",
    description: "Build Express APIs with validation and relational data.",
    instructorId: "00000003-0000-4000-8000-000000000003",
    credits: 4,
    level: "ADVANCED",
    prerequisites: ["DEMO-CS101", "DEMO-DB201"],
    maxStudents: 20,
  },
];

const enrollments = [
  {
    id: "00000006-0000-4000-8000-000000000001",
    studentId: "00000002-0000-4000-8000-000000000001",
    courseId: "00000005-0000-4000-8000-000000000001",
    status: "ACTIVE",
    enrolledAt: new Date("2026-09-01T10:00:00.000Z"),
  },
  {
    id: "00000006-0000-4000-8000-000000000002",
    studentId: "00000002-0000-4000-8000-000000000002",
    courseId: "00000005-0000-4000-8000-000000000002",
    status: "ACTIVE",
    enrolledAt: new Date("2026-09-01T10:00:00.000Z"),
  },
  {
    id: "00000006-0000-4000-8000-000000000003",
    studentId: "00000002-0000-4000-8000-000000000003",
    courseId: "00000005-0000-4000-8000-000000000003",
    status: "ACTIVE",
    enrolledAt: new Date("2026-09-01T10:00:00.000Z"),
  },
];

const assignments = [
  {
    id: "00000007-0000-4000-8000-000000000001",
    courseId: "00000005-0000-4000-8000-000000000001",
    title: "JavaScript Functions",
    description: "Write reusable functions for a simple calculator.",
    dueDate: new Date("2026-10-20T10:00:00.000Z"),
    maxPoints: 100,
    fileUrl: "https://example.com/demo/assignments/functions.pdf",
  },
  {
    id: "00000007-0000-4000-8000-000000000002",
    courseId: "00000005-0000-4000-8000-000000000002",
    title: "School Database Design",
    description: "Create an entity relationship diagram for a school.",
    dueDate: new Date("2026-10-22T10:00:00.000Z"),
    maxPoints: 100,
    fileUrl: "https://example.com/demo/assignments/database.pdf",
  },
  {
    id: "00000007-0000-4000-8000-000000000003",
    courseId: "00000005-0000-4000-8000-000000000003",
    title: "Build a CRUD API",
    description: "Implement Express controllers for courses and students.",
    dueDate: new Date("2026-10-25T10:00:00.000Z"),
    maxPoints: 100,
    fileUrl: "https://example.com/demo/assignments/api.pdf",
  },
];

const submissions = [
  {
    id: "00000008-0000-4000-8000-000000000001",
    assignmentId: "00000007-0000-4000-8000-000000000001",
    studentId: "00000002-0000-4000-8000-000000000001",
    content: "https://example.com/demo/submissions/maya-calculator.js",
    points: 92,
    submittedAt: new Date("2026-10-07T10:00:00.000Z"),
  },
  {
    id: "00000008-0000-4000-8000-000000000002",
    assignmentId: "00000007-0000-4000-8000-000000000002",
    studentId: "00000002-0000-4000-8000-000000000002",
    content: "https://example.com/demo/submissions/liam-database.pdf",
    points: 87,
    submittedAt: new Date("2026-10-08T10:00:00.000Z"),
  },
  {
    id: "00000008-0000-4000-8000-000000000003",
    assignmentId: "00000007-0000-4000-8000-000000000003",
    studentId: "00000002-0000-4000-8000-000000000003",
    content: "https://example.com/demo/submissions/sofia-api.zip",
    points: 95,
    submittedAt: new Date("2026-10-09T10:00:00.000Z"),
  },
];

const grades = [
  {
    id: "00000009-0000-4000-8000-000000000001",
    enrollmentId: "00000006-0000-4000-8000-000000000001",
    courseId: "00000005-0000-4000-8000-000000000001",
    category: "Homework",
    pointsObtained: 92,
    totalPoints: 100,
  },
  {
    id: "00000009-0000-4000-8000-000000000002",
    enrollmentId: "00000006-0000-4000-8000-000000000002",
    courseId: "00000005-0000-4000-8000-000000000002",
    category: "Homework",
    pointsObtained: 87,
    totalPoints: 100,
  },
  {
    id: "00000009-0000-4000-8000-000000000003",
    enrollmentId: "00000006-0000-4000-8000-000000000003",
    courseId: "00000005-0000-4000-8000-000000000003",
    category: "Homework",
    pointsObtained: 95,
    totalPoints: 100,
  },
];

const materials = [
  {
    id: "00000010-0000-4000-8000-000000000001",
    courseId: "00000005-0000-4000-8000-000000000001",
    title: "JavaScript Basics Video",
    description: "An introduction to JavaScript syntax.",
    fileUrl: "https://example.com/demo/materials/javascript.mp4",
    materialType: "VIDEO",
  },
  {
    id: "00000010-0000-4000-8000-000000000002",
    courseId: "00000005-0000-4000-8000-000000000002",
    title: "PostgreSQL SQL Reference",
    description: "Examples of SELECT, JOIN, and GROUP BY.",
    fileUrl: "https://example.com/demo/materials/sql.pdf",
    materialType: "PDF",
  },
  {
    id: "00000010-0000-4000-8000-000000000003",
    courseId: "00000005-0000-4000-8000-000000000003",
    title: "Express API Starter",
    description: "A sample repository for building an Express API.",
    fileUrl: "https://example.com/demo/materials/express-starter",
    materialType: "CODE_REPOSITORY",
  },
];

const payments = [
  {
    id: "00000011-0000-4000-8000-000000000001",
    userId: "00000001-0000-4000-8000-000000000001",
    enrollmentId: "00000006-0000-4000-8000-000000000001",
    amount: "299.00",
    currency: "EUR",
    status: "COMPLETED",
    method: "credit_card",
  },
  {
    id: "00000011-0000-4000-8000-000000000002",
    userId: "00000001-0000-4000-8000-000000000002",
    enrollmentId: "00000006-0000-4000-8000-000000000002",
    amount: "399.50",
    currency: "EUR",
    status: "COMPLETED",
    method: "bank_transfer",
  },
  {
    id: "00000011-0000-4000-8000-000000000003",
    userId: "00000001-0000-4000-8000-000000000003",
    enrollmentId: "00000006-0000-4000-8000-000000000003",
    amount: "499.00",
    currency: "EUR",
    status: "PENDING",
    method: "credit_card",
  },
];

const events = [
  {
    id: "00000012-0000-4000-8000-000000000001",
    title: "School Open Day",
    description: "Meet instructors and explore the school.",
    eventDate: new Date("2026-11-05T10:00:00.000Z"),
    maxAttendees: 100,
    location: "Main Campus, Room A101",
  },
  {
    id: "00000012-0000-4000-8000-000000000002",
    title: "Prisma and PostgreSQL Workshop",
    description: "Practice relational modeling and database queries.",
    eventDate: new Date("2026-11-12T10:00:00.000Z"),
    maxAttendees: 30,
    location: "Computer Lab B204",
  },
  {
    id: "00000012-0000-4000-8000-000000000003",
    title: "Student Project Showcase",
    description: "Present your programming and web development projects.",
    eventDate: new Date("2026-11-20T10:00:00.000Z"),
    maxAttendees: 60,
    location: "Main Auditorium",
  },
];

const reviews = [
  {
    id: "00000013-0000-4000-8000-000000000001",
    studentId: "00000002-0000-4000-8000-000000000001",
    courseId: "00000005-0000-4000-8000-000000000001",
    rating: 5,
    comment: "Clear explanations and useful programming exercises.",
    reviewedAt: new Date("2026-10-09T10:00:00.000Z"),
  },
  {
    id: "00000013-0000-4000-8000-000000000002",
    studentId: "00000002-0000-4000-8000-000000000002",
    courseId: "00000005-0000-4000-8000-000000000002",
    rating: 4,
    comment: "The SQL examples helped me understand database relationships.",
    reviewedAt: new Date("2026-10-09T10:00:00.000Z"),
  },
  {
    id: "00000013-0000-4000-8000-000000000003",
    studentId: "00000002-0000-4000-8000-000000000003",
    courseId: "00000005-0000-4000-8000-000000000003",
    rating: 5,
    comment: "Building a real API made the concepts easier to follow.",
    reviewedAt: new Date("2026-10-09T10:00:00.000Z"),
  },
];

const auditLogs = [
  {
    id: "00000014-0000-4000-8000-000000000001",
    entityType: "Course",
    entityId: "00000005-0000-4000-8000-000000000001",
    action: "CREATE",
    userId: "00000001-0000-4000-8000-000000000004",
    description: "Demo audit entry: course created for seed data.",
  },
  {
    id: "00000014-0000-4000-8000-000000000002",
    entityType: "Course",
    entityId: "00000005-0000-4000-8000-000000000002",
    action: "CREATE",
    userId: "00000001-0000-4000-8000-000000000005",
    description: "Demo audit entry: course created for seed data.",
  },
  {
    id: "00000014-0000-4000-8000-000000000003",
    entityType: "Course",
    entityId: "00000005-0000-4000-8000-000000000003",
    action: "CREATE",
    userId: "00000001-0000-4000-8000-000000000006",
    description: "Demo audit entry: course created for seed data.",
  },
];

async function main() {
  // Create parents before children. Any failure rolls back the entire seed.
  await prisma.$transaction(
    async (tx) => {
      for (const user of users) {
        const { id, ...data } = user;
        data.passwordHash = await hashPassword("SchoolDemo123!");
        await tx.session.deleteMany({ where: { userId: id } });
        await tx.user.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const student of students) {
        const { id, ...data } = student;
        await tx.student.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const teacher of teachers) {
        const { id, ...data } = teacher;
        await tx.teacher.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const employee of employees) {
        const { id, ...data } = employee;
        await tx.employee.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const course of courses) {
        const { id, ...data } = course;
        await tx.course.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const enrollment of enrollments) {
        const { id, ...data } = enrollment;
        await tx.enrollment.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const assignment of assignments) {
        const { id, ...data } = assignment;
        await tx.assignment.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const submission of submissions) {
        const { id, ...data } = submission;
        await tx.submission.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const grade of grades) {
        const { id, ...data } = grade;
        await tx.grade.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const material of materials) {
        const { id, ...data } = material;
        await tx.courseMaterial.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const payment of payments) {
        const { id, ...data } = payment;
        await tx.payment.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const event of events) {
        const { id, ...data } = event;
        await tx.event.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const review of reviews) {
        const { id, ...data } = review;
        await tx.review.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }

      for (const auditLog of auditLogs) {
        const { id, ...data } = auditLog;
        await tx.auditLog.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }
    },
    { timeout: 30000 },
  );

  console.log(
    "Seed complete: 9 users and 3 records in each of the other 13 models (48 demo records).",
  );
}

try {
  await main();
} catch (error) {
  // Avoid printing connection credentials or complete database error payloads.
  console.error("Seeding failed:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
