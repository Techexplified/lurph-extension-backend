import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/authenticate.js";
import {
  createChatCompletion,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
} from "../controllers/chat.controller.js";

const router = Router();

const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "You are sending messages too quickly. Please wait a moment.",
  },
});

router.use(authenticate);
router.post("/completions", chatRateLimiter, createChatCompletion);
router.get("/conversations", listConversations);
router.get("/conversations/:id", getConversation);
router.patch("/conversations/:id", renameConversation);
router.delete("/conversations/:id", deleteConversation);

export default router;
