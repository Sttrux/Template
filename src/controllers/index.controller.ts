import type { Request, Response } from "express";

export function getHomeData(_req: Request, res: Response) {
  res.json({ message: "hi :D" });
}

export function getHealth(_req: Request, res: Response) {
  res.json({ status: "ok" });
}