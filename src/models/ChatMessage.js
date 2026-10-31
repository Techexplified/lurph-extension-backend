import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 24000,
    },
    model: {
      type: String,
      default: '',
    },
    providerModel: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
)

chatMessageSchema.index({ conversation: 1, createdAt: 1 })
chatMessageSchema.index({ user: 1, createdAt: -1 })

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)
