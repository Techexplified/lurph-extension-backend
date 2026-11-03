import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { authenticate } from "../middleware/authenticate.js";
import {
  createChatCompletion,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
} from "../controllers/chat.controller.js";
import { extractPdf } from "../controllers/pdf.controller.js";

const router = Router();

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
});

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
router.post(
  "/pdf/extract",
  chatRateLimiter,
  pdfUpload.single("pdf"),
  extractPdf,
);
router.post("/completions", chatRateLimiter, createChatCompletion);
router.get("/conversations", listConversations);
router.get("/conversations/:id", getConversation);
router.patch("/conversations/:id", renameConversation);
router.delete("/conversations/:id", deleteConversation);

export default router;
