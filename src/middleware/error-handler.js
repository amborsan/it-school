import { ZodError } from "zod";
export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({
        error: "Invalid request data.",
        fields: [
          ...new Set(
            error.issues.map((issue) => issue.path.join(".") || "body"),
          ),
        ],
      });
  }

  if (error.code === "P2034") {
    return res
      .status(409)
      .json({
        error: "A concurrent change prevented this request. Please retry.",
      });
  }

  if (error.code === "P2002") {
    return res
      .status(409)
      .json({ error: "A record with that unique value already exists." });
  }

  if (error.code === "P2025") {
    return res.status(404).json({ error: "Record not found." });
  }

  if (error.code === "P2003" || error.code === "P2014") {
    return res
      .status(409)
      .json({
        error: "A related record is missing or prevents this operation.",
      });
  }
  if (error.name === "PrismaClientValidationError" || error.code === "P2000") {
    return res.status(400).json({ error: "Invalid data for this resource." });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  if (error.type === "entity.too.large") {
    return res
      .status(413)
      .json({ error: "Request body exceeds the 10kb limit." });
  }
  if (error.status >= 400 && error.status < 500) {
    return res
      .status(error.status)
      .json({
        error: error.expose === true ? error.message : "Invalid request.",
      });
  }
  // Log a fixed event only: driver messages may contain credentials or personal data.
  console.error("Unhandled API error.");
  res.status(500).json({ error: "Something went wrong." });
}
