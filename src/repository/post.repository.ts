import { db } from "../prisma/db.js";
import { toVarchar } from "../utils/varchar.js";

export async function listPublishedPosts() {
  return db.orm.public.Posts
    .where({ published: true })
    .orderBy((post) => post.createdAt.desc())
    .all();
}

export async function listPostsByAuthor(authorId: number) {
  return db.orm.public.Posts
    .where({ authorId })
    .orderBy((post) => post.createdAt.desc())
    .all();
}

export async function findPostById(id: number) {
  return db.orm.public.Posts.where({ id }).first();
}

export async function createPost(input: {
  authorId: number;
  title: string;
  content: string;
  published: boolean;
}) {
  return db.orm.public.Posts.create({
    ...input,
    title: toVarchar(input.title, 255),
  });
}

export async function updatePost(
  id: number,
  changes: { title?: string; content?: string; published?: boolean },
) {
  return db.orm.public.Posts.where({ id }).update({
    ...changes,
    ...(changes.title === undefined ? {} : { title: toVarchar(changes.title, 255) }),
  });
}

export async function deletePost(id: number) {
  return db.orm.public.Posts.where({ id }).delete();
}
