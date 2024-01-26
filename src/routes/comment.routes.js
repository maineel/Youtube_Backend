import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getVideoComments, addComment, updateComment, deleteComment } from "../controllers/comment.controller.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/:videoId").get(getVideoComments);

router.route("/:videoId").post(addComment);

router.route("/channel/:commentId").patch(updateComment);

router.route("/channel/:commentId").delete(deleteComment);

export default router;