# School data model

The authoritative field definitions, enums, defaults, indexes, and database constraints are in [prisma/schema.prisma](../prisma/schema.prisma). All primary keys are generated UUID strings. Foreign keys reference the UUID primary key, even where a model also has a human-readable identifier such as `Student.studentId`.

```mermaid
erDiagram
    User ||--o{ Session : authenticates
    User ||--o| Student : profile
    User ||--o| Teacher : profile
    User ||--o| Employee : profile
    User ||--o{ Payment : pays
    Teacher o|--o{ Course : teaches
    Student ||--o{ Enrollment : enrolls
    Course ||--o{ Enrollment : includes
    Course ||--o{ Assignment : assigns
    Assignment ||--o{ Submission : receives
    Student ||--o{ Submission : submits
    Enrollment ||--o{ Grade : receives
    Course ||--o{ Grade : records
    Course ||--o{ CourseMaterial : contains
    Enrollment o|--o| Payment : linked_payment
    Student ||--o{ Review : writes
    Course ||--o{ Review : receives

    Session {
        uuid id PK
        string tokenHash UK
        uuid userId FK
        datetime expiresAt
        datetime createdAt
    }
    User {
        uuid id PK
        string email UK
        string passwordHash
        UserRole role
        datetime deletedAt
    }
    Student {
        uuid id PK
        uuid userId FK,UK
        string studentId UK
        datetime dateOfBirth
        datetime enrollmentDate
    }
    Teacher {
        uuid id PK
        uuid userId FK,UK
        string employeeId UK
        string department
    }
    Employee {
        uuid id PK
        uuid userId FK,UK
        string employeeId UK
        decimal salary
        boolean isActive
    }
    Course {
        uuid id PK
        string code UK
        string title
        uuid instructorId FK
        CourseLevel level
        int credits
        string_array prerequisites
    }
    Enrollment {
        uuid id PK
        uuid studentId FK
        uuid courseId FK
        EnrollmentStatus status
    }
    Assignment {
        uuid id PK
        uuid courseId FK
        string title
        int maxPoints
        datetime dueDate
    }
    Submission {
        uuid id PK
        uuid assignmentId FK
        uuid studentId FK
        string content
        int points
    }
    Grade {
        uuid id PK
        uuid enrollmentId FK
        uuid courseId FK
        string category
        int pointsObtained
        int totalPoints
    }
    CourseMaterial {
        uuid id PK
        uuid courseId FK
        string title
        string fileUrl
        MaterialType materialType
    }
    Payment {
        uuid id PK
        uuid userId FK
        uuid enrollmentId FK,UK
        decimal amount
        string currency
        PaymentStatus status
    }
    Review {
        uuid id PK
        uuid studentId FK
        uuid courseId FK
        int rating
        string comment
    }
    Event {
        uuid id PK
        string title
        datetime eventDate
        int maxAttendees
        string location
    }
    AuditLog {
        uuid id PK
        string entityType
        string entityId
        string action
        string userId
    }
```

`Event` and `AuditLog` are standalone tables. `AuditLog.userId` and `entityId` are descriptive strings, not enforced foreign keys. `Payment.enrollmentId` is optional and unique: each payment can link to at most one enrollment and each enrollment to at most one payment. Student, teacher, and employee profiles are individually optional and unique per user; the schema does not forbid a user having multiple profile types.

A course's instructor is optional. The API does not enforce additional relationships across independent foreign keys: for example, clients must ensure a grade's course matches its enrollment's course. The database does not enforce one enrollment or one review per student/course pair. Delete operations are hard deletes; relation constraints can return `409` when dependent records exist. Setting `User.deletedAt` does not filter subsequent reads automatically.

`Session` is the additional authentication model alongside the original 14 school models. It stores only the SHA-256 hash of the random cookie credential. User deletion cascades to sessions; expiry is enforced on every request. Role/password/deletion-state changes explicitly revoke target sessions transactionally.
