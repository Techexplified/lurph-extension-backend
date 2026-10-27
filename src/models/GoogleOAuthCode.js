import mongoose from 'mongoose'

const googleOAuthCodeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
  },
  {
    versionKey: false,
  },
)

export const GoogleOAuthCode = mongoose.model('GoogleOAuthCode', googleOAuthCodeSchema)
