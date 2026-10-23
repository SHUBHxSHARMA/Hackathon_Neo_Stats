export function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({
    error: { code, message, ...extra },
  });
}

export function sendValidation(res, issues) {
  return sendError(res, 400, "VALIDATION", "Check the submitted fields.", {
    details: issues,
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
