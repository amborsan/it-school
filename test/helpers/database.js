// Replace only PostgreSQL delegates; HTTP, schemas, cookies, crypto and policies stay real.
import { randomUUID } from "node:crypto";
const models = [
  "user",
  "student",
  "teacher",
  "employee",
  "course",
  "enrollment",
  "assignment",
  "submission",
  "grade",
  "courseMaterial",
  "payment",
  "event",
  "review",
  "auditLog",
  "session",
];
const links = {
  student: { user: ["user", "userId"] },
  teacher: { user: ["user", "userId"] },
  employee: { user: ["user", "userId"] },
  course: { instructor: ["teacher", "instructorId"] },
  enrollment: {
    student: ["student", "studentId"],
    course: ["course", "courseId"],
  },
  assignment: { course: ["course", "courseId"] },
  submission: {
    student: ["student", "studentId"],
    assignment: ["assignment", "assignmentId"],
  },
  grade: {
    course: ["course", "courseId"],
    enrollment: ["enrollment", "enrollmentId"],
  },
  courseMaterial: { course: ["course", "courseId"] },
  payment: {
    user: ["user", "userId"],
    enrollment: ["enrollment", "enrollmentId"],
  },
  review: { student: ["student", "studentId"], course: ["course", "courseId"] },
  session: { user: ["user", "userId"] },
};
const many = {
  student: { enrollments: ["enrollment", "studentId"] },
  course: { enrollments: ["enrollment", "courseId"] },
  user: {
    student: ["student", "userId", true],
    teacher: ["teacher", "userId", true],
    employee: ["employee", "userId", true],
  },
};
export function database(seed = {}) {
  const rows = Object.fromEntries(
    models.map((name) => [name, structuredClone(seed[name] ?? [])]),
  );
  function relation(model, row, key) {
    const one = links[model]?.[key];
    if (one)
      return {
        model: one[0],
        value: rows[one[0]].find((item) => item.id === row[one[1]]) ?? null,
      };
    const multi = many[model]?.[key];
    if (multi) {
      const values = rows[multi[0]].filter((item) => item[multi[1]] === row.id);
      return {
        model: multi[0],
        value: multi[2] ? (values[0] ?? null) : values,
      };
    }
  }
  function matches(model, row, where = {}) {
    if (!row) return false;
    return Object.entries(where).every(([key, filter]) => {
      if (key === "AND")
        return (Array.isArray(filter) ? filter : [filter]).every((part) =>
          matches(model, row, part),
        );
      if (key === "OR") return filter.some((part) => matches(model, row, part));
      const rel = relation(model, row, key);
      if (rel) {
        if (Array.isArray(rel.value))
          return filter.some
            ? rel.value.some((item) => matches(rel.model, item, filter.some))
            : false;
        return matches(rel.model, rel.value, filter.is ?? filter);
      }
      const value = row[key];
      if (filter && typeof filter === "object" && !(filter instanceof Date)) {
        return Object.entries(filter).every(
          ([op, arg]) =>
            ({
              in: () => arg.includes(value),
              lt: () => value < arg,
              lte: () => value <= arg,
              gt: () => value > arg,
              equals: () => value === arg,
            })[op]?.() ?? false,
        );
      }
      return value === filter;
    });
  }
  function project(model, row, options = {}) {
    if (!row) return null;
    const out = options.select ? {} : { ...row };
    for (const [key, selection] of Object.entries(
      options.select ?? options.include ?? {},
    )) {
      if (!selection) continue;
      const rel = relation(model, row, key);
      if (rel)
        out[key] = Array.isArray(rel.value)
          ? rel.value.map((item) =>
              project(rel.model, item, selection === true ? {} : selection),
            )
          : project(rel.model, rel.value, selection === true ? {} : selection);
      else out[key] = row[key];
    }
    for (const [key, omit] of Object.entries(options.omit ?? {}))
      if (omit) delete out[key];
    return out;
  }
  const db = { rows };
  for (const model of models)
    db[model] = {
      findUnique: async (opts) =>
        project(
          model,
          rows[model].find((row) => matches(model, row, opts.where)),
          opts,
        ),
      findFirst: async (opts) =>
        project(
          model,
          rows[model].find((row) => matches(model, row, opts.where)),
          opts,
        ),
      findMany: async (opts = {}) =>
        rows[model]
          .filter((row) => matches(model, row, opts.where))
          .slice(opts.skip ?? 0, (opts.skip ?? 0) + (opts.take ?? 10000))
          .map((row) => project(model, row, opts)),
      create: async (opts) => {
        if (
          model === "user" &&
          rows.user.some((row) => row.email === opts.data.email)
        )
          throw Object.assign(new Error("Unique"), { code: "P2002" });
        const row = {
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...(model === "user" ? { role: "STUDENT", deletedAt: null } : {}),
          ...opts.data,
        };
        rows[model].push(row);
        return project(model, row, opts);
      },
      update: async (opts) => {
        const row = rows[model].find((item) =>
          matches(model, item, opts.where),
        );
        if (!row) throw Object.assign(new Error("Missing"), { code: "P2025" });
        Object.assign(row, opts.data);
        return project(model, row, opts);
      },
      delete: async (opts) => {
        const i = rows[model].findIndex((item) =>
          matches(model, item, opts.where),
        );
        if (i < 0) throw Object.assign(new Error("Missing"), { code: "P2025" });
        return rows[model].splice(i, 1)[0];
      },
      deleteMany: async ({ where } = {}) => {
        let count = 0;
        for (let i = rows[model].length - 1; i >= 0; i--)
          if (matches(model, rows[model][i], where)) {
            rows[model].splice(i, 1);
            count++;
          }
        return { count };
      },
    };
  db.$transaction = async (fn) => {
    const before = structuredClone(rows);
    try {
      return await fn(db);
    } catch (error) {
      for (const name of models) rows[name] = before[name];
      throw error;
    }
  };
  return db;
}
