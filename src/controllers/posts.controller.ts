import type { RequestHandler } from "express";
import { matchedData } from "express-validator";
import {
  createPost,
  deletePost,
  getOwnPosts,
  getPublishedPosts,
  updatePost,
} from "../services/post.service.js";
import { AppError } from "../utils/app-error.js";

interface PostInput {
  title: string;
  content: string;
  published?: boolean;
}

export const listPublished: RequestHandler = async (_req, res) => {
  res.json({ posts: await getPublishedPosts() });
};

export const listMine: RequestHandler = async (req, res) => {
  if (!req.user) throw new AppError(401, "Login required");
  res.json({ posts: await getOwnPosts(req.user) });
};

export const create: RequestHandler = async (req, res) => {
  if (!req.user) throw new AppError(401, "Login required");
  const input = matchedData<PostInput>(req, { locations: ["body"] });
  const post = await createPost(req.user, input);
  res.status(201).json({ post });
};

export const update: RequestHandler = async (req, res) => {
  if (!req.user) throw new AppError(401, "Login required");
  const postId = Number(req.params.postId);
  const input = matchedData<Partial<PostInput>>(req, { locations: ["body"] });
  const post = await updatePost(req.user, postId, input);
  res.json({ post });
};

export const remove: RequestHandler = async (req, res) => {
  if (!req.user) throw new AppError(401, "Login required");
  await deletePost(req.user, Number(req.params.postId));
  res.status(204).end();
};
