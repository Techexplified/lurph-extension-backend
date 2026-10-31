import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: 'New chat',
    },
    lastPromptPreview: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastModel: {
      type: String,
      default: 'gpt-4o',
    },
    pageTitle: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    pageUrl: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

conversationSchema.index({ user: 1, lastMessageAt: -1 })
conversationSchema.index({ user: 1, title: 1 })

export const Conversation = mongoose.model('Conversation', conversationSchema)
