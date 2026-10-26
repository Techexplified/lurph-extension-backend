import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

// MongoDB automatically removes expired sessions. Authentication checks expiry too,
// so expiry does not depend on the TTL monitor running immediately.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Session = mongoose.model('Session', sessionSchema)
