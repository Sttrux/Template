import type { AuthenticatedUser } from "../interfaces/auth.interface.js";
import {
  createPost as insertPost,
  deletePost as removePost,
  findPostById,
  listPostsByAuthor,
  listPublishedPosts,
  updatePost as savePost,
} from "../repository/post.repository.js";
import { AppError } from "../utils/app-error.js";

export async function getPublishedPosts() {
  return listPublishedPosts();
}

export async function getOwnPosts(user: AuthenticatedUser) {
  if (!user.permissions.includes("posts:read")) {
    throw new AppError(403, "Insufficient permission");
  }
  return listPostsByAuthor(user.id);
}

export async function createPost(
  user: AuthenticatedUser,
  input: { title: string; content: string; published?: boolean },
) {
  requirePermission(user, "posts:create");
  if (input.published && !user.permissions.includes("posts:publish")) {
    throw new AppError(403, "Only moderators can publish posts");
  }

  return insertPost({
    authorId: user.id,
    title: input.title,
    content: input.content,
    published: input.published ?? false,
  });
}

export async function updatePost(
  user: AuthenticatedUser,
  postId: number,
  input: { title?: string; content?: string; published?: boolean },
) {
  const post = await findPostById(postId);
  if (!post) throw new AppError(404, "Post not found");

  if (!user.permissions.includes("posts:update:any")) {
    requirePermission(user, "posts:update:own");
    if (post.authorId !== user.id) throw new AppError(403, "You can only update your own posts");
  }
  if (input.published === true && !user.permissions.includes("posts:publish")) {
    throw new AppError(403, "Only moderators can publish posts");
  }
  if (Object.keys(input).length === 0) throw new AppError(400, "At least one field is required");

  return savePost(postId, input);
}

export async function deletePost(user: AuthenticatedUser, postId: number) {
  const post = await findPostById(postId);
  if (!post) throw new AppError(404, "Post not found");

  if (!user.permissions.includes("posts:delete:any")) {
    requirePermission(user, "posts:delete:own");
    if (post.authorId !== user.id) throw new AppError(403, "You can only delete your own posts");
  }

  await removePost(postId);
}

function requirePermission(user: AuthenticatedUser, permission: string) {
  if (!user.permissions.includes(permission)) {
    throw new AppError(403, "Insufficient permission");
  }
}
