import { NextFunction, Request, Response } from "express";

// Express 4 does not forward rejected promises from async handlers to the
// error middleware automatically. Wrap every async controller with this so
// unexpected errors reach the centralized error handler in src/index.ts
// instead of hanging the request or crashing the process.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
