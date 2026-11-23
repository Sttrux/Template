import type { Request, Response } from "express";

export function getHomeData(_req: Request, res: Response) {
  res.json({ message: "API template is running", health: "/health" });
}

export function getHealth(_req: Request, res: Response) {
  res.json({ status: "ok" });
}